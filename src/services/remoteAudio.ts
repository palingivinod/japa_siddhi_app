import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

type RemoteAudioNative = {
  play: (url: string) => Promise<boolean>;
  pause: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  isPlaying: () => Promise<boolean>;
};

export type RemoteAudioProgress = {
  url?: string;
  positionMs?: number;
  durationMs?: number;
  playing?: boolean;
  completed?: boolean;
};

const getNative = (): RemoteAudioNative | undefined => {
  if (Platform.OS !== 'android') {
    return undefined;
  }
  return NativeModules.RemoteAudio as RemoteAudioNative | undefined;
};

export const playRemoteAudio = async (url: string) => {
  const native = getNative();
  if (!native?.play) {
    return false;
  }
  try {
    await native.play(url);
    return true;
  } catch {
    return false;
  }
};

export const pauseRemoteAudio = async () => {
  const native = getNative();
  if (!native?.pause) {
    return false;
  }
  try {
    await native.pause();
    return true;
  } catch {
    return false;
  }
};

export const stopRemoteAudio = async () => {
  const native = getNative();
  if (!native?.stop) {
    return false;
  }
  try {
    await native.stop();
    return true;
  } catch {
    return false;
  }
};

export const subscribeRemoteAudioProgress = (
  listener: (event: RemoteAudioProgress) => void,
) => {
  if (Platform.OS !== 'android' || !NativeModules.RemoteAudio) {
    return () => undefined;
  }
  const emitter = new NativeEventEmitter(NativeModules.RemoteAudio);
  const sub = emitter.addListener('RemoteAudioProgress', listener);
  return () => sub.remove();
};
