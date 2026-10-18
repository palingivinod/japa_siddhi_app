import {Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

/**
 * Space needed above the system navigation bar.
 * On Android 15/16 (targetSdk 35+), edge-to-edge can leave insets.bottom at 0
 * while the 3-button / gesture bar still draws over content.
 */
export const useBottomNavPad = (): number => {
  const {bottom} = useSafeAreaInsets();
  if (bottom > 0) {
    return bottom;
  }
  return Platform.OS === 'android' ? 48 : 0;
};
