import React, {useEffect} from 'react';
import {AppState} from 'react-native';
import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import {LanguageProvider} from './src/i18n/LanguageContext';
import {store} from './src/redux/store';
import {ensureFreshToken} from './src/services/authRefresh';

export default function App() {
  // Roll the token forward on launch and on every return to the foreground so
  // an active devotee is never signed out on their own.
  useEffect(() => {
    ensureFreshToken().catch(() => undefined);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        ensureFreshToken().catch(() => undefined);
      }
    });
    return () => subscription.remove();
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
