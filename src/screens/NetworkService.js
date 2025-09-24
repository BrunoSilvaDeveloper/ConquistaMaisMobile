import NetInfo from '@react-native-community/netinfo';
import { Logger } from '../utils/Logger';

class NetworkService {
  constructor() {
    this.isConnected = false;
    this.connectionType = 'unknown';
    this.listeners = [];
    this.isInitialized = false;
    this.lastCheck = null;
    this.init();
  }

  init() {
    if (this.isInitialized) return;

    // Configurar listener para mudanças de conectividade
    this.unsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      const oldType = this.connectionType;
      
      this.isConnected = state.isConnected && state.isInternetReachable;
      this.connectionType = state.type;
      this.lastCheck = new Date().toISOString();
      
      Logger.info('Network status changed', {
        isConnected: this.isConnected,
        type: this.connectionType,
        isInternetReachable: state.isInternetReachable,
        details: state.details
      });

      // Notificar listeners apenas se status mudou
      if (wasConnected !== this.isConnected || oldType !== this.connectionType) {
        this.notifyListeners({
          isConnected: this.isConnected,
          connectionType: this.connectionType,
          previousState: { isConnected: wasConnected, type: oldType }
        });
      }
    });

    this.isInitialized = true;
    Logger.info('NetworkService initialized');
  }

  // Adicionar listener para mudanças de conectividade
  addListener(callback) {
    if (typeof callback !== 'function') {
      Logger.warn('NetworkService: callback must be a function');
      return;
    }
    
    this.listeners.push(callback);
    Logger.info(`NetworkService: listener added (total: ${this.listeners.length})`);
    
    // Retornar função para remover o listener
    return () => this.removeListener(callback);
  }

  // Remover listener específico
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
      Logger.info(`NetworkService: listener removed (total: ${this.listeners.length})`);
    }
  }

  // Remover todos os listeners
  clearListeners() {
    this.listeners = [];
    Logger.info('NetworkService: all listeners cleared');
  }

  // Notificar todos os listeners
  notifyListeners(networkState) {
    Logger.info(`NetworkService: notifying ${this.listeners.length} listeners`);
    this.listeners.forEach((callback, index) => {
      try {
        callback(networkState);
      } catch (error) {
        Logger.error(`NetworkService: error in listener ${index}`, error);
      }
    });
  }

  // Verificação pontual de conectividade
    async checkConnection() {
        try {
            const state = await NetInfo.fetch();
            
            this.isConnected = state.isConnected && state.isInternetReachable;
            this.connectionType = state.type;
            this.lastCheck = new Date().toISOString();
            
            Logger.info('Network check completed', {
            isConnected: this.isConnected,
            type: this.connectionType,
            isInternetReachable: state.isInternetReachable
            });
            
            // RETORNAR OBJETO COMPLETO (não apenas boolean)
            return {
            isConnected: this.isConnected,
            connectionType: this.connectionType,
            details: state.details,
            timestamp: this.lastCheck
            };
            
        } catch (error) {
            Logger.error('Network check failed', error);
            return {
            isConnected: false,
            connectionType: 'unknown',
            error: error.message,
            timestamp: new Date().toISOString()
            };
        }
    }

  // Aguardar até ter conexão (com timeout)
  async waitForConnection(timeout = 30000) {
    if (this.isConnected) {
      return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removeListener(connectionListener);
        reject(new Error('Connection timeout'));
      }, timeout);

      const connectionListener = (networkState) => {
        if (networkState.isConnected) {
          clearTimeout(timeoutId);
          this.removeListener(connectionListener);
          resolve(true);
        }
      };

      this.addListener(connectionListener);
    });
  }

  // Informações detalhadas sobre a conexão
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      lastCheck: this.lastCheck,
      isInitialized: this.isInitialized,
      listenersCount: this.listeners.length
    };
  }

  // Cleanup - importante para evitar memory leaks
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.clearListeners();
    this.isInitialized = false;
    Logger.info('NetworkService destroyed');
  }
}

export default new NetworkService();