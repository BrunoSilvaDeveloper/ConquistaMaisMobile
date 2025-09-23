import ApiService from './ApiService';
import StorageService from '../storage/StorageService';
import NetworkService from './NetworkService';
import { Logger } from '../utils/Logger';
import { SYNC_INTERVALS } from '../constants/Config';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.listeners = [];
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  notifyListeners(data) {
    this.listeners.forEach(callback => callback(data));
  }

  async fullSync() {
    if (this.isSyncing) {
      Logger.warn('Sync already in progress');
      return false;
    }

    if (!NetworkService.isConnected) {
      Logger.warn('No internet connection for sync');
      return false;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_start' });

    try {
      Logger.info('Starting full sync');

      // 1. Sincronizar dados principais
      const syncResponse = await ApiService.syncData();
      
      if (syncResponse.success) {
        const { user, events, wishlist } = syncResponse.data;

        // 2. Salvar dados localmente
        await StorageService.saveUserData(user);
        await StorageService.saveEvents(events);
        await StorageService.saveWishlist(wishlist);
        await StorageService.saveLastSync(new Date().toISOString());

        Logger.info('Full sync completed successfully');
        this.notifyListeners({ 
          type: 'sync_success', 
          data: syncResponse.data 
        });

        return true;
      } else {
        throw new Error(syncResponse.message || 'Sync failed');
      }

    } catch (error) {
      Logger.error('Full sync failed', error);
      this.notifyListeners({ 
        type: 'sync_error', 
        error: error.message 
      });
      return false;

    } finally {
      this.isSyncing = false;
    }
  }

  async syncWishlistOnly() {
    if (!NetworkService.isConnected) {
      return false;
    }

    try {
      const localWishlist = await StorageService.getWishlist() || [];
      const response = await ApiService.syncWishlist(localWishlist);
      
      if (response.success) {
        await StorageService.saveWishlist(response.data.wishlist);
        Logger.info('Wishlist sync completed');
        return true;
      }
      
      return false;
    } catch (error) {
      Logger.error('Wishlist sync failed', error);
      return false;
    }
  }

  startPeriodicSync() {
    this.stopPeriodicSync();
    
    this.syncInterval = setInterval(async () => {
      if (NetworkService.isConnected) {
        Logger.info('Periodic sync triggered');
        await this.fullSync();
      }
    }, SYNC_INTERVALS.PERIODIC);

    Logger.info('Periodic sync started');
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      Logger.info('Periodic sync stopped');
    }
  }

  async getLocalData() {
    try {
      const [userData, events, wishlist, lastSync] = await Promise.all([
        StorageService.getUserData(),
        StorageService.getEvents(),
        StorageService.getWishlist(),
        StorageService.getLastSync()
      ]);

      return {
        user: userData,
        events: events || [],
        wishlist: wishlist || [],
        lastSync: lastSync,
        hasData: !!(userData && events)
      };

    } catch (error) {
      Logger.error('Error loading local data', error);
      return {
        user: null,
        events: [],
        wishlist: [],
        lastSync: null,
        hasData: false
      };
    }
  }
}

export default new SyncService();