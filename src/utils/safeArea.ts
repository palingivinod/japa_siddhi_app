import {useSafeAreaInsets} from 'react-native-safe-area-context';

/**
 * Bottom inset for the system navigation / home indicator.
 *
 * Do not invent a large fallback when bottom is 0. MainActivity uses
 * setDecorFitsSystemWindows(true), so 0 usually means the window is already
 * laid out above the system nav. A fake 48dp created a blank gap under tabs
 * on many phones.
 *
 * When the OS reports a real inset (edge-to-edge), use that value.
 */
export const useBottomNavPad = (): number => {
  const {bottom} = useSafeAreaInsets();
  return Math.max(0, bottom);
};
