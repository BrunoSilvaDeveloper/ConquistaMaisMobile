import ApiService from './ApiService';
import StorageService from '../storage/StorageService';
import NetworkService from './NetworkService';
import { Logger } from '../utils/Logger';
import { SYNC_INTERVALS } from '../constants/Config';
import ImageDownloader from '../utils/ImageDownloader';

// Estados do sync
const SYNC_STATES = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error'
};

class SyncService {
  constructor() {
    // Estados de controle
    this.state = SYNC_STATES.IDLE;
    this.syncInterval = null;
    this.autoSyncActive = false;

    // Controle de sincronização
    this.lastSyncAttempt = null;
    this.syncInProgress = false;

    // Controle de download de imagens
    this.enableImageDownload = true;
    this.imageDownloadCooldown = 30000; // 30 segundos entre downloads
    this.lastImageDownload = null;

    // Sistema de debug detalhado
    this.debugStats = {
      totalSyncAttempts: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncStatus: null,
      lastSyncError: null,
      networkChecks: 0,
      onlineChecks: 0,
      offlineChecks: 0,
      apiRequests: 0,
      successfulApiRequests: 0,
      failedApiRequests: 0,
      imageDownloads: 0,
      successfulImageDownloads: 0
    };

    // Inicializar
    this._init();
  }

  // ==========================================
  // INICIALIZAÇÃO E CONTROLE DE ESTADO
  // ==========================================

  async _init() {
    try {
      // Configurar listeners de rede
      NetworkService.addListener(this._handleNetworkChange.bind(this));

      Logger.info('🔄 SyncService inicializado');
    } catch (error) {
      Logger.error('Erro ao inicializar SyncService:', error);
    }
  }

  _setState(newState) {
    this.state = newState;
  }

  getState() {
    return this.state;
  }

  // Sistema simplificado - apenas logs de erro

  // ==========================================
  // MÉTODO FULLSYNC() SIMPLIFICADO
  // ==========================================

  async fullSync() {
    const syncStartTime = Date.now();
    const syncId = `sync_${syncStartTime}`;

    Logger.info(`🔄 [${syncId}] INÍCIO DO FULLSYNC`, {
      timestamp: new Date().toISOString(),
      syncInProgress: this.syncInProgress,
      autoSyncActive: this.autoSyncActive,
      state: this.state,
      lastSyncAttempt: this.lastSyncAttempt
    });

    // Prevenir sincronizações simultâneas
    if (this.syncInProgress) {
      Logger.warn(`⚠️ [${syncId}] Sync já em progresso, cancelando nova tentativa`);
      return { status: 'already_running' };
    }

    this.debugStats.totalSyncAttempts++;

    try {
      // Verificar conectividade com logs detalhados
      Logger.info(`🌐 [${syncId}] Verificando conectividade...`);
      this.debugStats.networkChecks++;

      const isOnline = await NetworkService.checkConnection();

      if (isOnline) {
        this.debugStats.onlineChecks++;
        Logger.info(`✅ [${syncId}] Dispositivo ONLINE`);
      } else {
        this.debugStats.offlineChecks++;
        Logger.warn(`❌ [${syncId}] Dispositivo OFFLINE`);
        return { status: 'no_connection' };
      }

      // Iniciar sincronização
      Logger.info(`🚀 [${syncId}] Iniciando sincronização - estado: ${SYNC_STATES.SYNCING}`);
      this.syncInProgress = true;
      this._setState(SYNC_STATES.SYNCING);

      // Sincronizar dados principais
      Logger.info(`📡 [${syncId}] Chamando ApiService.syncData()`);
      this.debugStats.apiRequests++;

      const syncResponse = await ApiService.syncData();

      Logger.info(`📨 [${syncId}] Resposta da API recebida:`, {
        success: syncResponse?.success,
        hasData: !!syncResponse?.data,
        dataKeys: syncResponse?.data ? Object.keys(syncResponse.data) : [],
        eventsCount: syncResponse?.data?.events?.length || 0,
        wishlistCount: syncResponse?.data?.wishlist?.length || 0
      });

      if (syncResponse.success) {
        Logger.info(`✅ [${syncId}] API retornou sucesso, processando dados...`);
        this.debugStats.successfulApiRequests++;

        const { events, wishlist } = syncResponse.data || {};

        // Salvar dados e baixar imagens
        let processedEvents = [];
        let processedWishlist = [];

        if (events) {
          Logger.info(`📅 [${syncId}] Processando ${events.length} eventos...`);
          processedEvents = await this._processEventsWithImages(events);
          await StorageService.saveEvents(processedEvents);
          Logger.info(`💾 [${syncId}] Eventos salvos no storage: ${processedEvents.length}`);
        } else {
          Logger.warn(`⚠️ [${syncId}] Nenhum evento recebido da API`);
        }

        if (wishlist) {
          Logger.info(`❤️ [${syncId}] Processando ${wishlist.length} itens da wishlist...`);
          processedWishlist = await this._processWishlistWithImages(wishlist);
          await StorageService.saveWishlist(processedWishlist);
          Logger.info(`💾 [${syncId}] Wishlist salva no storage: ${processedWishlist.length}`);
        } else {
          Logger.warn(`⚠️ [${syncId}] Nenhum item da wishlist recebido da API`);
        }

        // Atualizar timestamp da última sync
        const now = new Date().toISOString();
        await StorageService.saveLastSync(now);
        this.lastSyncAttempt = now;

        const syncDuration = Date.now() - syncStartTime;
        Logger.info(`🎉 [${syncId}] SYNC COMPLETADO COM SUCESSO em ${syncDuration}ms`, {
          eventsProcessed: processedEvents.length,
          wishlistProcessed: processedWishlist.length,
          timestamp: now
        });

        this.debugStats.successfulSyncs++;
        this.debugStats.lastSyncStatus = 'success';
        this.debugStats.lastSyncError = null;
        this._setState(SYNC_STATES.IDLE);

        return {
          status: 'success',
          timestamp: now,
          eventsCount: processedEvents.length,
          wishlistCount: processedWishlist.length,
          duration: syncDuration
        };

      } else {
        this.debugStats.failedApiRequests++;
        const errorMsg = syncResponse.message || 'API returned success=false';
        Logger.error(`❌ [${syncId}] API retornou erro: ${errorMsg}`);
        throw new Error(errorMsg);
      }

    } catch (error) {
      const syncDuration = Date.now() - syncStartTime;
      const errorTimestamp = new Date().toISOString();

      this.debugStats.failedSyncs++;
      this.debugStats.lastSyncStatus = 'failed';
      this.debugStats.lastSyncError = error.message;

      Logger.error(`💥 [${syncId}] SYNC FALHOU após ${syncDuration}ms:`, {
        error: error.message,
        stack: error.stack,
        timestamp: errorTimestamp,
        networkOnline: await NetworkService.checkConnection().catch(() => 'unknown')
      });

      this._setState(SYNC_STATES.ERROR);

      return {
        status: 'failed',
        error: error.message,
        timestamp: errorTimestamp,
        duration: syncDuration,
        syncId
      };

    } finally {
      Logger.info(`🏁 [${syncId}] Finalizando sync - syncInProgress = false`);
      this.syncInProgress = false;
    }
  }



