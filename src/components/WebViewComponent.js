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
        return cookies;
      }

      function extractLaravelSession() {
        const cookies = document.cookie;
        // Procurar por diferentes padrões de session
        let match = cookies.match(/laravel_session=([^;]+)/);
        if (!match) {
          // Tentar outros padrões comuns do Laravel
          match = cookies.match(/[a-zA-Z0-9_]*session[a-zA-Z0-9_]*=([^;]+)/i);
        }
        if (!match) {
          // Como fallback, usar XSRF-TOKEN se disponível
          match = cookies.match(/XSRF-TOKEN=([^;]+)/);
        }
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
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }

      // Função para lidar com possíveis erros de redirect/logout
      function handlePageErrors() {
        const bodyText = document.body ? document.body.textContent.trim() : '';
        const bodyHTML = document.body ? document.body.innerHTML.trim() : '';
        const currentUrl = window.location.href;

        console.log('=== PAGE DEBUG INFO ===');
        console.log('URL:', currentUrl);
        console.log('Body text length:', bodyText.length);
        console.log('Body HTML length:', bodyHTML.length);
        console.log('Body text preview:', bodyText.substring(0, 200));
        console.log('Title:', document.title);
        console.log('Ready state:', document.readyState);
        console.log('========================');

        // Enviar dados de debug para o app
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'pageDebug',
            url: currentUrl,
            bodyTextLength: bodyText.length,
            bodyHtmlLength: bodyHTML.length,
            bodyPreview: bodyText.substring(0, 200),
            title: document.title,
            readyState: document.readyState,
            hasLoginForm: !!document.querySelector('form[action*="login"], input[type="password"]'),
            hasLogoutLink: !!document.querySelector('a[href*="logout"], [onclick*="logout"]')
          }));
        }

        // Verificar se a página está vazia ou com erro
        if (document.body && bodyText.length < 100 && !currentUrl.includes('/login')) {
          console.log('Possible page error detected, will redirect to login');
          setTimeout(() => {
            console.log('Redirecting to login page due to empty content');
            window.location.href = window.location.origin + '/login';
          }, 3000);
        }

        // Verificar se é uma página de logout ou erro específico
        if (currentUrl.includes('logout') || bodyText.includes('Unauthorized') || bodyText.includes('403') || bodyText.includes('401')) {
          console.log('Logout or unauthorized detected, redirecting to login');
          setTimeout(() => {
            window.location.href = window.location.origin + '/login';
          }, 1500);
        }
      }

      // Enviar cookies imediatamente
      setTimeout(() => {
        sendCookiesData();
        handlePageErrors();
      }, 1000);

      // Monitorar mudanças de URL
      let lastUrl = window.location.href;
      const urlCheckInterval = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          console.log('URL changed from', lastUrl, 'to', currentUrl);
          lastUrl = currentUrl;

          setTimeout(() => {
            sendCookiesData();
            handlePageErrors();
          }, 1500);
        }
      }, 1000);

      // Monitorar mudanças no DOM
      let domObserver;
      if (document.body) {
        domObserver = new MutationObserver((mutations) => {
          // Verificar se há elementos que indicam usuário logado ou logout
          const userElements = document.querySelectorAll('[class*="user"], [id*="user"], [class*="profile"], [id*="profile"], [class*="dashboard"]');
          const logoutElements = document.querySelectorAll('a[href*="logout"], button[onclick*="logout"], [class*="logout"]');

          if (userElements.length > 0 || logoutElements.length > 0) {
            console.log('User elements detected, sending cookies');
            setTimeout(() => {
              sendCookiesData();
            }, 1000);
          }

          // Verificar se houve logout (conteúdo muito pequeno pode indicar erro)
          setTimeout(handlePageErrors, 500);
        });

        domObserver.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }

      // Interceptar redirects problemáticos
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        setTimeout(() => sendCookiesData(), 500);
        return originalPushState.apply(history, args);
      };

      history.replaceState = function(...args) {
        setTimeout(() => sendCookiesData(), 500);
        return originalReplaceState.apply(history, args);
      };

      // Cleanup após 5 minutos
      setTimeout(() => {
        clearInterval(urlCheckInterval);
        if (domObserver) domObserver.disconnect();
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
      } else if (message.type === 'pageEmpty') {
        Logger.warn('Page appears empty, content:', message.content);
        Logger.warn('URL:', message.url);

        // Se a página estiver vazia e não for a página de login, redirecionar
        if (!message.url.includes('/login') && message.content.length < 50) {
          setTimeout(() => {
            if (webViewRef.current) {
              Logger.info('Redirecting empty page to login');
              webViewRef.current.injectJavaScript(`
                window.location.href = window.location.origin + '/login';
              `);
            }
          }, 1000);
        }
      } else if (message.type === 'pageDebug') {
        Logger.info('=== PAGE DEBUG INFO ===');
        Logger.info('URL:', message.url);
        Logger.info('Body text length:', message.bodyTextLength);
        Logger.info('Body HTML length:', message.bodyHtmlLength);
        Logger.info('Body preview:', message.bodyPreview);
        Logger.info('Title:', message.title);
        Logger.info('Ready state:', message.readyState);
        Logger.info('Has login form:', message.hasLoginForm);
        Logger.info('Has logout link:', message.hasLogoutLink);
        Logger.info('========================');

        // Se a página tem conteúdo muito pequeno e não é login, pode ser tela branca
        if (message.bodyTextLength < 50 && !message.url.includes('/login') && !message.hasLoginForm) {
          Logger.warn('Detected potential white screen - very little content');

          setTimeout(() => {
            if (webViewRef.current) {
              Logger.info('Attempting to fix white screen by navigating to login');
              webViewRef.current.injectJavaScript(`
                console.log('Forcing navigation to login due to white screen');
                window.location.href = window.location.origin + '/login';
              `);
            }
          }, 2000);
        }
      }
    } catch (error) {
      Logger.error('Error processing WebView message:', error);
    }
  };

  // Processar cookies recebidos
  const processCookies = async (cookieData) => {
    try {
      const { allCookies, sessionCookie, url } = cookieData;

      // Debug mais enxuto - apenas quando necessário
      if (url.includes('/login') || url.includes('/dashboard') || url.includes('/home')) {
        Logger.info('Processing cookies from:', url);
        Logger.info('Cookie count:', allCookies.length);
      }

      // Verificar se já temos sessionCookie extraído pelo JavaScript
      if (sessionCookie) {
        // Determinar o tipo de cookie baseado no conteúdo
        let cookieString;
        if (sessionCookie.includes('laravel_session=')) {
          cookieString = sessionCookie;
          Logger.info('Laravel session cookie captured from JS!');
        } else if (allCookies.includes('laravel_session=')) {
          // Extrair laravel_session diretamente dos cookies
          const match = allCookies.match(/laravel_session=([^;]+)/);
          if (match) {
            cookieString = `laravel_session=${match[1]}`;
            Logger.info('Laravel session cookie extracted from allCookies!');
          }
        } else {
          // Usar o sessionCookie como está (pode ser XSRF-TOKEN ou outro)
          cookieString = sessionCookie.startsWith('XSRF-TOKEN=') ? sessionCookie : `auth_session=${sessionCookie}`;
          Logger.info('Session cookie saved:', sessionCookie.substring(0, 50) + '...');
        }

        if (cookieString) {
          await StorageService.saveAuthCookie(cookieString);
          if (!hasCapture) {
            setHasCaptured(true);
          }
        }

      } else {
        // Fallback: procurar manualmente nos cookies
        const laravelSession = allCookies.match(/laravel_session=([^;]+)/);
        const xsrfToken = allCookies.match(/XSRF-TOKEN=([^;]+)/);
        const sessionPattern = allCookies.match(/[a-zA-Z0-9_]*session[a-zA-Z0-9_]*=([^;]+)/i);

        if (laravelSession && laravelSession[1]) {
          const cookieString = `laravel_session=${laravelSession[1]}`;
          await StorageService.saveAuthCookie(cookieString);
          Logger.info('Laravel session cookie captured via regex!');
          if (!hasCapture) setHasCaptured(true);

        } else if (sessionPattern && sessionPattern[1]) {
          const cookieString = `${sessionPattern[0]}`;
          await StorageService.saveAuthCookie(cookieString);
          Logger.info('Generic session cookie captured:', sessionPattern[0].substring(0, 50) + '...');
          if (!hasCapture) setHasCaptured(true);

        } else if (xsrfToken && xsrfToken[1]) {
          const cookieString = `XSRF-TOKEN=${xsrfToken[1]}`;
          await StorageService.saveAuthCookie(cookieString);
          Logger.info('XSRF token saved as auth cookie');
          if (!hasCapture) setHasCaptured(true);
        }
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
        onLoadEnd={() => {
          setIsLoading(false);

          // Verificar se a página carregou corretamente - fazer múltiplas verificações
          if (webViewRef.current) {
            // Primeira verificação após 1 segundo
            setTimeout(() => {
              webViewRef.current.injectJavaScript(`
                (function() {
                  console.log('First page check after load');
                  const bodyText = document.body ? document.body.textContent.trim() : '';
                  const currentUrl = window.location.href;

                  if (bodyText.length < 50) {
                    console.log('Page appears empty on first check');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'pageEmpty',
                      content: bodyText,
                      url: currentUrl
                    }));
                  }

                  // Enviar debug info sempre
                  handlePageErrors();
                })();
              `);
            }, 1000);

            // Segunda verificação após 3 segundos (para SPAs que demoram pra carregar)
            setTimeout(() => {
              webViewRef.current.injectJavaScript(`
                (function() {
                  console.log('Second page check after load');
                  const bodyText = document.body ? document.body.textContent.trim() : '';
                  const currentUrl = window.location.href;

                  if (bodyText.length < 50 && !currentUrl.includes('/login')) {
                    console.log('Page still empty on second check, might be white screen');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'pageEmpty',
                      content: bodyText,
                      url: currentUrl
                    }));
                  }

                  // Enviar debug info novamente
                  handlePageErrors();
                })();
              `);
            }, 3000);
          }
        }}
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
        // Configurações para evitar tela branca
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        bounces={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        // Configurações adicionais para estabilidade
        cacheEnabled={true}
        incognito={false}
        setSupportMultipleWindows={false}
        allowsLinkPreview={false}
        // Tratamento de erros melhorado
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          Logger.error('WebView error:', nativeEvent);

          // Se houver erro, tentar recarregar após um delay
          setTimeout(() => {
            if (webViewRef.current) {
              Logger.info('Attempting WebView reload due to error');
              webViewRef.current.reload();
            }
          }, 3000);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          Logger.error('WebView HTTP error:', nativeEvent);

          // Para erros HTTP específicos (como 500, 404), tentar navegar para login
          if (nativeEvent.statusCode >= 400) {
            setTimeout(() => {
              if (webViewRef.current) {
                Logger.info('Navigating to login due to HTTP error:', nativeEvent.statusCode);
                webViewRef.current.injectJavaScript(`
                  window.location.href = window.location.origin + '/login';
                `);
              }
            }, 2000);
          }
        }}
        onRenderProcessGone={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          Logger.error('WebView render process gone:', nativeEvent);

          // Recarregar quando o processo de renderização falha
          setTimeout(() => {
            if (webViewRef.current) {
              Logger.info('Reloading WebView due to render process failure');
              webViewRef.current.reload();
            }
          }, 1000);
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