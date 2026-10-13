import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';

const STORAGE_KEY = 'chant_beep_on';
const BEEP_ASSET = require('../assets/images/sounds/beep_sound.mp3');

let beep: Sound | null = null;
let loading = false;
let ready = false;
let enabled = true;
let settingsLoaded = false;

Sound.setCategory('Ambient', true);

const loadSettings = async () => {
  if (settingsLoaded) {
    return;
  }
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    // Default on when unset.
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

/** Preload so the first tap is not delayed. */
export const preloadChantBeep = () => {
  void loadSettings();
  if (beep || loading) {
    return;
  }
  loading = true;
  beep = new Sound(BEEP_ASSET, error => {
    loading = false;
    if (error) {
      beep = null;
      ready = false;
      return;
    }
    ready = true;
    beep?.setVolume(0.85);
  });
};

/** Play the chant click sound (non-blocking). */
export const playChantBeep = () => {
  void loadSettings();
  if (!enabled) {
    return;
  }
  if (!beep || !ready) {
    preloadChantBeep();
    // Retry shortly if still loading.
    setTimeout(() => {
      if (!enabled || !beep || !ready) {
        return;
      }
      try {
        beep.setCurrentTime(0);
        beep.play();
      } catch {
        // Ignore playback errors so counting never stalls.
      }
    }, 40);
    return;
  }
  try {
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
      beep.setCurrentTime(0);
      beep.play();
    } catch {
      // ignore
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
