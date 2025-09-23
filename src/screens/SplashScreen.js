import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusMessage from '../components/StatusMessage';
import { Logger } from '../utils/Logger';

const SplashScreen = ({ onComplete }) => {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Iniciando aplicativo...');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      Logger.info('App iniciando...');
      
      // Simular loading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessage('Abrindo sistema...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Sempre ir para webview por enquanto
      onComplete('webview');

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