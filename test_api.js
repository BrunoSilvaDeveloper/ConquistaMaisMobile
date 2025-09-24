// Teste manual do ApiService
// Execute com: node test_api.js

import ApiService from './src/services/ApiService.js';
import { Logger } from './src/utils/Logger.js';

async function testApiService() {
  try {
    Logger.info('🧪 Iniciando teste do ApiService');

    // Teste 1: Verificar estatísticas
    const stats = ApiService.getStats();
    Logger.info('📊 Estatísticas do ApiService:', stats);

    // Teste 2: Tentar sincronização (vai falhar se não houver cookie)
    Logger.info('🔄 Testando syncData()...');
    try {
      const syncResult = await ApiService.syncData();
      Logger.info('✅ Sincronização bem-sucedida:', syncResult);
    } catch (error) {
      Logger.error('❌ Falha na sincronização (esperado se não autenticado):', error.message);
    }

    // Teste 3: Tentar buscar eventos
    Logger.info('📅 Testando getEvents()...');
    try {
      const eventsResult = await ApiService.getEvents(10);
      Logger.info('✅ Eventos carregados:', eventsResult);
    } catch (error) {
      Logger.error('❌ Falha ao carregar eventos:', error.message);
    }

    // Teste 4: Verificar saúde da API
    Logger.info('🏥 Testando checkHealth()...');
    try {
      const healthResult = await ApiService.checkHealth();
      Logger.info('✅ API saudável:', healthResult);
    } catch (error) {
      Logger.error('❌ API não está acessível:', error.message);
    }

    Logger.info('🏁 Teste do ApiService concluído');

  } catch (error) {
    Logger.error('💥 Erro no teste:', error);
  }
}

// Executar apenas se for executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testApiService();
}

export { testApiService };