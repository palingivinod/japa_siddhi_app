import {NativeModules, Platform} from 'react-native';

import ENV from '../env';
import {APP_VERSION} from '../constants/app';

type AppInfoNative = {
  versionName?: string;
  versionCode?: number;
};

/**
 * Installed app version from Android BuildConfig.VERSION_NAME.
 * Falls back to ENV / constants only if native module is missing.
 */
export const getAppVersionName = (): string => {
  if (Platform.OS === 'android') {
    const info = NativeModules.AppInfo as AppInfoNative | undefined;
    const name = String(info?.versionName || '').trim();
    if (name) {
      return name;
    }
  }
  return String(ENV.VERSION || APP_VERSION || '').trim() || '—';
};

/** True when the installed version is older than the published release. */
export const isUpdateAvailable = (installed: string, latest: string) => {
  const parts = (value: string) =>
    String(value || '')
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map(part => Number(part) || 0);
  const current = parts(installed);
  const published = parts(latest);
  if (!current.length || !published.length) {
    return false;
  }
  const length = Math.max(current.length, published.length);
  for (let index = 0; index < length; index += 1) {
    const have = current[index] || 0;
    const need = published[index] || 0;
    if (have < need) {
      return true;
    }
    if (have > need) {
      return false;
    }
  }
  return false;
};
