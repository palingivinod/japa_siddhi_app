import messaging from '@react-native-firebase/messaging';
import {AppState, PermissionsAndroid, Platform} from 'react-native';

import apiService from './apiService';
import {getToken} from './session';

let started = false;
let lastUploadedToken = '';
let unsubscribeRefresh: (() => void) | null = null;
let unsubscribeForeground: (() => void) | null = null;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ask the OS for notification permission. Android 13+ needs an explicit
 * POST_NOTIFICATIONS grant; iOS uses the Firebase messaging prompt.
 */
const requestPermission = async () => {
  if (Platform.OS === 'ios') {
    // iOS will not return an FCM token until the device is registered for APNs.
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
    // Stay silent — a failed upload must never block the devotee. The next
    // foreground / token refresh will try again.
  }
};

const registerCurrentToken = async () => {
  const allowed = await requestPermission();
  if (!allowed) {
    return;
  }

  // On a cold start FCM can briefly return null before Play Services is ready.
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

/**
 * Call once the devotee has a JWT. Safe to call repeatedly — listeners are
 * attached only the first time. Works the same for debug APKs, Play Store,
 * and App Store builds once Firebase (and APNs on iOS) are configured.
 */
export const startPushNotifications = async () => {
  if (started) {
    await registerCurrentToken();
    return;
  }
  started = true;

  try {
    await messaging().setAutoInitEnabled(true);
  } catch {
    // Older native builds may not expose this; registration still proceeds.
  }

  unsubscribeRefresh = messaging().onTokenRefresh(token => {
    uploadToken(token).catch(() => undefined);
  });

  // Keep the listener registered so iOS continues delivering. Foreground
  // banners are shown by AppDelegate (UNUserNotificationCenter). Background /
  // killed-state use the FCM notification payload. In-app list still comes
  // from the API row.
  unsubscribeForeground = messaging().onMessage(async () => {
    // no-op
  });

  await registerCurrentToken();
};

/** Re-register when the app returns to the foreground with a live session. */
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

/**
 * Must be registered from index.js (outside React) so Android can wake the
 * JS runtime for a data message while the app is backgrounded.
 */
export const registerBackgroundHandler = () => {
  try {
    messaging().setBackgroundMessageHandler(async () => {
      // Notification+data messages are displayed by the OS; nothing to do here.
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
