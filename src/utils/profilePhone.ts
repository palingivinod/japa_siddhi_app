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

  // Country calling code (+91) is separate from the local number.
  // Never strip leading "91" from a valid 10-digit Indian mobile
  // (e.g. 9154835659 must stay 9154835659, not 54835659).
  if (countryCode === '91') {
    if (digits.length === MOBILE_DIGITS && /^[6-9]/.test(digits)) {
      mobile = digits;
    } else if (
      digits.startsWith('91') &&
      digits.length > MOBILE_DIGITS
    ) {
      // Stored as 91XXXXXXXXXX (12+) — drop country prefix only.
      const stripped = digits.slice(2);
      mobile =
        stripped.length === MOBILE_DIGITS && /^[6-9]/.test(stripped)
          ? stripped
          : stripped.slice(-MOBILE_DIGITS);
    } else {
      mobile = digits.slice(-MOBILE_DIGITS);
    }
  } else if (
    digits.startsWith(countryCode) &&
    digits.length > countryCode.length + 5
  ) {
    const stripped = digits.slice(countryCode.length);
    // Keep original if stripping would leave an implausibly short number.
    mobile =
      stripped.length >= 6 ? stripped : digits;
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
