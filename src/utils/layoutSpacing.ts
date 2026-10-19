import {Dimensions} from 'react-native';

/**
 * Horizontal body padding that stays readable on small phones
 * without leaving large empty side gaps on typical devices.
 */
export const getBodyPad = (): number => {
  const width = Dimensions.get('window').width;
  if (width < 340) {
    return 10;
  }
  if (width < 400) {
    return 12;
  }
  return 14;
};

export const BODY_PAD = getBodyPad();