  // ==========================================
  // CONTROLE DE REDE E SYNC AUTOMÁTICO
  // ==========================================

  async _handleNetworkChange(networkState) {
    const { isConnected } = networkState;

    Logger.info(`🌐 Mudança de rede detectada: ${isConnected ? 'ONLINE' : 'OFFLINE'}`);

    if (isConnected && !this.autoSyncActive) {
      Logger.info('📡 Voltou online - iniciando sync automático');
      this.startAutoSync();
    } else if (!isConnected && this.autoSyncActive) {
      Logger.info('📴 Ficou offline - parando sync automático');
      this.stopAutoSync();
    }
  }

  // ==========================================
  // SYNC AUTOMÁTICO A CADA 10 SEGUNDOS
  // ==========================================

  startAutoSync() {
    if (this.autoSyncActive) {
      Logger.warn('⚠️ Tentativa de iniciar autoSync quando já está ativo');
      return;
    }

    Logger.info(`⏰ INICIANDO SYNC AUTOMÁTICO (a cada ${SYNC_INTERVALS.PERIODIC / 1000}s)`, {
      currentState: this.state,
      syncInProgress: this.syncInProgress,
      timestamp: new Date().toISOString()
    });

    this.syncInterval = setInterval(async () => {
      const intervalId = `interval_${Date.now()}`;
      Logger.info(`⏰ [${intervalId}] Timer de sync automático disparado`);

      try {
        const isOnline = await NetworkService.checkConnection();
        Logger.info(`🌐 [${intervalId}] Conectividade: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

        if (isOnline && this.state === SYNC_STATES.IDLE) {
          Logger.info(`🚀 [${intervalId}] Executando sync automático`);
          const result = await this.fullSync();
          Logger.info(`📊 [${intervalId}] Sync automático concluído:`, result);
        } else {
          Logger.info(`⏸️ [${intervalId}] Sync não executado - Online: ${isOnline}, Estado: ${this.state}`);
        }
      } catch (error) {
        Logger.error(`❌ [${intervalId}] Erro no timer de sync automático:`, error);
      }
    }, SYNC_INTERVALS.PERIODIC);

    this.autoSyncActive = true;
  }

  stopAutoSync() {
    Logger.info('🛑 PARANDO SYNC AUTOMÁTICO', {
      wasActive: this.autoSyncActive,
      hasInterval: !!this.syncInterval,
      currentState: this.state,
      timestamp: new Date().toISOString()
    });

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      Logger.info('⏰ Timer de sync automático removido');
    }
    this.autoSyncActive = false;
  }


  async getLocalData() {
    try {
      const [events, wishlist] = await Promise.all([
        StorageService.getEvents(),
        StorageService.getWishlist()
      ]);

      return {
        events: events || [],
        wishlist: wishlist || []
      };

    } catch (error) {
      Logger.error('❌ Erro ao carregar dados locais:', error);
      return {
        events: [],
        wishlist: []
      };
    }
  }

  // ==========================================
  // PROCESSAMENTO DE IMAGENS
  // ==========================================

  async _processEventsWithImages(events) {
    const existingEvents = await StorageService.getEvents() || [];
    const existingImagesMap = new Map();

    // Mapear imagens já baixadas
    existingEvents.forEach(event => {
      if (event.imgBase64) {
        existingImagesMap.set(event.img, event.imgBase64);
      }
    });

    const processedEvents = [];
    const imagesToDownload = [];

    // Preparar dados simplificados e identificar novas imagens
    for (const event of events) {
      const simplifiedEvent = {
        id: event.id,
        title: event.title,
        desc: event.desc,
        start: event.start,
        end: event.end,
        loc: event.loc,
        cat: event.cat,
        img: event.img,
        imgBase64: existingImagesMap.get(event.img) || null
      };

      processedEvents.push(simplifiedEvent);

      // Se tem imagem e não existe base64, adicionar à lista de download
      if (event.img && !simplifiedEvent.imgBase64) {
        imagesToDownload.push({ url: event.img, eventIndex: processedEvents.length - 1 });
      }
    }

    // Baixar novas imagens apenas se permitido e não estiver em cooldown
    if (this.enableImageDownload && imagesToDownload.length > 0 && this._canDownloadImages()) {
      Logger.info(`📷 Baixando até 3 novas imagens de eventos (${imagesToDownload.length} disponíveis)`);

      const imageUrls = imagesToDownload.map(item => item.url);
      const downloadResults = await ImageDownloader.downloadMultipleImages(imageUrls, 3); // Máximo 3 imagens

      // Aplicar resultados aos eventos
      downloadResults.forEach((result, index) => {
        if (result.base64 && imagesToDownload[index]) {
          const eventIndex = imagesToDownload[index].eventIndex;
          processedEvents[eventIndex].imgBase64 = result.base64;
        }
      });

      this.lastImageDownload = Date.now();
    }

    return processedEvents;
  }

  async _processWishlistWithImages(wishlist) {
    const existingWishlist = await StorageService.getWishlist() || [];
    const existingImagesMap = new Map();

    // Mapear imagens já baixadas
    existingWishlist.forEach(item => {
      if (item.event && item.event.imgBase64) {
        existingImagesMap.set(item.event.img, item.event.imgBase64);
      }
    });

    const processedWishlist = [];
    const imagesToDownload = [];

    // Preparar dados simplificados e identificar novas imagens
    for (const item of wishlist) {
      const simplifiedItem = {
        wishlist_id: item.wishlist_id,
        event: {
          id: item.event.id,
          title: item.event.title,
          desc: item.event.desc,
          start: item.event.start,
          end: item.event.end,
          loc: item.event.loc,
          cat: item.event.cat,
          img: item.event.img,
          imgBase64: existingImagesMap.get(item.event.img) || null
        }
      };

      processedWishlist.push(simplifiedItem);

      // Se tem imagem e não existe base64, adicionar à lista de download
      if (item.event.img && !simplifiedItem.event.imgBase64) {
        imagesToDownload.push({ url: item.event.img, itemIndex: processedWishlist.length - 1 });
      }
    }

    // Não baixar imagens para wishlist em sync automático para economizar requisições
    // As imagens já devem estar disponíveis dos eventos principais
    if (this.enableImageDownload && imagesToDownload.length > 0 && this._canDownloadImages() && imagesToDownload.length <= 2) {
      Logger.info(`📷 Baixando ${imagesToDownload.length} imagens de wishlist`);

      const imageUrls = imagesToDownload.map(item => item.url);
      const downloadResults = await ImageDownloader.downloadMultipleImages(imageUrls, 2); // Máximo 2 imagens

      // Aplicar resultados aos itens da wishlist
      downloadResults.forEach((result, index) => {
        if (result.base64 && imagesToDownload[index]) {
          const itemIndex = imagesToDownload[index].itemIndex;
          processedWishlist[itemIndex].event.imgBase64 = result.base64;
        }
      });
    }

    return processedWishlist;
  }

  _canDownloadImages() {
    if (!this.lastImageDownload) return true;
    return Date.now() - this.lastImageDownload > this.imageDownloadCooldown;
  }



  // ==========================================
  // SISTEMA DE DEBUG DETALHADO
  // ==========================================

  async debugSync() {
    const debugStart = Date.now();
    const debugId = `debug_${debugStart}`;

    Logger.info(`🔍 [${debugId}] INICIANDO DIAGNÓSTICO COMPLETO`);

    const diagnosis = {
      timestamp: new Date().toISOString(),
      deviceInfo: {
        platform: 'react-native',
        // Add device info if available
      },
      debugStats: { ...this.debugStats },
      tests: {}
    };

    try {
      // 1. Teste de conectividade detalhado
      Logger.info(`🌐 [${debugId}] Testando conectividade...`);
      diagnosis.tests.network = await this._debugNetworkService();

      // 2. Teste dos cookies armazenados
      Logger.info(`🍪 [${debugId}] Verificando cookies...`);
      diagnosis.tests.cookies = await this._debugCookies();

      // 3. Teste da API isoladamente
      Logger.info(`📡 [${debugId}] Testando API...`);
      diagnosis.tests.api = await this._debugApiService();

      // 4. Teste do storage local
      Logger.info(`💾 [${debugId}] Testando storage...`);
      diagnosis.tests.storage = await this._debugStorage();

      // 5. Forçar uma sincronização manual
      Logger.info(`🚀 [${debugId}] Executando sync forçado...`);
      diagnosis.tests.forcedSync = await this.fullSync();

      diagnosis.success = true;
      diagnosis.duration = Date.now() - debugStart;

    } catch (error) {
      diagnosis.success = false;
      diagnosis.error = error.message;
      diagnosis.duration = Date.now() - debugStart;
      Logger.error(`❌ [${debugId}] Erro durante diagnóstico:`, error);
    }

    Logger.info(`🔍 [${debugId}] DIAGNÓSTICO COMPLETO:`, diagnosis);
    return diagnosis;
  }

  async _debugNetworkService() {
    const results = [];

    // Testar conectividade 5 vezes
    for (let i = 1; i <= 5; i++) {
      const start = Date.now();
      const isOnline = await NetworkService.checkConnection();
      const duration = Date.now() - start;

      results.push({
        attempt: i,
        isOnline,
        duration,
        timestamp: new Date().toISOString()
      });

      // Delay entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      attempts: results,
      consistency: results.every(r => r.isOnline === results[0].isOnline),
      averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length
    };
  }

  async _debugCookies() {
    try {
      const authCookie = await StorageService.getAuthCookie();

      return {
        hasCookie: !!authCookie,
        cookieLength: authCookie ? authCookie.length : 0,
        hasLaravelSession: authCookie ? authCookie.includes('laravel_session') : false,
        hasXsrfToken: authCookie ? authCookie.includes('XSRF-TOKEN') : false,
        cookiePreview: authCookie ? authCookie.substring(0, 50) + '...' : null
      };
    } catch (error) {
      return {
        error: error.message,
        hasCookie: false
      };
    }
  }

  async _debugApiService() {
    try {
      // Teste direto da API
      const start = Date.now();
      const response = await ApiService.syncData();
      const duration = Date.now() - start;

      return {
        success: response.success,
        duration,
        hasData: !!response.data,
        eventsCount: response.data?.events?.length || 0,
        wishlistCount: response.data?.wishlist?.length || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async _debugStorage() {
    try {
      const [events, wishlist, lastSync] = await Promise.all([
        StorageService.getEvents(),
        StorageService.getWishlist(),
        StorageService.getLastSync()
      ]);

      return {
        eventsCount: events ? events.length : 0,
        wishlistCount: wishlist ? wishlist.length : 0,
        lastSyncTimestamp: lastSync,
        hasEventsWithImages: events ? events.filter(e => e.imgBase64).length : 0,
        hasWishlistWithImages: wishlist ? wishlist.filter(w => w.event?.imgBase64).length : 0
      };
    } catch (error) {
      return {
        error: error.message,
        eventsCount: 0,
        wishlistCount: 0
      };
    }
  }

  getDebugStats() {
    return {
      ...this.debugStats,
      currentState: this.state,
      syncInProgress: this.syncInProgress,
      autoSyncActive: this.autoSyncActive,
      lastSyncAttempt: this.lastSyncAttempt
    };
  }

  getStatus() {
    return {
      state: this.state,
      syncInProgress: this.syncInProgress,
      autoSyncActive: this.autoSyncActive,
      debugStats: this.debugStats
    };
  }

  static get STATES() {
    return SYNC_STATES;
  }
}

export default new SyncService();