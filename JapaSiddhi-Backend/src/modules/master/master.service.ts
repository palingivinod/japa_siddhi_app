import masterRepository from './master.repository';
import AppError from '../../utils/appError';

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());

/** Clean district labels like "Spsr Nellore" → "Nellore" when useful for city field. */
const cleanCityName = (raw: string) => {
  let value = String(raw || '').trim();
  if (!value) {
    return '';
  }
  value = value
    .replace(/\bSpsr\b/gi, '')
    .replace(/\bSri Potti Sriramulu\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return titleCase(value);
};

type PostalLookup = {
  Status?: string;
  PostOffice?: Array<{
    Name?: string;
    District?: string;
    State?: string;
  }> | null;
};

type ResolvedPin = {
  stateName: string;
  cityName: string;
};

const fetchWithTimeout = async (url: string, ms = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
};

/** Primary: third-party India Post mirror (can go down). */
const lookupFromPostalPincodeIn = async (
  code: string,
): Promise<ResolvedPin | null> => {
  try {
    const response = await fetchWithTimeout(
      `https://api.postalpincode.in/pincode/${code}`,
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as PostalLookup[];
    const office = body?.[0]?.PostOffice?.[0];
    if (!office || String(body?.[0]?.Status || '') !== 'Success') {
      return null;
    }
    const stateName = titleCase(String(office.State || '').trim());
    const cityName = cleanCityName(
      String(office.District || office.Name || '').trim(),
    );
    if (!stateName || !cityName) {
      return null;
    }
    return {stateName, cityName};
  } catch (err) {
    console.warn('Primary pincode API failed', code, err);
    return null;
  }
};

/**
 * Fallback: directory based on All India Pincode Directory (data.gov.in source).
 * Used when api.postalpincode.in is down or missing a PIN.
 */
const lookupFromDharunFallback = async (
  code: string,
): Promise<ResolvedPin | null> => {
  try {
    const response = await fetchWithTimeout(
      `https://api.dharun.dev/v1/pincode/${code}`,
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as {
      data?: {
        state?: string;
        district?: string;
        offices?: Array<{district?: string; state?: string; name?: string}>;
      };
    };
    const data = body?.data;
    if (!data) {
      return null;
    }
    const office = data.offices?.[0];
    const stateName = titleCase(
      String(data.state || office?.state || '').trim(),
    );
    const cityName = cleanCityName(
      String(data.district || office?.district || office?.name || '').trim(),
    );
    if (!stateName || !cityName) {
      return null;
    }
    return {stateName, cityName};
  } catch (err) {
    console.warn('Fallback pincode API failed', code, err);
    return null;
  }
};

class MasterService {
  async getCountries() {
    return masterRepository.getCountries();
  }

  async getStates(countryId: number) {
    return masterRepository.getStates(countryId);
  }

  async getCities(stateId: number) {
    return masterRepository.getCities(stateId);
  }

  async lookupPincode(pin: string) {
    const code = String(pin || '').replace(/\D/g, '').slice(0, 6);
    if (!/^[0-9]{6}$/.test(code)) {
      throw new AppError('Enter a 6-digit PIN code.', 400);
    }

    const resolved =
      (await lookupFromPostalPincodeIn(code)) ||
      (await lookupFromDharunFallback(code));

    if (!resolved) {
      throw new AppError('Could not find that PIN code.', 400);
    }

    const {stateName, cityName} = resolved;
    const countryId = await masterRepository.findIndiaId();
    const state = await masterRepository.findOrCreateState(countryId, stateName);
    const city = await masterRepository.findOrCreateCity(
      countryId,
      state.id,
      cityName,
      code,
    );
    if (!state.id || !city.id) {
      throw new AppError('Could not find that PIN code.', 400);
    }
    return {
      pinCode: code,
      countryId,
      stateId: state.id,
      stateName: state.name,
      cityId: city.id,
      cityName: city.name,
    };
  }

  async getLanguages() {
    try {
      return await masterRepository.getLanguages();
    } catch (error) {
      console.warn('Languages database unavailable, using Node fallback data.');
      return [
        {id: 1, code: 'en', name: 'English', nativeName: 'English', isActive: 1},
        {id: 2, code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isActive: 1},
        {id: 3, code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isActive: 1},
        {id: 4, code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isActive: 1},
        {id: 5, code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isActive: 1},
      ];
    }
  }
}

export default new MasterService();
