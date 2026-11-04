import {NativeModules, Platform} from 'react-native';
import notifee from '@notifee/react-native';
import apiService from './apiService';
import {getToken} from './session';

const {JapaBadge} = NativeModules;

/**
 * Sets the badge number on the mobile app's launcher icon (Vivo, Samsung, Xiaomi, iPhone, Oppo, etc.)
 */
export const setAppBadgeCount = async (count: number): Promise<void> => {
  const safeCount = Math.max(0, Math.round(Number(count) || 0));

  // 1. Native ShortcutBadger for OEM Android launchers (Vivo, Xiaomi, Samsung, Oppo, Realme, etc.)
  try {
    if (JapaBadge && typeof JapaBadge.setBadgeCount === 'function') {
      await JapaBadge.setBadgeCount(safeCount);
    }
  } catch {
    // Ignore native module error
  }

  // 2. Notifee for standard Android notification dots and iOS icon badges
  try {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(safeCount);
    }
  } catch {
    // Ignore Notifee error
  }
};

/**
 * Clears the badge number on the app launcher icon
 */
export const clearAppBadge = async (): Promise<void> => {
  try {
    if (JapaBadge && typeof JapaBadge.clearBadge === 'function') {
      await JapaBadge.clearBadge();
    }
  } catch {
    // ignore
  }

  try {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(0);
    }
  } catch {
    // ignore
  }
};

/**
 * Queries the server for current unread notification count and updates the app icon badge.
 * Falls back to GET /notifications if the unread-count endpoint fails or returns non-numeric.
 */
export const syncAppBadgeWithServer = async (): Promise<number> => {
  try {
    const sessionToken = await getToken();
    if (!sessionToken) {
      await clearAppBadge();
      return 0;
    }

    let unreadCount: number | null = null;

    // 1. Try dedicated unread-count endpoint
    try {
      const res = await apiService.get('/notifications/unread-count');
      const payload = res.data?.data ?? res.data ?? {};
      const rawCount =
        payload.unreadCount ??
        payload.count ??
        payload.unread ??
        res.data?.unreadCount ??
        res.data?.count;

      if (rawCount !== undefined && rawCount !== null && !Number.isNaN(Number(rawCount))) {
        unreadCount = Math.max(0, Math.round(Number(rawCount)));
      }
    } catch {
      // Endpoint may fail or not be reachable, fall through to fallback
    }

    // 2. Fallback: query full notification list and compute unread items directly
    if (unreadCount === null) {
      try {
        const listRes = await apiService.get('/notifications');
        const list = Array.isArray(listRes.data?.data)
          ? listRes.data.data
          : Array.isArray(listRes.data)
          ? listRes.data
          : [];
        unreadCount = list.filter((item: any) => !item.isRead).length;
      } catch {
        unreadCount = 0;
      }
    }

    const finalCount = unreadCount ?? 0;
    await setAppBadgeCount(finalCount);
    return finalCount;
  } catch {
    return 0;
  }
};
