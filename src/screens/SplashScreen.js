import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusMessage from '../components/StatusMessage';
import SyncService from '../services/SyncService';
import NetworkService from '../services/NetworkService';
import { Logger } from '../utils/Logger';

const SplashScreen = ({ onComplete }) => {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Iniciando aplicativo...');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setMessage('Verificando conexão...');
      
      // Verificar conexão
      const isConnected = await NetworkService.checkConnection();
      
      if (isConnected) {
        setMessage('Sincronizando dados...');
        
        // Tentar sincronização completa
        const syncSuccess = await SyncService.fullSync();
        
        if (syncSuccess) {
          setMessage('Dados sincronizados!');
          setTimeout(() => onComplete('webview'), 1000);
        } else {
          // Se sync falhou, tentar carregar dados locais
          const localData = await SyncService.getLocalData();
          if (localData.hasData) {
            setMessage('Usando dados locais...');
            setTimeout(() => onComplete('offline'), 1000);
          } else {
            setStatus('error');
            setMessage('Falha na sincronização e sem dados locais.');
          }
        }
      } else {
        setMessage('Verificando dados locais...');
        
        // Sem internet, verificar dados locais
        const localData = await SyncService.getLocalData();
        if (localData.hasData) {
          setMessage('Modo offline ativado');
          setTimeout(() => onComplete('offline'), 1000);
        } else {
          setStatus('no_data');
          setMessage('Sem conexão com internet e sem dados salvos.');
        }
      }

    } catch (error) {
      Logger.error('App initialization failed', error);
      setStatus('error');
      setMessage('Erro ao inicializar o aplicativo.');
    }
  };

  const handleRetry = () => {
    setStatus('loading');
    setMessage('Tentando novamente...');
    initializeApp();
  };

  return (
    <View style={styles.container}>
      {/* Logo placeholder */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Completa+</Text>
      </View>

      {status === 'loading' && (
        <LoadingSpinner message={message} />
      )}

      {status === 'error' && (
        <StatusMessage
          type="error"
          message={message}
          actionText="Tentar Novamente"
          onAction={handleRetry}
        />
      )}

      {status === 'no_data' && (
        <StatusMessage
          type="warning"
          message={message}
          actionText="Tentar Conectar"
          onAction={handleRetry}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
  },
});

export default SplashScreen;