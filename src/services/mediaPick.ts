import {Alert, NativeModules} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImageLibraryOptions,
} from 'react-native-image-picker';

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

    Alert.alert('Feedback video', 'Choose a short video to attach (optional).', [
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
    ]);
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

    Alert.alert(
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
