/** Shared helpers for delivery addresses that require a 6-digit PIN. */

export type ParsedDeliveryAddress = {
  street: string;
  city: string;
  state: string;
  pinCode: string;
};

/** Last standalone 6-digit PIN in free text (saved addresses end with PIN). */
export const extractPinFromText = (text: string): string => {
  const matches = String(text || '').match(/\b(\d{6})\b/g);
  if (!matches?.length) {
    return '';
  }
  return matches[matches.length - 1];
};

export const isValidPin = (pin: string): boolean => /^[0-9]{6}$/.test(String(pin || '').trim());

export const addressHasValidPin = (address: string): boolean =>
  isValidPin(extractPinFromText(address));

/**
 * AddAddress saves: street[, area], city, state, pin
 * Older free-text addresses may only contain a PIN somewhere in the string.
 */
export const parseDeliveryAddress = (fullAddress: string): ParsedDeliveryAddress => {
  const raw = String(fullAddress || '').trim();
  const pinCode = extractPinFromText(raw);
  const parts = raw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length >= 3 && isValidPin(parts[parts.length - 1])) {
    return {
      street: parts.slice(0, Math.max(1, parts.length - 3)).join(', '),
      city: parts[parts.length - 3] || '',
      state: parts[parts.length - 2] || '',
      pinCode: parts[parts.length - 1],
    };
  }

  return {
    street: raw,
    city: '',
    state: '',
    pinCode,
  };
};
