/**
 * @format
 */

import './src/theme/patchIndicText';
import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/services/pushNotifications';
import { openFromPushMessage } from './src/navigation/notificationDeepLink';

try {
  enableScreens();
} catch (e) {
  console.warn('[boot] enableScreens failed', e);
}

// Must run before the React tree mounts so FCM can wake a backgrounded app.
try {
  registerBackgroundHandler();
} catch (e) {
  console.warn('[boot] registerBackgroundHandler failed', e);
}

try {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
      try {
        await openFromPushMessage({
          data: detail?.notification?.data,
          notification: {
            title: detail?.notification?.title,
            body: detail?.notification?.body,
          },
        });
      } catch (err) {
        console.warn('[boot] openFromPushMessage failed', err);
      }
    }
  });
} catch (e) {
  console.warn('[boot] notifee.onBackgroundEvent failed', e);
}

AppRegistry.registerComponent(appName, () => App);
