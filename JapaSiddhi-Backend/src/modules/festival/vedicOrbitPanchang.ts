import environment from '../../config/environment';
import {PanchangResult} from './panchang';

type LocalizedName = {
  en?: string;
  te?: string;
  hi?: string;
  ta?: string;
  kn?: string;
};

type NamedField = {
  number?: number;
  name?: string;
  paksha?: string;
  pada?: number;
  weekday?: string;
  teluguName?: string;
  localizedName?: LocalizedName;
  localizedWeekday?: LocalizedName;
  localizedPaksha?: LocalizedName;
};

type TimeWindow = {
  local?: string;
  startLocal?: string;
  endLocal?: string;
};

type Astronomical = {
  sunrise?: TimeWindow;
  sunset?: TimeWindow;
  moonrise?: TimeWindow;
  moonset?: TimeWindow;
  tithi?: NamedField;
  vara?: NamedField;
  nakshatra?: NamedField;
  yoga?: NamedField;
  karana?: NamedField;
  rasi?: NamedField;
  suryaRasi?: NamedField;
  rahuKalam?: TimeWindow;
  yamagandam?: TimeWindow;
  gulikaKalam?: TimeWindow;
};

type VedicOrbitResponse = {
  success?: boolean;
  error?: string;
  source?: string;
  version?: string;
  mode?: string;
  language?: string;
  input?: {
    date?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
  location?: {
    name?: string;
    state?: string;
    country?: string;
  };
  data?: {
    status?: string;
    astronomical?: Astronomical;
  };
};

export type ExternalPanchangResult = PanchangResult & {
  source: string;
  locationName?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  rahuKalam?: string;
  yamagandam?: string;
  gulikaKalam?: string;
};

type FetchOptions = {
  date?: string;
  lang?: string;
  mode?: 'summary' | 'full';
};

const cache = new Map<string, {expiresAt: number; value: ExternalPanchangResult}>();
const CACHE_TTL_MS = 30 * 60 * 1000;

const VEDICORBIT_LANGS = new Set(['en', 'te', 'hi', 'ta', 'kn']);

const LOCALE_BY_LANG: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  or: 'or-IN',
};

/** Map app language codes to VedicOrbit-supported langs. */
export const toVedicOrbitLang = (lang?: string | null) => {
  const code = String(lang || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  if (VEDICORBIT_LANGS.has(code)) {
    return code;
  }
  if (code === 'mr') {
    return 'hi';
  }
  return 'en';
};

const pickName = (field?: NamedField, lang = 'en') => {
  if (!field) {
    return '';
  }
  const localized = field.localizedName?.[lang as keyof LocalizedName];
  return localized || field.name || field.teluguName || '';
};

const pickPaksha = (field?: NamedField, lang = 'en') => {
  if (!field) {
    return '';
  }
  const localized = field.localizedPaksha?.[lang as keyof LocalizedName];
  if (localized) {
    return localized;
  }
  return normalizePaksha(field.paksha);
};

const pickWeekday = (field?: NamedField, lang = 'en') => {
  if (!field) {
    return '';
  }
  const localized = field.localizedWeekday?.[lang as keyof LocalizedName];
  return localized || field.weekday || pickName(field, lang);
};

const normalizePaksha = (value?: string) => {
  if (!value) {
    return '';
  }
  return value.replace(/\s*Paksha\s*$/i, '').trim();
};

const formatWindow = (window?: TimeWindow) => {
  if (!window) {
    return '';
  }
  if (window.startLocal && window.endLocal) {
    return `${window.startLocal} – ${window.endLocal}`;
  }
  return window.local || '';
};

const formatDisplayDate = (date: string, lang: string) => {
  const parsed = new Date(`${date}T12:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  const locale = LOCALE_BY_LANG[lang] || 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
};

const mapResponse = (
  payload: VedicOrbitResponse,
  lang: string,
): ExternalPanchangResult => {
  const astro = payload.data?.astronomical || {};
  const date = payload.input?.date || '';
  const paksha = pickPaksha(astro.tithi, lang);
  const tithiName = pickName(astro.tithi, lang) || astro.tithi?.name || '';
  const weekday = pickWeekday(astro.vara, lang);
  const locationParts = [
    payload.location?.name,
    payload.location?.state,
    payload.location?.country,
  ].filter(Boolean);

  return {
    date,
    displayDate: formatDisplayDate(date, lang),
    weekday: weekday || '',
    vara: pickName(astro.vara, lang) || astro.vara?.name || '',
    nakshatra: pickName(astro.nakshatra, lang) || '',
    pada: Number(astro.nakshatra?.pada || 0),
    tithi: paksha && tithiName ? `${paksha} ${tithiName}` : tithiName,
    tithiName,
    tithiNumber: Number(astro.tithi?.number || 0),
    paksha,
    yoga: pickName(astro.yoga, lang) || '',
    karana: pickName(astro.karana, lang) || '',
    moonRashi: pickName(astro.rasi, lang) || '',
    sunRashi: pickName(astro.suryaRasi, lang) || '',
    timezone: 'Asia/Kolkata',
    computedAt: new Date().toISOString(),
    source: payload.source || 'VedicOrbit Panchangam API',
    locationName: locationParts.join(', '),
    sunrise: formatWindow(astro.sunrise),
    sunset: formatWindow(astro.sunset),
    moonrise: formatWindow(astro.moonrise),
    moonset: formatWindow(astro.moonset),
    rahuKalam: formatWindow(astro.rahuKalam),
    yamagandam: formatWindow(astro.yamagandam),
    gulikaKalam: formatWindow(astro.gulikaKalam),
  };
};

export const isVedicOrbitConfigured = () =>
  Boolean(environment.VEDICORBIT_API_KEY?.trim());

export const fetchVedicOrbitPanchang = async (
  options: FetchOptions = {},
): Promise<ExternalPanchangResult> => {
  if (!isVedicOrbitConfigured()) {
    throw new Error('VedicOrbit API key is not configured');
  }

  const date =
    options.date ||
    new Intl.DateTimeFormat('en-CA', {
      timeZone: environment.VEDICORBIT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  const lang = toVedicOrbitLang(
    options.lang || environment.VEDICORBIT_LANG || 'en',
  );
  const mode = options.mode || 'summary';
  const cacheKey = [
    date,
    lang,
    mode,
    environment.VEDICORBIT_LAT,
    environment.VEDICORBIT_LON,
  ].join('|');

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const url = new URL(environment.VEDICORBIT_API_BASE_URL);
  url.searchParams.set('mode', mode);
  url.searchParams.set('date', date);
  url.searchParams.set('lat', String(environment.VEDICORBIT_LAT));
  url.searchParams.set('lon', String(environment.VEDICORBIT_LON));
  url.searchParams.set('timezone', environment.VEDICORBIT_TIMEZONE);
  url.searchParams.set('lang', lang);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-api-key': environment.VEDICORBIT_API_KEY,
      Accept: 'application/json',
    },
  });

  const payload = (await response.json()) as VedicOrbitResponse;
  if (!response.ok || payload.success === false) {
    throw new Error(
      payload.error || `VedicOrbit request failed (${response.status})`,
    );
  }

  const mapped = mapResponse(payload, lang);
  if (!mapped.date) {
    throw new Error('VedicOrbit response missing date');
  }

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: mapped,
  });

  return mapped;
};
