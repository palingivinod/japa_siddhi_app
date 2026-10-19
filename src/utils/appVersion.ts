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
