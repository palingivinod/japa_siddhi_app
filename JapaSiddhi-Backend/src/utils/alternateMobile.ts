import AppError from './appError';

/** Label used in order remarks so the admin screen can read it back. */
export const ALTERNATE_MOBILE_LABEL = 'Alternate Mobile';

/**
 * Optional "Alternative phone number" from order forms.
 * Returns '' when the field is left empty, otherwise "+CC digits".
 * India (91) must be a 10-digit number starting 6-9, like the main mobile.
 */
export const normalizeAlternateMobile = (
  rawMobile?: unknown,
  rawCountryCode?: unknown,
): string => {
  const digits = String(rawMobile ?? '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  const countryCode = String(rawCountryCode ?? '').replace(/\D/g, '') || '91';
  if (countryCode === '91') {
    const local = digits.slice(-10);
    if (!/^[6-9][0-9]{9}$/.test(local)) {
      throw new AppError('Enter a valid alternative mobile number.', 400);
    }
    return `+91${local}`;
  }
  if (digits.length < 6 || digits.length > 15) {
    throw new AppError('Enter a valid alternative mobile number.', 400);
  }
  return `+${countryCode}${digits}`;
};

/** Remarks line for an alternative number, or '' when there is none. */
export const alternateMobileRemarkLine = (normalized: string): string =>
  normalized ? `${ALTERNATE_MOBILE_LABEL}: ${normalized}` : '';
