import ApiService from './ApiService';
import StorageService from '../storage/StorageService';
import NetworkService from './NetworkService';
import { Logger } from '../utils/Logger';
import { SYNC_INTERVALS } from '../constants/Config';

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

        // Salvar apenas dados necessários com estrutura simplificada
        if (events) {
          const simplifiedEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            loc: event.loc,
            img: event.img
          }));
          await StorageService.saveEvents(simplifiedEvents);
        }

        if (wishlist) {
          const simplifiedWishlist = wishlist.map(item => ({
            wishlist_id: item.wishlist_id,
            event: {
              id: item.event.id,
              title: item.event.title,
              start: item.event.start,
              end: item.event.end,
              loc: item.event.loc,
              img: item.event.img
            }
          }));
          await StorageService.saveWishlist(simplifiedWishlist);
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

    if (isConnected && !this.autoSyncActive) {
      this.startAutoSync();
    } else if (!isConnected && this.autoSyncActive) {
      this.stopAutoSync();
    }
  }

  // ==========================================
  // SYNC AUTOMÁTICO A CADA 10 SEGUNDOS
  // ==========================================

  startAutoSync() {
    if (this.autoSyncActive) return;

    this.syncInterval = setInterval(async () => {
      const isOnline = await NetworkService.checkConnection();
      if (isOnline && this.state === SYNC_STATES.IDLE) {
        await this.fullSync();
      }
    }, SYNC_INTERVALS.PERIODIC);

    this.autoSyncActive = true;
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
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