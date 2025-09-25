import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import StorageService from '../storage/StorageService';
import SyncService from '../services/SyncService';
import NetworkService from '../services/NetworkService';

const OfflineHomeScreen = ({ onNavigate }) => {
  const [eventsCount, setEventsCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    loadCounts();

    // Recarregar a cada 5 segundos para pegar dados atualizados
    const interval = setInterval(loadCounts, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadCounts = async () => {
    try {
      const [eventsData, wishlistData] = await Promise.all([
        StorageService.getEvents(),
        StorageService.getWishlist()
      ]);

      setEventsCount(eventsData ? eventsData.length : 0);
      setWishlistCount(wishlistData ? wishlistData.length : 0);
    } catch (err) {
      setEventsCount(0);
      setWishlistCount(0);
    }
  };

  // Métodos de debug
  const runDebugSync = async () => {
    Alert.alert(
      'Debug Sync',
      'Executar diagnóstico completo da sincronização?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Executar',
          onPress: async () => {
            try {
              const diagnosis = await SyncService.debugSync();
              setDebugInfo(diagnosis);
              setShowDebug(true);

              const message = diagnosis.success
                ? `Debug concluído com sucesso!\n\nDuração: ${diagnosis.duration}ms\nTestes executados: ${Object.keys(diagnosis.tests).length}`
                : `Debug falhou: ${diagnosis.error}`;

              Alert.alert('Debug Sync', message);
            } catch (error) {
              Alert.alert('Erro', `Falha ao executar debug: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const checkConnectivity = async () => {
    try {
      const isOnline = await NetworkService.checkConnection();
      const syncStats = SyncService.getDebugStats();

      Alert.alert(
        'Status de Conectividade',
        `Conectividade: ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}\n\n` +
        `Sync Status:\n` +
        `• Estado: ${syncStats.currentState}\n` +
        `• Sync em andamento: ${syncStats.syncInProgress ? 'Sim' : 'Não'}\n` +
        `• Auto-sync ativo: ${syncStats.autoSyncActive ? 'Sim' : 'Não'}\n` +
        `• Última tentativa: ${syncStats.lastSyncAttempt || 'Nunca'}\n\n` +
        `Estatísticas:\n` +
        `• Tentativas totais: ${syncStats.totalSyncAttempts}\n` +
        `• Sucessos: ${syncStats.successfulSyncs}\n` +
        `• Falhas: ${syncStats.failedSyncs}\n` +
        `• Último status: ${syncStats.lastSyncStatus || 'N/A'}`
      );
    } catch (error) {
      Alert.alert('Erro', `Falha ao verificar conectividade: ${error.message}`);
    }
  };

  const forceSync = async () => {
    Alert.alert(
      'Forçar Sync',
      'Executar sincronização manual agora?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Executar',
          onPress: async () => {
            try {
              const result = await SyncService.fullSync();
              const message = result.status === 'success'
                ? `Sincronização concluída!\n\nEventos: ${result.eventsCount}\nWishlist: ${result.wishlistCount}\nDuração: ${result.duration}ms`
                : `Sincronização falhou: ${result.error}`;

              Alert.alert('Sync Manual', message);
              loadCounts(); // Recarregar contadores
            } catch (error) {
              Alert.alert('Erro', `Falha ao executar sync: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conquista+ (Offline)</Text>
        <Text style={styles.subtitle}>Modo offline</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{eventsCount}</Text>
            <Text style={styles.statLabel}>Eventos Salvos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{wishlistCount}</Text>
            <Text style={styles.statLabel}>Lista de Desejos</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => onNavigate('events')}
        >
          <Text style={styles.navigationIcon}>📅</Text>
          <Text style={styles.navigationText}>Ver Eventos Salvos</Text>
          {eventsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{eventsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => onNavigate('wishlist')}
        >
          <Text style={styles.navigationIcon}>❤️</Text>
          <Text style={styles.navigationText}>Lista de Desejos</Text>
          {wishlistCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{wishlistCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Seção de Debug - Temporária */}
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>🔧 Debug da Sincronização</Text>

          <TouchableOpacity style={styles.debugButton} onPress={checkConnectivity}>
            <Text style={styles.debugButtonText}>📊 Status & Conectividade</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.debugButton} onPress={forceSync}>
            <Text style={styles.debugButtonText}>🚀 Forçar Sync Manual</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.debugButton} onPress={runDebugSync}>
            <Text style={styles.debugButtonText}>🔍 Debug Completo</Text>
          </TouchableOpacity>

          {showDebug && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => setShowDebug(!showDebug)}
            >
              <Text style={styles.debugButtonText}>
                📋 {showDebug ? 'Ocultar' : 'Mostrar'} Resultados Debug
              </Text>
            </TouchableOpacity>
          )}

          {showDebug && debugInfo && (
            <ScrollView style={styles.debugResults}>
              <Text style={styles.debugResultText}>
                {JSON.stringify(debugInfo, null, 2)}
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#677DE9',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'white',
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#677DE9',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  navigationButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navigationIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  navigationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  badge: {
    backgroundColor: '#677DE9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Estilos de debug
  debugSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 20,
    marginTop: 30,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 15,
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
  },
  debugResults: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  debugResultText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#495057',
    lineHeight: 14,
  },
});

export default OfflineHomeScreen;