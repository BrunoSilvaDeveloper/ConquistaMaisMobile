import ApiService from '../services/ApiService';
import { Logger } from './Logger';

// Função para testar o ApiService - USE ESTA!
export const testApiService = async () => {
  try {
    Logger.info('🧪 ===== TESTE DO APISERVICE INICIADO =====');

    // Teste 1: Stats
    const stats = ApiService.getStats();
    Logger.info('📊 Estatísticas do ApiService:');
    Logger.info(`   - Base URL: ${stats.baseURL}`);
    Logger.info(`   - Timeout: ${stats.defaultTimeout}ms`);
    Logger.info(`   - Max Retries: ${stats.maxRetries}`);
    Logger.info(`   - Cache Size: ${stats.cacheSize}`);

    // Teste 2: Sincronização
    Logger.info('🔄 Testando syncData()...');
    const syncResult = await ApiService.syncData();
    Logger.info('✅ SYNC SUCCESS! Dados recebidos:', syncResult);

    // Teste 3: Eventos
    Logger.info('📅 Testando getEvents(5)...');
    const eventsResult = await ApiService.getEvents(5);
    Logger.info('✅ EVENTS SUCCESS! Eventos recebidos:', eventsResult);

    // Teste 4: Wishlist
    Logger.info('❤️ Testando getWishlist()...');
    const wishlistResult = await ApiService.getWishlist();
    Logger.info('✅ WISHLIST SUCCESS! Items:', wishlistResult);

    Logger.info('🎉 ===== TODOS OS TESTES PASSARAM! =====');
    return true;

  } catch (error) {
    Logger.error('💥 ===== TESTE FALHOU =====');
    Logger.error('Erro:', error.message);
    Logger.error('Status:', error.status);
    Logger.error('Stack:', error.stack);
    return false;
  }
};

// Auto-executar após 5 segundos se importado
setTimeout(() => {
  Logger.info('⏰ Auto-executando teste da API em 5 segundos...');
  Logger.info('💡 Para testar manualmente, chame: testApiService()');

  setTimeout(() => {
    testApiService();
  }, 5000);
}, 1000);

export default { testApiService };