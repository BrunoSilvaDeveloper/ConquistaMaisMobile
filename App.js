import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import WebViewComponent from './src/components/WebViewComponent';
import OfflineHomeScreen from './src/screens/OfflineHomeScreen';
import EventsListScreen from './src/screens/EventsListScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import NetworkService from './src/services/NetworkService';
import SyncService from './src/services/SyncService';


function App() {
  const [appMode, setAppMode] = useState('splash');
  const [offlineScreen, setOfflineScreen] = useState('home');

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
      SyncService.startAutoSync();
    } else {
      SyncService.stopAutoSync();
    }
  }, [appMode]);

  const handleSplashComplete = (mode) => {
    console.log('SplashScreen concluído, modo:', mode);
    setAppMode(mode);
  };

  const handleOfflineNavigate = (screen) => {
    setOfflineScreen(screen);
  };

  const handleOfflineBack = () => {
    setOfflineScreen('home');
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
    if (offlineScreen === 'events') {
      return (
        <>
          <StatusBar barStyle="dark-content" />
          <EventsListScreen onBack={handleOfflineBack} />
        </>
      );
    }

    if (offlineScreen === 'wishlist') {
      return (
        <>
          <StatusBar barStyle="dark-content" />
          <WishlistScreen onBack={handleOfflineBack} />
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