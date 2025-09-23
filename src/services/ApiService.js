import { API_CONFIG } from '../constants/Config';
import StorageService from '../storage/StorageService';
import { Logger } from '../utils/Logger';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL + API_CONFIG.API_ENDPOINT;
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const authCookie = await StorageService.getAuthCookie();
      
      const config = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        ...options
      };

      // Adicionar cookie de autenticação se disponível
      if (authCookie) {
        config.headers['Cookie'] = authCookie;
      }

      const url = `${this.baseURL}${endpoint}`;
      Logger.info(`API Request: ${config.method} ${url}`);

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      Logger.info(`API Response: ${endpoint}`, { status: response.status });
      return data;

    } catch (error) {
      Logger.error(`API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // Sincronização completa
  async syncData() {
    return await this.makeRequest('/sync');
  }

  // Eventos
  async getEvents() {
    return await this.makeRequest('/events');
  }

  // Wishlist
  async getWishlist() {
    return await this.makeRequest('/wishlist');
  }

  async addToWishlist(type, itemId) {
    return await this.makeRequest('/wishlist/add', {
      method: 'POST',
      body: JSON.stringify({ type, item_id: itemId })
    });
  }

  async removeFromWishlist(id) {
    return await this.makeRequest(`/wishlist/remove/${id}`, {
      method: 'DELETE'
    });
  }

  async syncWishlist(wishlistData) {
    return await this.makeRequest('/wishlist/sync', {
      method: 'POST',
      body: JSON.stringify({ wishlist: wishlistData })
    });
  }
}

export default new ApiService();