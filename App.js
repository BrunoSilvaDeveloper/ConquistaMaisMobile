import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';

function App() {
  const [appMode, setAppMode] = useState('splash');

  const handleSplashComplete = (mode) => {
    console.log('SplashScreen concluído, modo:', mode);
    setAppMode(mode);
  };

  if (appMode === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Temporário - para quando o splash terminar
  if (appMode === 'webview') {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        {/* Aqui depois vamos colocar o WebView */}
      </>
    );
  }

  if (appMode === 'offline') {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        {/* Aqui depois vamos colocar as telas offline */}
      </>
    );
  }

  return null;
}

export default App;