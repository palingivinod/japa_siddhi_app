import AsyncStorage from '@react-native-async-storage/async-storage';
import {Linking, NativeModules, Platform} from 'react-native';

const FIRST_INTRO_KEY = 'intro_video_seen_v1';

export type IntroVideoItem = {
  id: string;
  /** i18n key for title */
  titleKey: 'introVideo1Title' | 'introVideo2Title';
  /** i18n key for short description */
  subtitleKey: 'introVideo1Sub' | 'introVideo2Sub';
  /** Replace with real CDN / bundled URLs later */
  url: string;
};

/**
 * Intro videos hosted on Render (public /uploads — no Google/Microsoft login).
 */
export const INTRO_VIDEOS: IntroVideoItem[] = [
  {
    id: 'intro1',
    titleKey: 'introVideo1Title',
    subtitleKey: 'introVideo1Sub',
    // Why Japa Siddhi App
    url: 'https://japasiddhi.onrender.com/uploads/videos/why-japa-siddhi.mp4',
  },
  {
    id: 'intro2',
    titleKey: 'introVideo2Title',
    subtitleKey: 'introVideo2Sub',
    // App introduction
    url: 'https://japasiddhi.onrender.com/uploads/videos/app-introduction.mp4',
  },
];

/** Video shown once after first signup/login. */
export const FIRST_LOGIN_INTRO_VIDEO = INTRO_VIDEOS[0];

type IntroVideoNative = {
  play: (url: string) => Promise<boolean>;
};

const getNative = (): IntroVideoNative | undefined => {
  if (Platform.OS !== 'android') {
    return undefined;
  }
  return NativeModules.IntroVideo as IntroVideoNative | undefined;
};

export const playIntroVideo = async (url: string) => {
  const native = getNative();
  if (native?.play) {
    try {
      await native.play(url);
      return true;
    } catch {
      // fall through to Linking
    }
  }
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
};

export const hasSeenFirstIntroVideo = async () => {
  try {
    return (await AsyncStorage.getItem(FIRST_INTRO_KEY)) === '1';
  } catch {
    return false;
  }
};

export const markFirstIntroVideoSeen = async () => {
  try {
    await AsyncStorage.setItem(FIRST_INTRO_KEY, '1');
  } catch {
    // ignore
  }
};

/** @deprecated Auto intro after auth removed — home "Why Japa Siddhi" only. */
export const homeOrFirstIntroRoute = async (): Promise<{name: 'Home'}> => ({
  name: 'Home',
});
