import React, {useEffect} from 'react';
import {AppState} from 'react-native';
import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import {LanguageProvider} from './src/i18n/LanguageContext';
import {store} from './src/redux/store';
import {ensureFreshToken} from './src/services/authRefresh';
import {
  bindPushToAppLifecycle,
  startPushNotifications,
} from './src/services/pushNotifications';
import {getToken, hydrateSession, setTokenListener} from './src/services/session';

export default function App() {
  // Roll the token forward on launch and on every return to the foreground so
  // an active devotee is never signed out on their own. Also register the FCM
  // device token whenever a JWT is present so admin broadcasts can pop up.
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        await hydrateSession();
      } catch {
        // ignore
      }
      await ensureFreshToken().catch(() => undefined);
      if (cancelled) {
        return;
      }
      const token = await getToken();
      if (token) {
        await startPushNotifications().catch(() => undefined);
      }
    };

    boot();

    // Login / signup save a JWT after the app has already mounted, so listen
    // for that and register FCM immediately instead of waiting for a restart.
    const unsubToken = setTokenListener(token => {
      if (token) {
        startPushNotifications().catch(() => undefined);
      }
    });

    const authSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        ensureFreshToken().catch(() => undefined);
      }
    });
    const pushUnbind = bindPushToAppLifecycle();

    return () => {
      cancelled = true;
      unsubToken();
      authSub.remove();
      pushUnbind();
    };
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AppNavigator />
        </LanguageProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
