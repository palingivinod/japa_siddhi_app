import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';
import {AppState, PermissionsAndroid, Platform} from 'react-native';

import apiService from './apiService';
import {getToken} from './session';
import {navigateToNotifications} from '../navigation/navigationRef';

let started = false;
let channelReady = false;
let lastUploadedToken = '';
let unsubscribeRefresh: (() => void) | null = null;
let unsubscribeForeground: (() => void) | null = null;
let unsubscribeNotifee: (() => void) | null = null;
let unsubscribeFcmOpened: (() => void) | null = null;

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
 * Check if the current time is within allowed notification hours (7:00 AM to 10:00 PM IST).
 * Outside 7 AM - 10 PM Indian Standard Time, notifications are suppressed.
 */
export const isWithinNotificationHoursIST = (): boolean => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hourCycle: 'h23',
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    return hour >= 7 && hour < 22;
  } catch {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const istMinutes = utcHours * 60 + utcMinutes + 330;
    const istHour = Math.floor((istMinutes / 60) % 24);
    return istHour >= 7 && istHour < 22;
  }
};

/**
 * Show a system tray / banner popup (7 AM - 10 PM IST only).
 * Uses full-bleed brand largeIcon so OEMs don't pad a tiny logo in a white circle.
 */
export const displayForegroundNotification = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  if (!isWithinNotificationHoursIST()) {
    return;
  }

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
      smallIcon: 'ic_notification',
      largeIcon: require('../assets/images/logo.png'),
      circularLargeIcon: true,
      color: '#C17A2F',
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
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

  // When notification is pressed in foreground / background via Notifee
  unsubscribeNotifee = notifee.onForegroundEvent(({type, detail}) => {
    if (type === EventType.PRESS) {
      const nid =
        detail?.notification?.data?.notificationId ||
        detail?.notification?.data?.id ||
        detail?.notification?.id;
      navigateToNotifications(nid ? String(nid) : undefined);
    }
  });

  // When app is in background and opened by pressing an FCM notification
  unsubscribeFcmOpened = messaging().onNotificationOpenedApp(remoteMessage => {
    const nid =
      remoteMessage?.data?.notificationId ||
      remoteMessage?.data?.id;
    navigateToNotifications(nid ? String(nid) : undefined);
  });

  // Check if app was opened from quit state by clicking an FCM notification
  messaging().getInitialNotification().then(remoteMessage => {
    if (remoteMessage) {
      const nid =
        remoteMessage?.data?.notificationId ||
        remoteMessage?.data?.id;
      navigateToNotifications(nid ? String(nid) : undefined);
    }
  }).catch(() => undefined);

  // Check if app was opened from quit state by clicking a Notifee notification
  notifee.getInitialNotification().then(initialNotification => {
    if (initialNotification) {
      const nid =
        initialNotification?.notification?.data?.notificationId ||
        initialNotification?.notification?.data?.id ||
        initialNotification?.notification?.id;
      navigateToNotifications(nid ? String(nid) : undefined);
    }
  }).catch(() => undefined);

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
  unsubscribeNotifee?.();
  unsubscribeFcmOpened?.();
  unsubscribeRefresh = null;
  unsubscribeForeground = null;
  unsubscribeNotifee = null;
  unsubscribeFcmOpened = null;
  started = false;
  lastUploadedToken = '';
};

export const registerBackgroundHandler = () => {
  try {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      // Native JapaFirebaseMessagingService usually posts the tray with largeIcon.
      // Fallback: Notifee with logo.png if native did not run.
      if (remoteMessage?.notification) {
        return;
      }
      try {
        await displayForegroundNotification(remoteMessage);
      } catch (error) {
        console.warn('Background notification display failed:', error);
      }
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
