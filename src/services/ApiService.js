import { API_CONFIG } from '../constants/Config';
import StorageService from '../storage/StorageService';
import NetworkService from './NetworkService';
import { Logger } from '../utils/Logger';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL + '/api';  // Apenas /api, sem o /mobile/v1
    this.defaultTimeout = 30000; // 30 segundos
    this.maxRetries = 3;
    this.retryBackoffMs = 1000; // 1 segundo inicial

    // Cache para responses
    this.responseCache = new Map();
    this.cacheExpiration = new Map();
  }

  /**
   * Método principal para fazer requests autenticados
   * Inclui timeout, retry automático e tratamento de erros
   */
  async makeAuthenticatedRequest(endpoint, options = {}) {
    const startTime = Date.now();
    const method = options.method || 'GET';
    const url = `${this.baseURL}${endpoint}`;

    Logger.info(`🌐 API Request: ${method} ${endpoint}`);

    // Verificar conexão de rede
    const isOnline = await NetworkService.checkConnection();
    if (!isOnline && !this._isCacheableEndpoint(endpoint)) {
      throw new Error('Sem conexão de rede e dados não estão em cache');
    }

    // Verificar cache primeiro (apenas para GET)
    if (method === 'GET') {
      const cached = this._getCachedResponse(endpoint);
      if (cached) {
        Logger.info(`📦 Usando resposta em cache para: ${endpoint}`);
        return cached;
      }
    }

    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this._makeRequestAttempt(url, endpoint, options, startTime, attempt);

        // Cache response se for GET e sucesso
        if (method === 'GET' && this._isCacheableEndpoint(endpoint)) {
          this._cacheResponse(endpoint, response);
        }

        return response;

      } catch (error) {
        lastError = error;

        // Se for erro 401, limpar dados e não fazer retry
        if (error.status === 401) {
          Logger.warn('🔐 Token expirado - limpando dados de autenticação');
          await this._handleUnauthorized();
          throw error;
        }

        // Se for erro 4xx (exceto 401), não fazer retry
        if (error.status >= 400 && error.status < 500) {
          Logger.error(`❌ Erro do cliente (${error.status}) - não fazendo retry`);
          throw error;
        }

        // Se for o último attempt, throw o erro
        if (attempt === this.maxRetries) {
          break;
        }

        // Calcular delay do backoff exponencial
        const backoffDelay = this.retryBackoffMs * Math.pow(2, attempt - 1);

        Logger.warn(`⏳ Tentativa ${attempt} falhou, tentando novamente em ${backoffDelay}ms`, {
          error: error.message,
          status: error.status,
          endpoint
        });

        // Aguardar antes do próximo retry
        await this._delay(backoffDelay);
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    const totalTime = Date.now() - startTime;
    Logger.error(`💥 Todas as ${this.maxRetries} tentativas falharam para ${endpoint} (${totalTime}ms)`, lastError);
    throw lastError;
  }

  /**
   * Fazer uma tentativa de request
   */
  async _makeRequestAttempt(url, endpoint, options, startTime, attempt) {
    const authCookie = await StorageService.getAuthCookie();

    const config = {
      method: 'GET',
      timeout: this.defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ConquistaMaisApp/1.0.0 (React Native)',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
      },
      ...options
    };

    // Adicionar cookie de autenticação se disponível
    if (authCookie) {
      config.headers['Cookie'] = authCookie;

      // Para requests POST/PUT/DELETE, extrair e adicionar XSRF token
      if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase())) {
        const xsrfMatch = authCookie.match(/XSRF-TOKEN=([^;]+)/);
        if (xsrfMatch) {
          const xsrfToken = decodeURIComponent(xsrfMatch[1]);
          config.headers['X-XSRF-TOKEN'] = xsrfToken;
          Logger.info('🔒 XSRF Token adicionado ao request', {
            endpoint,
            tokenPreview: xsrfToken.substring(0, 20) + '...'
          });
        } else {
          Logger.warn('⚠️ XSRF Token não encontrado no cookie para request:', options.method.toUpperCase(), endpoint);
        }
      }
      Logger.info(`🍪 Cookie adicionado ao request: ${authCookie.substring(0, 50)}...`);
    } else {
      Logger.warn('⚠️  Nenhum cookie de autenticação encontrado');
    }

    // Log detalhado da tentativa
    Logger.info(`🔄 Tentativa ${attempt}/${this.maxRetries}: ${config.method} ${url}`, {
      headers: this._sanitizeHeaders(config.headers),
      hasBody: !!config.body,
      hasXSRF: !!config.headers['X-XSRF-TOKEN'],
      baseURL: this.baseURL
    });

    try {
      // Criar timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), config.timeout);
      });

      // Fazer o request com timeout
      const responsePromise = fetch(url, config);
      const response = await Promise.race([responsePromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;

      // Log do response
      Logger.info(`📨 Response recebido: ${response.status} ${response.statusText} (${responseTime}ms)`, {
        headers: Object.fromEntries(response.headers.entries()),
        attempt,
        endpoint
      });

      // Tentar parsear o JSON
      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          Logger.error('❌ Erro ao parsear JSON response', jsonError);
          throw new Error('Resposta inválida do servidor');
        }
      } else {
        // Se não for JSON, pegar como texto
        data = await response.text();
        Logger.warn('⚠️  Response não é JSON:', { contentType, data: data.substring(0, 200) });
      }

      // Verificar se o response é OK
      if (!response.ok) {
        const error = new Error(
          data?.message ||
          data?.error ||
          data ||
          `HTTP ${response.status}: ${response.statusText}`
        );
        error.status = response.status;
        error.response = data;
        throw error;
      }

      Logger.info(`✅ Request bem-sucedido: ${endpoint} (${responseTime}ms)`);
      return data;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Classificar o tipo de erro
      let errorType = 'unknown';
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        errorType = 'network';
      } else if (error.message === 'Request timeout') {
        errorType = 'timeout';
      } else if (error.status) {
        errorType = 'http';
      }

      Logger.error(`💥 Request falhou (${errorType}): ${endpoint} - tentativa ${attempt} (${responseTime}ms)`, {
        error: error.message,
        status: error.status,
        type: errorType
      });

      throw error;
    }
  }

  /**
   * Lidar com erro 401 - token expirado
   */
  async _handleUnauthorized() {
    try {
      // Limpar cookie de autenticação
      await StorageService.clearAuthCookie();

      // Limpar cache
      this._clearCache();

      // Sinalizar para o app que precisa reautenticar
      // (isso poderia ser um evento ou callback)
      Logger.info('🔄 Dados de autenticação limpos - reautenticação necessária');

    } catch (error) {
      Logger.error('Erro ao limpar dados de autenticação:', error);
    }
  }

  /**
   * Cache de responses
   */
  _getCachedResponse(endpoint) {
    if (!this.responseCache.has(endpoint)) {
      return null;
    }

    const expiration = this.cacheExpiration.get(endpoint);
    if (expiration && Date.now() > expiration) {
      this.responseCache.delete(endpoint);
      this.cacheExpiration.delete(endpoint);
      return null;
    }

    return this.responseCache.get(endpoint);
  }

  _cacheResponse(endpoint, response, ttlMs = 300000) { // 5 minutos padrão
    this.responseCache.set(endpoint, response);
    this.cacheExpiration.set(endpoint, Date.now() + ttlMs);
  }

  _clearCache() {
    this.responseCache.clear();
    this.cacheExpiration.clear();
    Logger.info('🗑️  Cache de API limpo');
  }

  _isCacheableEndpoint(endpoint) {
    // Apenas endpoints GET de consulta são cacheáveis
    const cacheableEndpoints = ['/mobile/v1/sync', '/mobile/v1/events', '/mobile/v1/wishlist'];
    return cacheableEndpoints.some(cacheable => endpoint.includes(cacheable));
  }

  _sanitizeHeaders(headers) {
    // Remover informações sensíveis dos logs
    const sanitized = { ...headers };
    if (sanitized.Cookie) {
      sanitized.Cookie = sanitized.Cookie.substring(0, 20) + '...';
    }
    return sanitized;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================
  // MÉTODOS DE ENDPOINT ESPECÍFICOS
  // ===========================================

  /**
   * Sincronização completa de dados
   */
  async syncData() {
    Logger.info('🔄 Iniciando sincronização completa de dados');
    try {
      const data = await this.makeAuthenticatedRequest('/mobile/v1/sync');
      Logger.info('✅ Sincronização completa bem-sucedida', {
        dataKeys: Object.keys(data || {}),
        timestamp: new Date().toISOString()
      });
      return data;
    } catch (error) {
      Logger.error('❌ Falha na sincronização completa', error);
      throw error;
    }
  }

  /**
   * Buscar eventos com limite opcional
   */
  async getEvents(limit = 50) {
    Logger.info(`📅 Buscando eventos (limit: ${limit})`);
    try {
      const endpoint = `/mobile/v1/events${limit ? `?limit=${limit}` : ''}`;
      const data = await this.makeAuthenticatedRequest(endpoint);
      Logger.info('✅ Eventos carregados com sucesso', {
        count: data?.events?.length || 0,
        limit
      });
      return data;
    } catch (error) {
      Logger.error('❌ Falha ao carregar eventos', error);
      throw error;
    }
  }

  /**
   * Buscar wishlist do usuário
   */
  async getWishlist() {
    Logger.info('❤️  Buscando wishlist do usuário');
    try {
      const data = await this.makeAuthenticatedRequest('/mobile/v1/wishlist');
      Logger.info('✅ Wishlist carregada com sucesso', {
        count: data?.items?.length || 0
      });
      return data;
    } catch (error) {
      Logger.error('❌ Falha ao carregar wishlist', error);
      throw error;
    }
  }

  /**
   * Adicionar item à wishlist
   */
  async addToWishlist(type, itemId) {
    Logger.info(`➕ Adicionando à wishlist: ${type} #${itemId}`);
    try {
      const data = await this.makeAuthenticatedRequest('/mobile/v1/wishlist/add', {
        method: 'POST',
        body: JSON.stringify({
          type: type,
          item_id: itemId
        })
      });
      Logger.info('✅ Item adicionado à wishlist com sucesso', { type, itemId });
      return data;
    } catch (error) {
      Logger.error('❌ Falha ao adicionar item à wishlist', { type, itemId, error });
      throw error;
    }
  }

  /**
   * Remover item da wishlist
   */
  async removeFromWishlist(id) {
    Logger.info(`➖ Removendo da wishlist: #${id}`);
    try {
      const data = await this.makeAuthenticatedRequest(`/mobile/v1/wishlist/remove/${id}`, {
        method: 'DELETE'
      });
      Logger.info('✅ Item removido da wishlist com sucesso', { id });
      return data;
    } catch (error) {
      Logger.error('❌ Falha ao remover item da wishlist', { id, error });
      throw error;
    }
  }

  /**
   * Sincronizar wishlist local com servidor
   */
  async syncWishlist(data) {
    Logger.info('🔄 Sincronizando wishlist com servidor');
    try {
      const response = await this.makeAuthenticatedRequest('/mobile/v1/wishlist/sync', {
        method: 'POST',
        body: JSON.stringify({
          wishlist: data
        })
      });
      Logger.info('✅ Wishlist sincronizada com sucesso', {
        itemCount: data?.length || 0
      });
      return response;
    } catch (error) {
      Logger.error('❌ Falha ao sincronizar wishlist', error);
      throw error;
    }
  }

  // ===========================================
  // MÉTODOS UTILITÁRIOS
  // ===========================================

  /**
   * Verificar se a API está acessível
   */
  async checkHealth() {
    try {
      Logger.info('🏥 Verificando saúde da API');
      const response = await this.makeAuthenticatedRequest('/health', { timeout: 5000 });
      Logger.info('✅ API está saudável');
      return response;
    } catch (error) {
      Logger.error('❌ API não está acessível', error);
      throw error;
    }
  }

  /**
   * Limpar todos os caches
   */
  clearAllCaches() {
    this._clearCache();
    Logger.info('🧹 Todos os caches limpos');
  }

  /**
   * Obter estatísticas do service
   */
  getStats() {
    return {
      cacheSize: this.responseCache.size,
      baseURL: this.baseURL,
      defaultTimeout: this.defaultTimeout,
      maxRetries: this.maxRetries
    };
  }
}

export default new ApiService();