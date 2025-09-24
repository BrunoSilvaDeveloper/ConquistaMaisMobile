import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import ApiService from '../services/ApiService';
import { Logger } from '../utils/Logger';

const TestApiButton = () => {
  const testApi = async () => {
    try {
      Logger.info('🧪 INICIANDO TESTE DO APISERVICE');

      // Teste 1: Verificar estatísticas
      const stats = ApiService.getStats();
      Logger.info('📊 Stats:', stats);

      // Teste 2: Sincronização
      Logger.info('🔄 Testando syncData...');
      const syncResult = await ApiService.syncData();
      Logger.info('✅ Sincronização SUCCESS:', syncResult);

      // Teste 3: Eventos
      Logger.info('📅 Testando getEvents...');
      const eventsResult = await ApiService.getEvents(10);
      Logger.info('✅ Eventos SUCCESS:', eventsResult);

      Alert.alert('Teste OK!', 'Verifique os logs no console para ver os resultados');

    } catch (error) {
      Logger.error('❌ ERRO NO TESTE:', error);
      Alert.alert('Teste Falhou', error.message);
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={testApi}>
      <Text style={styles.buttonText}>🧪 TESTAR API</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    zIndex: 1000,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default TestApiButton;