export const isEmail = (
  email: string,
): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/** Mobile numbers are mandatory and must be exactly this many digits. */
export const MOBILE_DIGITS = 10;

export const digitsOnly = (
  value: string,
): string => {
  return String(value || '').replace(/\D/g, '');
};

export const isMobile = (
  mobile: string,
): boolean => {
  return /^[0-9]{10}$/.test(mobile);
};