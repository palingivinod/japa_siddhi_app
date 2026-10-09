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

enableScreens();

// Must run before the React tree mounts so FCM can wake a backgrounded app.
registerBackgroundHandler();

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    await openFromPushMessage({
      data: detail?.notification?.data,
      notification: {
        title: detail?.notification?.title,
        body: detail?.notification?.body,
      },
    });
  }
});

AppRegistry.registerComponent(appName, () => App);
