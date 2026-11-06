import {Alert} from 'react-native';

import {addressHasValidPin} from './deliveryAddress';

type NavigateFn = (screen: string, params?: Record<string, any>) => void;

/**
 * If address has no 6-digit PIN, show popup and open Edit Address on OK.
 * Returns true when PIN is present (caller can use the address as-is).
 */
export const ensureAddressHasPinOrEdit = (
  address: string,
  options: {
    t: (key: string, params?: any) => string;
    navigate: NavigateFn;
    returnTo: string;
  },
): boolean => {
  const clean = String(address || '').trim();
  if (addressHasValidPin(clean)) {
    return true;
  }

  Alert.alert(
    options.t('pinCode') || 'PIN Code',
    options.t('pinCodeMandatory') ||
      'PIN code is mandatory (6 digits). Please enter PIN code.',
    [
      {
        text: options.t('ok') || 'OK',
        onPress: () => {
          options.navigate('AddAddress', {
            returnTo: options.returnTo,
            editAddress: clean || undefined,
          });
        },
      },
    ],
  );
  return false;
};
