import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert, AppState, NativeModules, Platform} from 'react-native';

const PROMPT_KEY = 'chant_quiet_mode_prompted';

type ChantQuietModeNative = {
  isSupported: () => Promise<boolean>;
  hasAccess: () => Promise<boolean>;
  openAccessSettings: () => Promise<boolean>;
  enableQuietMode: () => Promise<boolean>;
  disableQuietMode: () => Promise<boolean>;
};

const getNative = (): ChantQuietModeNative | undefined => {
  if (Platform.OS !== 'android') {
    return undefined;
  }
  return NativeModules.ChantQuietMode as ChantQuietModeNative | undefined;
};

let appStateSub: {remove: () => void} | null = null;
let quietActive = false;
/** True while chant screen wants quiet mode (even if temporarily disabled in background). */
let wantQuiet = false;

const safeCall = async <T>(
  fn: (() => Promise<T>) | undefined,
  fallback: T,
): Promise<T> => {
  try {
    if (!fn) {
      return fallback;
    }
    return await fn();
  } catch {
    return fallback;
  }
};

export const isChantQuietModeSupported = async () => {
  if (Platform.OS !== 'android') {
    return false;
  }
  return safeCall(() => getNative()?.isSupported(), false);
};

export const hasChantQuietModeAccess = async () => {
  return safeCall(() => getNative()?.hasAccess(), false);
};

export const openChantQuietModeSettings = async () => {
  return safeCall(() => getNative()?.openAccessSettings(), false);
};

export const enableChantQuietMode = async () => {
  const ok = await safeCall(() => getNative()?.enableQuietMode(), false);
  quietActive = ok;
  return ok;
};

export const disableChantQuietMode = async () => {
  quietActive = false;
  return safeCall(() => getNative()?.disableQuietMode(), false);
};

/**
 * Start quiet mode for the chant screen.
 * Asks once for Do Not Disturb access if needed.
 */
export const startChantQuietMode = async (t?: (key: string) => string) => {
  if (Platform.OS !== 'android') {
    return;
  }
  const native = getNative();
  if (!native) {
    return;
  }
  const supported = await safeCall(() => native.isSupported(), false);
  if (!supported) {
    return;
  }

  const hasAccess = await safeCall(() => native.hasAccess(), false);
  if (!hasAccess) {
    let prompted = false;
    try {
      prompted = (await AsyncStorage.getItem(PROMPT_KEY)) === '1';
    } catch {
      prompted = false;
    }
    if (!prompted) {
      try {
        await AsyncStorage.setItem(PROMPT_KEY, '1');
      } catch {
        // ignore
      }
      Alert.alert(
        t?.('chantQuietModeTitle') || 'Peaceful chanting',
        t?.('chantQuietModeMsg') ||
          'Allow Do Not Disturb access so notifications are muted while you chant. They will return when you leave this screen.',
        [
          {
            text: t?.('cancel') || 'Cancel',
            style: 'cancel',
          },
          {
            text: t?.('allow') || 'Allow',
            onPress: () => {
              void openChantQuietModeSettings();
            },
          },
        ],
      );
    }
    return;
  }

  wantQuiet = true;
  await enableChantQuietMode();

  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        void disableChantQuietMode();
      } else if (wantQuiet) {
        void enableChantQuietMode();
      }
    });
  }
};

export const stopChantQuietMode = async () => {
  wantQuiet = false;
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  await disableChantQuietMode();
};
