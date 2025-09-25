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
    // Prevenir sincronizações simultâneas
    if (this.syncInProgress) {
      return { status: 'already_running' };
    }

    try {
      // Verificar conectividade
      const isOnline = await NetworkService.checkConnection();
      if (!isOnline) {
        return { status: 'no_connection' };
      }

      // Iniciar sincronização
      this.syncInProgress = true;
      this._setState(SYNC_STATES.SYNCING);

      // Sincronizar dados principais
      const syncResponse = await ApiService.syncData();

      if (syncResponse.success) {
        const { events, wishlist } = syncResponse.data || {};

        // Salvar dados e baixar imagens
        let processedEvents = [];
        let processedWishlist = [];

        if (events) {
          processedEvents = await this._processEventsWithImages(events);
          await StorageService.saveEvents(processedEvents);
        }

        if (wishlist) {
          processedWishlist = await this._processWishlistWithImages(wishlist);
          await StorageService.saveWishlist(processedWishlist);
        }

        // Atualizar timestamp da última sync
        const now = new Date().toISOString();
        await StorageService.saveLastSync(now);
        this.lastSyncAttempt = now;

        this._setState(SYNC_STATES.IDLE);

        return {
          status: 'success',
          timestamp: now
        };

      } else {
        throw new Error(syncResponse.message || 'Sync failed');
      }

    } catch (error) {
      this._setState(SYNC_STATES.ERROR);
      Logger.error('❌ Falha no sync:', error);

      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };

    } finally {
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
    if (this.autoSyncActive) return;

    Logger.info(`⏰ Sync automático iniciado (a cada ${SYNC_INTERVALS.PERIODIC / 1000}s)`);

    this.syncInterval = setInterval(async () => {
      const isOnline = await NetworkService.checkConnection();
      if (isOnline && this.state === SYNC_STATES.IDLE) {
        Logger.info('⏰ Executando sync automático');
        await this.fullSync();
      }
    }, SYNC_INTERVALS.PERIODIC);

    this.autoSyncActive = true;
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      Logger.info('⏰ Sync automático parado');
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



  getStatus() {
    return {
      state: this.state,
      syncInProgress: this.syncInProgress,
      autoSyncActive: this.autoSyncActive
    };
  }

  static get STATES() {
    return SYNC_STATES;
  }
}

export default new SyncService();