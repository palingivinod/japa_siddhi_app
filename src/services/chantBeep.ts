import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

const STORAGE_KEY = 'chant_beep_on';

type SoundInstance = {
  setVolume: (v: number) => void;
  setCurrentTime: (t: number) => void;
  play: (cb?: (success: boolean) => void) => void;
  stop: (cb?: () => void) => void;
  release: () => void;
};

type SoundCtor = {
  setCategory?: (category: string, mixWithOthers?: boolean) => void;
  MAIN_BUNDLE?: string;
  new (
    filename: any,
    basePathOrCallback?: any,
    callback?: (error: any) => void,
  ): SoundInstance;
};

let SoundClass: SoundCtor | null = null;
let soundResolved = false;
let beep: SoundInstance | null = null;
let loading = false;
let ready = false;
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

export const setChantBeepEnabled = async (on: boolean) => {
  enabled = on;
  settingsLoaded = true;
  await AsyncStorage.setItem(STORAGE_KEY, on ? '1' : '0');
};

export const getChantBeepEnabled = async () => {
  await loadSettings();
  return enabled;
};

/**
 * Lazy-load react-native-sound. A top-level import crashes when the native
 * module is missing from the APK (JS added, native not rebuilt).
 */
const resolveSoundClass = (): SoundCtor | null => {
  if (soundResolved) {
    return SoundClass;
  }
  soundResolved = true;
  try {
    const mod = require('react-native-sound');
    const Sound = (mod?.default ?? mod) as SoundCtor;
    if (!Sound || typeof Sound !== 'function') {
      SoundClass = null;
      return null;
    }
    try {
      Sound.setCategory?.('Ambient', true);
    } catch {
      // optional
    }
    SoundClass = Sound;
    return SoundClass;
  } catch (err) {
    console.warn('[chantBeep] sound module unavailable', err);
    SoundClass = null;
    return null;
  }
};

const markReady = (instance: SoundInstance) => {
  loading = false;
  beep = instance;
  ready = true;
  try {
    instance.setVolume(0.85);
  } catch {
    // ignore
  }
};

const markFailed = () => {
  loading = false;
  beep = null;
  ready = false;
};

/** Preload beep. Never throws — missing native sound is a silent no-op. */
export const preloadChantBeep = () => {
  void loadSettings();
  if (beep || loading || ready) {
    return;
  }
  const Sound = resolveSoundClass();
  if (!Sound) {
    return;
  }
  loading = true;
  try {
    const tryAssetFallback = () => {
      try {
        const asset = require('../assets/images/sounds/beep_sound.mp3');
        const fallback = new Sound(asset, (assetError: any) => {
          if (assetError) {
            markFailed();
            return;
          }
          markReady(fallback);
        });
        beep = fallback;
      } catch (err) {
        console.warn('[chantBeep] asset fallback failed', err);
        markFailed();
      }
    };

    if (Platform.OS === 'android') {
      // res/raw/beep_sound.mp3
      const instance = new Sound('beep_sound', (error: any) => {
        if (error) {
          tryAssetFallback();
          return;
        }
        markReady(instance);
      });
      beep = instance;
      return;
    }

    const instance = new Sound(
      'beep_sound.mp3',
      Sound.MAIN_BUNDLE ?? '',
      (error: any) => {
        if (error) {
          tryAssetFallback();
          return;
        }
        markReady(instance);
      },
    );
    beep = instance;
  } catch (err) {
    console.warn('[chantBeep] preload failed', err);
    markFailed();
  }
};

/** Play the chant click sound (never throws). */
export const playChantBeep = () => {
  void loadSettings();
  if (!enabled) {
    return;
  }
  try {
    if (!beep || !ready) {
      preloadChantBeep();
      return;
    }
    beep.stop(() => {
      try {
        beep?.setCurrentTime(0);
        beep?.play();
      } catch {
        // ignore
      }
    });
  } catch {
    try {
      beep?.setCurrentTime(0);
      beep?.play();
    } catch {
      // ignore — counting must never crash
    }
  }
};

export const releaseChantBeep = () => {
  try {
    beep?.release();
  } catch {
    // ignore
  }
  beep = null;
  ready = false;
  loading = false;
};
