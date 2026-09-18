/**
 * @format
 */

import './src/theme/patchIndicText';
import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/services/pushNotifications';

enableScreens();

// Must run before the React tree mounts so FCM can wake a backgrounded app.
registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
