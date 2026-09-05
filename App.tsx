import React from 'react';
import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import {LanguageProvider} from './src/i18n/LanguageContext';
import {store} from './src/redux/store';

export default function App() {
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
