import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/Config';
import { Logger } from '../utils/Logger';

class StorageService {
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      Logger.info(`Data saved to storage: ${key}`);
      return true;
    } catch (error) {
      Logger.error(`Error saving to storage: ${key}`, error);
      return false;
    }
  }

  async getItem(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue !== null) {
        const data = JSON.parse(jsonValue);
        Logger.info(`Data loaded from storage: ${key}`);
        return data;
      }
      return null;
    } catch (error) {
      Logger.error(`Error loading from storage: ${key}`, error);
      return null;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      Logger.info(`Data removed from storage: ${key}`);
      return true;
    } catch (error) {
      Logger.error(`Error removing from storage: ${key}`, error);
      return false;
    }
  }

  async clearAll() {
    try {
      await AsyncStorage.clear();
      Logger.info('All storage cleared');
      return true;
    } catch (error) {
      Logger.error('Error clearing storage', error);
      return false;
    }
  }

  // Métodos específicos para nossos dados
  async saveUserData(userData) {
    return await this.setItem(STORAGE_KEYS.USER_DATA, userData);
  }

  async getUserData() {
    return await this.getItem(STORAGE_KEYS.USER_DATA);
  }

  async saveEvents(events) {
    return await this.setItem(STORAGE_KEYS.EVENTS_DATA, events);
  }

  async getEvents() {
    return await this.getItem(STORAGE_KEYS.EVENTS_DATA);
  }

  async saveWishlist(wishlist) {
    return await this.setItem(STORAGE_KEYS.WISHLIST_DATA, wishlist);
  }

  async getWishlist() {
    return await this.getItem(STORAGE_KEYS.WISHLIST_DATA);
  }

  async saveAuthCookie(cookie) {
    return await this.setItem(STORAGE_KEYS.AUTH_COOKIE, cookie);
  }

  async getAuthCookie() {
    return await this.getItem(STORAGE_KEYS.AUTH_COOKIE);
  }

  async clearAuthCookie() {
    return await this.removeItem(STORAGE_KEYS.AUTH_COOKIE);
  }

  async saveLastSync(timestamp) {
    return await this.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  }

  async getLastSync() {
    return await this.getItem(STORAGE_KEYS.LAST_SYNC);
  }
}

export default new StorageService();