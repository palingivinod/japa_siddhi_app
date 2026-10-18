import {useEffect, useState} from 'react';
import {Keyboard, Platform} from 'react-native';

/**
 * Close the soft keyboard, then run an action.
 * Avoids crashes on many Android devices when a native dialog/picker opens
 * while the soft keyboard is still visible (all brands, especially Android 12+).
 */
export const dismissKeyboardThen = (action: () => void, delayMs = 80) => {
  Keyboard.dismiss();
  setTimeout(action, delayMs);
};

/**
 * True while the soft keyboard is visible.
 * Used to lock ScrollView while typing — ScrollView + IME has crashed across
 * multiple Android brands (not limited to one manufacturer).
 */
export const useKeyboardOpen = (): boolean => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, () => setOpen(true));
    const onHide = Keyboard.addListener(hideEvent, () => setOpen(false));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return open;
};
