import NetInfo from '@react-native-community/netinfo';
import { Logger } from '../utils/Logger';

class NetworkService {
  constructor() {
    this.isConnected = false;
    this.listeners = [];
    this.init();
  }

  init() {
    NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected;
      
      Logger.info('Network status changed', {
        isConnected: this.isConnected,
        type: state.type
      });

      // Notificar listeners se status mudou
      if (wasConnected !== this.isConnected) {
        this.notifyListeners(this.isConnected);
      }
    });
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  notifyListeners(isConnected) {
    this.listeners.forEach(callback => callback(isConnected));
  }

  async checkConnection() {
    const state = await NetInfo.fetch();
    this.isConnected = state.isConnected;
    return this.isConnected;
  }
}

export default new NetworkService();