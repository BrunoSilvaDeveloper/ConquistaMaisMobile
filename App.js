import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import WebViewComponent from './src/components/WebViewComponent';

function App() {
  const [appMode, setAppMode] = useState('splash');

  const handleSplashComplete = (mode) => {
    console.log('SplashScreen concluído, modo:', mode);
    setAppMode(mode);
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

  // Modo offline - implementaremos depois
  return null;
}

export default App;