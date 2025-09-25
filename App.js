import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import WebViewComponent from './src/components/WebViewComponent';
import OfflineHomeScreen from './src/screens/OfflineHomeScreen';
import EventsListScreen from './src/screens/EventsListScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import NetworkService from './src/services/NetworkService';
import SyncService from './src/services/SyncService';


function App() {
  const [appMode, setAppMode] = useState('splash');
  const [offlineScreen, setOfflineScreen] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const networkListener = (networkState) => {
      if (appMode === 'splash') return;

      if (networkState.isConnected && appMode === 'offline') {
        console.log('Conexão restaurada, mudando para WebView');
        setAppMode('webview');
      } else if (!networkState.isConnected && appMode === 'webview') {
        console.log('Conexão perdida, mudando para offline');
        setAppMode('offline');
      }
    };

    const removeListener = NetworkService.addListener(networkListener);
    return () => removeListener();
  }, [appMode]);

  useEffect(() => {
    if (appMode === 'webview') {
      console.log('🚀 Iniciando modo webview - sync automático ativado');
      SyncService.startAutoSync();
    } else {
      console.log('📴 Saindo do modo webview - sync automático parado');
      SyncService.stopAutoSync();
    }
  }, [appMode]);

  const handleSplashComplete = (mode) => {
    console.log('SplashScreen concluído, modo:', mode);
    setAppMode(mode);
  };

  const handleOfflineNavigate = (screen) => {
    setOfflineScreen(screen);
    setSelectedEvent(null);
  };

  const handleOfflineBack = () => {
    if (selectedEvent) {
      setSelectedEvent(null);
    } else {
      setOfflineScreen('home');
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
  };

  if (appMode === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (appMode === 'webview') {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <WebViewComponent />
      </>
    );
  }

  if (appMode === 'offline') {
    // Se um evento foi selecionado, mostra os detalhes
    if (selectedEvent) {
      return (
        <>
          <StatusBar barStyle="dark-content" />
          <EventDetailScreen event={selectedEvent} onBack={handleOfflineBack} />
        </>
      );
    }

    if (offlineScreen === 'events') {
      return (
        <>
          <StatusBar barStyle="dark-content" />
          <EventsListScreen onBack={handleOfflineBack} onEventSelect={handleEventSelect} />
        </>
      );
    }

    if (offlineScreen === 'wishlist') {
      return (
        <>
          <StatusBar barStyle="dark-content" />
          <WishlistScreen onBack={handleOfflineBack} onEventSelect={handleEventSelect} />
        </>
      );
    }

    return (
      <>
        <StatusBar barStyle="dark-content" />
        <OfflineHomeScreen onNavigate={handleOfflineNavigate} />
      </>
    );
  }

  return null;
}

export default App;