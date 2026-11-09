import countryList, {CountryItem} from '../constants/countries';
import {digitsOnly, MOBILE_DIGITS} from './validators';

const defaultIndia: CountryItem =
  countryList.find(c => c.code === 'IN') || {
    name: 'India',
    code: 'IN',
    callingCode: '+91',
    flag: '🇮🇳',
  };

export const resolveCallingCountry = (
  countryCodeOrCalling?: string | null,
): CountryItem => {
  const raw = String(countryCodeOrCalling || '').replace(/\D/g, '') || '91';
  const match =
    countryList.find(
      item => item.callingCode.replace(/\D/g, '') === raw,
    ) ||
    countryList.find(item => item.code === 'IN') ||
    defaultIndia;
  return match;
};

export const resolveProfilePhone = (
  profile?: any,
  stored?: any,
): {countryCode: string; mobile: string; country: CountryItem} => {
  const countryCode =
    String(
      profile?.mobileCountryCode ||
        stored?.mobileCountryCode ||
        stored?.mobile_country_code ||
        '91',
    ).replace(/\D/g, '') || '91';

  const raw =
    profile?.mobileNumber ||
    stored?.mobileNumber ||
    stored?.mobile_number ||
    stored?.phoneNumber ||
    stored?.phone_number ||
    stored?.phone ||
    '';
  const digits = digitsOnly(String(raw || ''));
  let mobile = digits;
  if (
    digits.startsWith(countryCode) &&
    digits.length > countryCode.length + 5
  ) {
    mobile = digits.slice(countryCode.length);
  } else if (countryCode === '91') {
    mobile = digits.slice(-MOBILE_DIGITS);
  }

  return {
    countryCode,
    mobile,
    country: resolveCallingCountry(countryCode),
  };
};

export const isValidProfileMobile = (
  countryCode: string,
  mobile: string,
): boolean => {
  const code = String(countryCode || '').replace(/\D/g, '') || '91';
  const digits = digitsOnly(String(mobile || ''));
  if (!digits || /^0+$/.test(digits)) {
    return false;
  }
  if (code === '91') {
    return digits.length === MOBILE_DIGITS && /^[6-9]/.test(digits);
  }
  return digits.length >= 6 && digits.length <= 15;
};
