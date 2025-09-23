import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import WebViewComponent from './src/components/WebViewComponent';
import OfflineHomeScreen from './src/screens/OfflineHomeScreen';
import EventsListScreen from './src/screens/EventsListScreen';
import WishlistScreen from './src/screens/WishlistScreen';


function App() {
  const [appMode, setAppMode] = useState('splash');
  const [offlineScreen, setOfflineScreen] = useState('home');

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