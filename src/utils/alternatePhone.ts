import {useEffect} from 'react';
import type {Dispatch, SetStateAction} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {CountryItem} from '../constants/countries';
import {userScopedKey} from '../services/session';
import {isValidProfileMobile, resolveCallingCountry} from './profilePhone';
import {digitsOnly} from './validators';

/** Optional "Alternative phone number" value used by the order forms. */
export type AlternatePhoneValue = {
  country: CountryItem;
  mobile: string;
};

export const emptyAlternatePhone = (): AlternatePhoneValue => ({
  country: resolveCallingCountry('91'),
  mobile: '',
});

/** Empty is always fine (the field is optional). Otherwise it must be valid. */
export const isAlternatePhoneValid = (value: AlternatePhoneValue): boolean => {
  const digits = digitsOnly(value.mobile);
  if (!digits) {
    return true;
  }
  const code = value.country.callingCode.replace(/\D/g, '') || '91';
  return isValidProfileMobile(code, digits);
};

/** Payload fields for the API. Empty input sends nothing. */
export const alternatePhonePayload = (value: AlternatePhoneValue) => {
  const digits = digitsOnly(value.mobile);
  if (!digits) {
    return {};
  }
  return {
    alternateMobile: digits,
    alternateMobileCountryCode:
      value.country.callingCode.replace(/\D/g, '') || '91',
  };
};

/** Shown in review screens: "+91 9876543210", or '' when empty. */
export const alternatePhoneDisplay = (value: AlternatePhoneValue): string => {
  const digits = digitsOnly(value.mobile);
  if (!digits) {
    return '';
  }
  return `+${value.country.callingCode.replace(/\D/g, '') || '91'} ${digits}`;
};

// ---- Per-address memory (stored on this device, keyed by the address text).

type StoredAlternate = {countryCode: string; mobile: string};

const STORAGE_BASE = 'saved_address_alt_phones';

const storageKey = () => userScopedKey(STORAGE_BASE);

const addressKey = (address: string) => address.trim().toLowerCase();

const readAll = async (): Promise<Record<string, StoredAlternate>> => {
  try {
    const raw = await AsyncStorage.getItem(await storageKey());
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getAlternatePhoneForAddress = async (
  address: string,
): Promise<StoredAlternate | null> => {
  const key = addressKey(address);
  if (!key) {
    return null;
  }
  const all = await readAll();
  return all[key] || null;
};

/** Remember (or forget, when empty) the alternative number for this address. */
export const saveAlternatePhoneForAddress = async (
  address: string,
  value: AlternatePhoneValue,
): Promise<void> => {
  const key = addressKey(address);
  if (!key) {
    return;
  }
  try {
    const all = await readAll();
    const digits = digitsOnly(value.mobile);
    if (digits) {
      all[key] = {
        countryCode: value.country.callingCode.replace(/\D/g, '') || '91',
        mobile: digits,
      };
    } else {
      delete all[key];
    }
    await AsyncStorage.setItem(await storageKey(), JSON.stringify(all));
  } catch {
    // Remembering is a convenience only; the order still goes through.
  }
};

/**
 * When the delivery address changes, fill the alternative number from this
 * device's memory, but only if the devotee has not typed one yet.
 */
export const useAlternatePhonePrefill = (
  address: string,
  setAlternate: Dispatch<SetStateAction<AlternatePhoneValue>>,
) => {
  useEffect(() => {
    let active = true;
    getAlternatePhoneForAddress(address).then(saved => {
      if (!active || !saved) {
        return;
      }
      setAlternate(prev =>
        digitsOnly(prev.mobile)
          ? prev
          : {
              country: resolveCallingCountry(saved.countryCode),
              mobile: saved.mobile,
            },
      );
    });
    return () => {
      active = false;
    };
  }, [address, setAlternate]);
};
