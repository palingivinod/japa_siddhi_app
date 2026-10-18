import {Keyboard} from 'react-native';

/**
 * Close the soft keyboard, then run an action.
 * Needed on Android 15 OEMs (Lava/Poco): native dialogs + IME open together crash.
 */
export const dismissKeyboardThen = (action: () => void, delayMs = 80) => {
  Keyboard.dismiss();
  setTimeout(action, delayMs);
};
