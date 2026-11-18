/** Shared helpers for delivery addresses that require a 6-digit PIN. */

export type ParsedDeliveryAddress = {
  street: string;
  city: string;
  state: string;
  pinCode: string;
};

/** Profile fields used to prefill order / seva address forms. */
export type ProfileAddressSource = {
  address?: string | null;
  postalCode?: string | null;
  pinCode?: string | null;
  postal_code?: string | null;
  region?: string | null;
  cityName?: string | null;
  city_name?: string | null;
  stateName?: string | null;
  state_name?: string | null;
};

/**
 * Build a delivery address from profile when it already has text + a valid PIN.
 * Prefers the full profile address string; appends PIN / city / state if missing.
 */
export const buildAddressFromProfile = (
  profile?: ProfileAddressSource | null,
): string => {
  if (!profile) {
    return '';
  }
  const pin = String(
    profile.postalCode || profile.pinCode || profile.postal_code || '',
  )
    .replace(/\D/g, '')
    .slice(0, 6);
  const rawAddress = String(profile.address || '').trim();
  const city = String(profile.cityName || profile.city_name || '').trim();
  const state = String(profile.stateName || profile.state_name || '').trim();
  const region = String(profile.region || '').trim();

  if (rawAddress && addressHasValidPin(rawAddress)) {
    return rawAddress;
  }

  if (rawAddress && isValidPin(pin)) {
    const parts = [rawAddress];
    if (city && !rawAddress.toLowerCase().includes(city.toLowerCase())) {
      parts.push(city);
    }
    if (state && !rawAddress.toLowerCase().includes(state.toLowerCase())) {
      parts.push(state);
    }
    if (!extractPinFromText(rawAddress)) {
      parts.push(pin);
    }
    return parts.join(', ');
  }

  // Compose from structured fields when free-text address is empty.
  if (isValidPin(pin) && (rawAddress || region || city || state)) {
    return [rawAddress || region, city, state, pin].filter(Boolean).join(', ');
  }

  return '';
};

/** Prefer a complete profile address over older/incomplete saved delivery lines. */
export const pickPrefillAddress = (options: {
  selectedAddress?: string | null;
  profile?: ProfileAddressSource | null;
  latestChosen?: string | null;
  savedAddresses?: string[] | null;
}): string => {
  const selected = String(options.selectedAddress || '').trim();
  if (selected && addressHasValidPin(selected)) {
    return selected;
  }
  const fromProfile = buildAddressFromProfile(options.profile);
  if (fromProfile) {
    return fromProfile;
  }
  if (selected) {
    return selected;
  }
  const latest = String(options.latestChosen || '').trim();
  const saved = (options.savedAddresses || [])
    .map(item => String(item || '').trim())
    .filter(Boolean);
  const candidates = [latest, ...saved].filter(Boolean);
  return candidates.find(addressHasValidPin) || candidates[0] || '';
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
