import {NativeModules} from 'react-native';
import notifee from '@notifee/react-native';
import apiService from './apiService';

const {JapaBadge} = NativeModules;

/**
 * Sets the badge number on the mobile app's launcher icon (Vivo, Samsung, Xiaomi, iPhone, etc.)
 */
export const setAppBadgeCount = async (count: number): Promise<void> => {
  const safeCount = Math.max(0, Math.round(Number(count) || 0));

  // 1. Native ShortcutBadger for OEM Android launchers (Vivo, Xiaomi, Samsung, Oppo, etc.)
  try {
    if (JapaBadge && typeof JapaBadge.setBadgeCount === 'function') {
      await JapaBadge.setBadgeCount(safeCount);
    }
  } catch {
    // Ignore native module error
  }

  // 2. Notifee for standard Android notification dots and iOS icon badges
  try {
    await notifee.setBadgeCount(safeCount);
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
    await notifee.setBadgeCount(0);
  } catch {
    // ignore
  }
};

/**
 * Queries the server for current unread notification count and updates the app icon badge
 */
export const syncAppBadgeWithServer = async (): Promise<number> => {
  try {
    const res = await apiService.get('/notifications/unread-count');
    const count = Number(res.data?.data?.unreadCount ?? res.data?.unreadCount ?? 0);
    await setAppBadgeCount(count);
    return count;
  } catch {
    return 0;
  }
};

