import {Alert, Keyboard, NativeModules} from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImageLibraryOptions,
} from 'react-native-image-picker';

const alertAfterKeyboard = (
  title: string,
  message: string | undefined,
  buttons: Parameters<typeof Alert.alert>[2],
) => {
  Keyboard.dismiss();
  setTimeout(() => Alert.alert(title, message, buttons), 80);
};

export type PickedMedia = {
  uri: string;
  type: string;
  fileName: string;
};

const assertPickerReady = () => {
  if (NativeModules.ImagePicker) {
    return;
  }
  throw new Error('native_module_missing');
};

const fromAsset = (
  asset: Asset | undefined,
  fallbackName: string,
  fallbackType: string,
): PickedMedia | null => {
  if (!asset?.uri) {
    return null;
  }
  return {
    uri: asset.uri,
    type: asset.type || fallbackType,
    fileName: asset.fileName || fallbackName,
  };
};

/** Opens the system file picker filtered to audio only (no photos/videos). */
export const pickAudioFile = async (): Promise<PickedMedia | null> => {
  try {
    const results = await pick({
      type: [types.audio],
      allowMultiSelection: false,
    });
    const file = results?.[0];
    if (!file?.uri) {
      return null;
    }
    const fileName = String(file.name || 'audio.mp3');
    const mimeType = String(file.type || 'audio/mpeg');
    if (mimeType && !mimeType.startsWith('audio/') && mimeType !== 'application/octet-stream') {
      throw new Error('not_audio');
    }
    let uri = file.uri;
    try {
      const copies = await keepLocalCopy({
        files: [{uri: file.uri, fileName}],
        destination: 'cachesDirectory',
      });
      const local = copies?.[0];
      if (local && (local as any).status === 'success' && (local as any).localUri) {
        uri = String((local as any).localUri);
      }
    } catch {
      // Use the original content URI if local copy is unavailable.
    }
    return {
      uri,
      type: mimeType.startsWith('audio/') ? mimeType : 'audio/mpeg',
      fileName,
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }
};

export const pickFeedbackVideo = (): Promise<PickedMedia | null> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value: PickedMedia | null) => {
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

    try {
      assertPickerReady();
    } catch (error) {
      fail(error);
      return;
    }

    alertAfterKeyboard(
      'Feedback video',
      'Choose a short video to attach (optional).',
      [
        {
          text: 'Record video',
          onPress: async () => {
            try {
              const result = await launchCamera({
                mediaType: 'video',
                videoQuality: 'medium',
                durationLimit: 60,
                saveToPhotos: false,
              });
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
              finish(
                fromAsset(result.assets?.[0], 'feedback.mp4', 'video/mp4'),
              );
            } catch (error) {
              fail(error);
            }
          },
        },
        {
          text: 'Choose from gallery',
          onPress: async () => {
            try {
              const options: ImageLibraryOptions = {
                mediaType: 'video',
                selectionLimit: 1,
              };
              const result = await launchImageLibrary(options);
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
              finish(
                fromAsset(result.assets?.[0], 'feedback.mp4', 'video/mp4'),
              );
            } catch (error) {
              fail(error);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => finish(null),
        },
      ],
    );
  });

export const pickSupportScreenshot = (): Promise<PickedMedia | null> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value: PickedMedia | null) => {
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

    try {
      assertPickerReady();
    } catch (error) {
      fail(error);
      return;
    }

    alertAfterKeyboard(
      'Problem screenshot',
      'Upload a screenshot of the issue (optional).',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              const result = await launchCamera({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1600,
                maxHeight: 1600,
                saveToPhotos: false,
              });
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
              finish(
                fromAsset(result.assets?.[0], 'screenshot.jpg', 'image/jpeg'),
              );
            } catch (error) {
              fail(error);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1600,
                maxHeight: 1600,
                selectionLimit: 1,
              });
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
              finish(
                fromAsset(result.assets?.[0], 'screenshot.jpg', 'image/jpeg'),
              );
            } catch (error) {
              fail(error);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => finish(null),
        },
      ],
    );
  });
