import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';

const STORAGE_KEY = 'chant_beep_on';

type ChantBeepNative = {
  preload: () => void;
  play: () => void;
  release: () => void;
};

const NativeBeep: ChantBeepNative | undefined =
  Platform.OS === 'android'
    ? (NativeModules.ChantBeep as ChantBeepNative | undefined)
    : undefined;

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

// Warm settings once at import (async, non-blocking).
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

/** Preload SoundPool sample (Android). Safe no-op if native module missing. */
export const preloadChantBeep = () => {
  void loadSettings();
  try {
    NativeBeep?.preload?.();
  } catch {
    // ignore
  }
};

/** Play beep instantly — never blocks the JS count path. */
export const playChantBeep = () => {
  if (!enabled) {
    return;
  }
  try {
    NativeBeep?.play?.();
  } catch {
    // ignore — counting must never wait on audio
  }
};

export const releaseChantBeep = () => {
  try {
    NativeBeep?.release?.();
  } catch {
    // ignore
  }
};
