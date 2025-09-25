import SyncService from '../services/SyncService';
import { Logger } from './Logger';

// Função para testar o SyncService
export const testSyncService = async () => {
  try {
    Logger.info('🧪 ===== TESTE DO SYNCSERVICE INICIADO =====');

    // Teste 1: Status inicial
    const initialStatus = SyncService.getStatus();
    Logger.info('📊 Status inicial do SyncService:', initialStatus);

    // Teste 2: Adicionar listener
    const removeListener = SyncService.addListener((event) => {
      Logger.info(`📡 Evento recebido do SyncService: ${event.type}`, event);
    });

    // Teste 3: Testar sync no app start
    Logger.info('🚀 Testando syncOnAppStart...');
    const appStartResult = await SyncService.syncOnAppStart();
    Logger.info('✅ Resultado do syncOnAppStart:', appStartResult);

    // Teste 4: Testar operação offline (wishlist)
    Logger.info('➕ Testando operação offline - adicionar à wishlist...');
    const offlineItemId = await SyncService.addToWishlistOffline('event', '123');
    Logger.info('✅ Item adicionado offline:', offlineItemId);

    // Teste 5: Status da queue
    const queueStatus = SyncService.getOfflineQueueStatus();
    Logger.info('📝 Status da queue offline:', queueStatus);

    // Teste 6: Dados locais
    Logger.info('📂 Carregando dados locais...');
    const localData = await SyncService.getLocalData();
    Logger.info('✅ Dados locais carregados:', {
      hasData: localData.hasData,
      eventsCount: localData.events.length,
      wishlistCount: localData.wishlist.length,
      dataAge: localData.dataAge
    });

    // Teste 7: Sync manual
    Logger.info('👤 Testando sync manual...');
    const manualSyncResult = await SyncService.syncManual();
    Logger.info('✅ Resultado do sync manual:', manualSyncResult);

    // Remover listener
    removeListener();

    Logger.info('🎉 ===== TODOS OS TESTES DO SYNCSERVICE PASSARAM! =====');
    return true;

  } catch (error) {
    Logger.error('💥 ===== TESTE DO SYNCSERVICE FALHOU =====');
    Logger.error('Erro:', error.message);
    Logger.error('Stack:', error.stack);
    return false;
  }
};

// Função para testar cenário offline
export const testOfflineScenario = async () => {
  Logger.info('🧪 ===== TESTE DE CENÁRIO OFFLINE =====');

  try {
    // Simular adição de vários itens offline
    Logger.info('➕ Simulando operações offline...');

    await SyncService.addToWishlistOffline('event', 'event-1');
    await SyncService.addToWishlistOffline('course', 'course-2');
    await SyncService.addToWishlistOffline('event', 'event-3');

    const queueStatus = SyncService.getOfflineQueueStatus();
    Logger.info('📊 Queue após operações offline:', {
      size: queueStatus.size,
      operations: queueStatus.operations.map(op => `${op.type} (${op.retries}/${op.maxRetries})`)
    });

    Logger.info('💡 Teste offline concluído. Para testar sync:', {
      message: 'Desligue e ligue o WiFi para simular volta de rede',
      expectedBehavior: 'Queue deve ser processada automaticamente'
    });

    return true;

  } catch (error) {
    Logger.error('❌ Teste offline falhou:', error);
    return false;
  }
};

// Auto-executar desabilitado para evitar interferência com testes
// Para testar manualmente, importe e execute: testSyncService() ou testOfflineScenario()
/*
setTimeout(() => {
  Logger.info('⏰ Auto-executando teste do SyncService em 3 segundos...');

  setTimeout(() => {
    testSyncService();
  }, 3000);
}, 1000);
*/

export default { testSyncService, testOfflineScenario };