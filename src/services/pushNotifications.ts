import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import notifee, {AndroidImportance} from '@notifee/react-native';
import {AppState, PermissionsAndroid, Platform} from 'react-native';

import apiService from './apiService';
import {getToken} from './session';

let started = false;
let channelReady = false;
let lastUploadedToken = '';
let unsubscribeRefresh: (() => void) | null = null;
let unsubscribeForeground: (() => void) | null = null;

const CHANNEL_ID = 'fcm_fallback_notification_channel';

const sleep = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(() => resolve(), ms);
  });

const ensureAndroidChannel = async () => {
  if (channelReady || Platform.OS !== 'android') {
    return;
  }
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Japa Siddhi Alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  channelReady = true;
};

/**
 * Show a system tray / banner popup even while the app is open.
 */
export const displayForegroundNotification = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  const title =
    String(
      remoteMessage.notification?.title ||
        remoteMessage.data?.title ||
        'Japa Siddhi',
    ).trim() || 'Japa Siddhi';
  const body =
    String(
      remoteMessage.notification?.body ||
        remoteMessage.data?.body ||
        remoteMessage.data?.message ||
        '',
    ).trim() || 'You have a new notification.';

  await ensureAndroidChannel();

  await notifee.displayNotification({
    title,
    body,
    data: Object.fromEntries(
      Object.entries(remoteMessage.data || {}).map(([key, value]) => [
        key,
        String(value ?? ''),
      ]),
    ),
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: {id: 'default'},
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        banner: true,
        list: true,
        sound: true,
        badge: true,
      },
    },
  });
};

const requestPermission = async () => {
  if (Platform.OS === 'ios') {
    try {
      await messaging().registerDeviceForRemoteMessages();
    } catch {
      // Already registered, or running on simulator without push support.
    }
    const status = await messaging().requestPermission({
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    });
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
};

const uploadToken = async (fcmToken: string) => {
  const sessionToken = await getToken();
  if (!sessionToken || !fcmToken) {
    return;
  }
  if (fcmToken === lastUploadedToken) {
    return;
  }

  try {
    await apiService.put('/profile/push-token', {
      fcmToken,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
    lastUploadedToken = fcmToken;
  } catch {
    // Stay silent — a failed upload must never block the devotee.
  }
};

const registerCurrentToken = async () => {
  const allowed = await requestPermission();
  if (!allowed) {
    return;
  }

  await ensureAndroidChannel();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        await uploadToken(fcmToken);
        return;
      }
    } catch {
      // retry
    }
    await sleep(800 * (attempt + 1));
  }
};

export const startPushNotifications = async () => {
  if (started) {
    await registerCurrentToken();
    return;
  }
  started = true;

  try {
    await messaging().setAutoInitEnabled(true);
  } catch {
    // Older native builds may not expose this.
  }

  unsubscribeRefresh = messaging().onTokenRefresh(token => {
    uploadToken(token).catch(() => undefined);
  });

  unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    try {
      await displayForegroundNotification(remoteMessage);
    } catch (error) {
      console.warn('Foreground notification display failed:', error);
    }
  });

  await registerCurrentToken();
};

export const refreshPushRegistration = async () => {
  const sessionToken = await getToken();
  if (!sessionToken) {
    return;
  }
  await registerCurrentToken();
};

export const stopPushNotifications = () => {
  unsubscribeRefresh?.();
  unsubscribeForeground?.();
  unsubscribeRefresh = null;
  unsubscribeForeground = null;
  started = false;
  lastUploadedToken = '';
};

export const registerBackgroundHandler = () => {
  try {
    messaging().setBackgroundMessageHandler(async () => {
      // Notification+data messages are displayed by the OS.
    });
  } catch {
    // Native module unavailable in some test environments.
  }
};

export const bindPushToAppLifecycle = () => {
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') {
      refreshPushRegistration().catch(() => undefined);
    }
  });
  return () => subscription.remove();
};
