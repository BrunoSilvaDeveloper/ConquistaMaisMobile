export const API_CONFIG = {
  BASE_URL: 'https://conquistamais.zunostudio.com.br',
  API_ENDPOINT: '/api/mobile/v1',
  WEB_URL: 'https://conquistamais.zunostudio.com.br'
};

export const STORAGE_KEYS = {
  USER_DATA: '@completa_user_data',
  EVENTS_DATA: '@completa_events_data',
  WISHLIST_DATA: '@completa_wishlist_data',
  AUTH_COOKIE: '@completa_auth_cookie',
  LAST_SYNC: '@completa_last_sync'
};

export const SYNC_INTERVALS = {
  APP_OPEN: 0, // Imediato
  PERIODIC: 10 * 1000, // 10 segundos
  RETRY_DELAY: 30 * 1000 // 30 segundos em caso de erro
};