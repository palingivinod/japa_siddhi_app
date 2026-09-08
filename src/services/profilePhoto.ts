import {Alert, NativeModules} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraOptions,
  type ImageLibraryOptions,
} from 'react-native-image-picker';

import ENV from '../env';

export type PickedPhoto = {
  uri: string;
  type: string;
  fileName: string;
};

const SHARED_OPTIONS: ImageLibraryOptions & CameraOptions = {
  mediaType: 'photo',
  quality: 0.7,
  maxWidth: 800,
  maxHeight: 800,
  includeBase64: false,
  selectionLimit: 1,
  saveToPhotos: false,
  cameraType: 'front',
};

const fromAsset = (asset?: Asset | null): PickedPhoto | null => {
  if (!asset?.uri) {
    return null;
  }
  const type = asset.type || 'image/jpeg';
  const ext = type.includes('png')
    ? 'png'
    : type.includes('webp')
      ? 'webp'
      : 'jpg';
  return {
    uri: asset.uri,
    type,
    fileName: asset.fileName || `profile.${ext}`,
  };
};

const assertPickerReady = () => {
  if (NativeModules.ImagePicker) {
    return;
  }
  throw new Error('native_module_missing');
};

export const isRemotePhoto = (uri?: string | null) =>
  !!uri && /^(https?:\/\/|\/uploads\/)/i.test(uri.trim());

export const resolveMediaUrl = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const uri = String(value).trim();
  if (!uri) {
    return null;
  }
  if (/^(https?:\/\/|file:\/\/|content:\/\/|data:)/i.test(uri)) {
    return uri;
  }
  const origin = ENV.API_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${uri.startsWith('/') ? uri : `/${uri}`}`;
};

export const pickProfilePhoto = (labels: {
  title: string;
  camera: string;
  gallery: string;
  cancel: string;
}): Promise<PickedPhoto | null> =>
  new Promise((resolve, reject) => {
    let started = false;
    let settled = false;

    const finish = (value: PickedPhoto | null) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };

    const run = async (source: 'camera' | 'gallery') => {
      started = true;
      try {
        assertPickerReady();
        const result =
          source === 'camera'
            ? await launchCamera(SHARED_OPTIONS)
            : await launchImageLibrary(SHARED_OPTIONS);
        if (result.didCancel) {
          finish(null);
          return;
        }
        if (result.errorCode) {
          fail(
            new Error(
              result.errorCode === 'permission'
                ? 'permission'
                : result.errorCode,
            ),
          );
          return;
        }
        finish(fromAsset(result.assets?.[0]));
      } catch (error: any) {
        const text = String(error?.message || error || '');
        if (
          text.includes('native_module_missing') ||
          text.includes('null') ||
          text.includes('launchImageLibrary') ||
          text.includes('launchCamera')
        ) {
          fail(new Error('native_module_missing'));
          return;
        }
        fail(error);
      }
    };

    try {
      assertPickerReady();
    } catch (error) {
      fail(error);
      return;
    }

    Alert.alert(
      labels.title,
      undefined,
      [
        {text: labels.camera, onPress: () => run('camera')},
        {text: labels.gallery, onPress: () => run('gallery')},
        {
          text: labels.cancel,
          style: 'cancel',
          onPress: () => finish(null),
        },
      ],
      {cancelable: true, onDismiss: () => { if (!started) finish(null); }},
    );
  });
