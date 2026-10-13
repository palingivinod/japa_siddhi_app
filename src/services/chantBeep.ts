import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';

const STORAGE_KEY = 'chant_beep_on';

type ChantBeepNative = {
  preload: () => void;
  play: () => void;
  release: () => void;
};

/** Resolve on each call — NativeModules can be empty at first import. */
const getNativeBeep = (): ChantBeepNative | undefined => {
  if (Platform.OS !== 'android') {
    return undefined;
  }
  return NativeModules.ChantBeep as ChantBeepNative | undefined;
};

let enabled = true;
let settingsLoaded = false;

const loadSettings = async () => {
  if (settingsLoaded) {
    return;
  }
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    enabled = value !== '0';
  } catch {
    enabled = true;
  } finally {
    settingsLoaded = true;
  }
};

void loadSettings();

export const setChantBeepEnabled = async (on: boolean) => {
  enabled = on;
  settingsLoaded = true;
  await AsyncStorage.setItem(STORAGE_KEY, on ? '1' : '0');
};

export const getChantBeepEnabled = async () => {
  await loadSettings();
  return enabled;
};

export const preloadChantBeep = () => {
  void loadSettings();
  try {
    getNativeBeep()?.preload?.();
  } catch {
    // ignore
  }
};

/** Play beep — never blocks counting. */
export const playChantBeep = () => {
  if (!enabled) {
    return;
  }
  try {
    const native = getNativeBeep();
    if (!native?.play) {
      if (__DEV__) {
        console.warn('[chantBeep] NativeModules.ChantBeep missing — rebuild APK');
      }
      return;
    }
    native.play();
  } catch {
    // ignore
  }
};

export const releaseChantBeep = () => {
  try {
    getNativeBeep()?.release?.();
  } catch {
    // ignore
  }
};
