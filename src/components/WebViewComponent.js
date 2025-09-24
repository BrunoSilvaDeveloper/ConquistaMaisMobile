import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, BackHandler, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import LoadingSpinner from './LoadingSpinner';
import StorageService from '../storage/StorageService';
import { API_CONFIG } from '../constants/Config';
import { Logger } from '../utils/Logger';

const WebViewComponent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef(null);
  const [hasCapture, setHasCaptured] = useState(false);

  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      Alert.alert("Sair", "Deseja realmente sair do aplicativo?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", onPress: () => BackHandler.exitApp() }
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [canGoBack]);

  // JavaScript a ser injetado no webview
  const injectedJavaScript = `
    (function() {
      console.log('Cookie capture script injected');
      
      function extractCookies() {
        const cookies = document.cookie;
        console.log('Current cookies:', cookies);
        return cookies;
      }
      
      function extractLaravelSession() {
        const cookies = document.cookie;
        const match = cookies.match(/laravel_session=([^;]+)/);
        return match ? match[1] : null;
      }
      
      function sendCookiesData() {
        const allCookies = extractCookies();
        const sessionCookie = extractLaravelSession();
        
        const data = {
          type: 'cookies',
          url: window.location.href,
          allCookies: allCookies,
          sessionCookie: sessionCookie,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        };
        
        console.log('Sending cookie data:', data);
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
      
      // Enviar cookies imediatamente
      setTimeout(() => {
        sendCookiesData();
      }, 2000);
      
      // Monitorar mudanças de URL para capturar após login
      let lastUrl = window.location.href;
      const urlCheckInterval = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          console.log('URL changed from', lastUrl, 'to', currentUrl);
          lastUrl = currentUrl;
          
          // Aguardar página carregar após mudança de URL
          setTimeout(() => {
            sendCookiesData();
          }, 1500);
        }
      }, 1000);
      
      // Monitorar mudanças no DOM que podem indicar login
      const observer = new MutationObserver(() => {
        // Verificar se há elementos que indicam usuário logado
        const userElements = document.querySelectorAll('[class*="user"], [id*="user"], [class*="profile"], [id*="profile"]');
        const logoutElements = document.querySelectorAll('a[href*="logout"], button[onclick*="logout"]');
        
        if (userElements.length > 0 || logoutElements.length > 0) {
          console.log('User elements detected, sending cookies');
          setTimeout(() => {
            sendCookiesData();
          }, 1000);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Cleanup após 5 minutos para evitar overhead
      setTimeout(() => {
        clearInterval(urlCheckInterval);
        observer.disconnect();
        console.log('Cookie capture cleanup completed');
      }, 5 * 60 * 1000);
      
    })();
  `;

  // Handler para mensagens do webview
  const handleMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      Logger.info('Message from WebView:', message);

      if (message.type === 'cookies') {
        await processCookies(message);
      }
    } catch (error) {
      Logger.error('Error processing WebView message:', error);
    }
  };

  // Processar cookies recebidos
  const processCookies = async (cookieData) => {
    try {
      const { allCookies, sessionCookie, url, timestamp } = cookieData;
      
      // Debug mais enxuto - apenas quando necessário
      if (url.includes('/login') || url.includes('/dashboard')) {
        Logger.info('Processing cookies from:', url);
        Logger.info('Cookie count:', allCookies.length);
      }
      
      // Procurar diferentes tipos de session cookies
      const laravelSession = allCookies.match(/laravel_session=([^;]+)/);
      const xsrfToken = allCookies.match(/XSRF-TOKEN=([^;]+)/);
      
      // Usar laravel_session se existir, senão usar XSRF-TOKEN
      if (laravelSession && laravelSession[1]) {
        const cookieString = `laravel_session=${laravelSession[1]}`;
        await StorageService.saveAuthCookie(cookieString);
        Logger.info('Laravel session cookie captured!');
        
        if (!hasCapture) {
          setHasCaptured(true);
        }
        
      } else if (xsrfToken && xsrfToken[1] && !hasCapture) {
        // Usar XSRF-TOKEN temporariamente para autenticação
        const cookieString = `XSRF-TOKEN=${xsrfToken[1]}`;
        await StorageService.saveAuthCookie(cookieString);
        Logger.info('XSRF token saved as auth cookie');
        setHasCaptured(true);
      }
      
    } catch (error) {
      Logger.error('Error processing cookies:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: API_CONFIG.WEB_URL }}
        style={styles.webview}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        // ADICIONAR ESTAS LINHAS PARA CORRIGIR TELA BRANCA:
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        bounces={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        // Tentar forçar reload se ficar branco
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          Logger.error('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          Logger.error('WebView HTTP error:', nativeEvent);
        }}
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Carregando sistema..." />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default WebViewComponent;