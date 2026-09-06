import https from 'https';
import {URL} from 'url';

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
  sunLongitude?: number;
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

const cache = new Map<
  string,
  {expiresAt: number; value: ExternalPanchangResult}
>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 3;

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

const FALLBACK_BASE_URLS = [
  'https://vedicorbit-website.vercel.app/api/panchangam',
  'https://www.vedicorbit.in/api/panchangam',
];

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

const RASHI_NAMES = [
  'Mesha',
  'Vrishabha',
  'Mithuna',
  'Karka',
  'Simha',
  'Kanya',
  'Tula',
  'Vrischika',
  'Dhanu',
  'Makara',
  'Kumbha',
  'Meena',
];

const pickPaksha = (field?: NamedField, lang = 'en') => {
  if (!field) {
    return '';
  }
  const localized = field.localizedPaksha?.[lang as keyof LocalizedName];
  return normalizePaksha(localized || field.paksha);
};

const rashiFromLongitude = (longitude?: number) => {
  if (!Number.isFinite(longitude)) {
    return '';
  }
  const index = Math.floor((((longitude as number) % 360) + 360) % 360 / 30);
  return RASHI_NAMES[index] || '';
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
    sunRashi:
      pickName(astro.suryaRasi, lang) ||
      rashiFromLongitude(astro.tithi?.sunLongitude),
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

const baseUrls = () => {
  const preferred = environment.VEDICORBIT_API_BASE_URL?.trim();
  const list = preferred
    ? [preferred, ...FALLBACK_BASE_URLS.filter(item => item !== preferred)]
    : FALLBACK_BASE_URLS;
  return list;
};

const httpsGetJson = (url: string, apiKey: string) =>
  new Promise<VedicOrbitResponse>((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
          Connection: 'close',
        },
        timeout: REQUEST_TIMEOUT_MS,
        servername: parsed.hostname,
        family: 4,
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          let payload: VedicOrbitResponse = {};
          try {
            payload = body ? (JSON.parse(body) as VedicOrbitResponse) : {};
          } catch {
            reject(new Error('VedicOrbit returned invalid JSON'));
            return;
          }
          if ((res.statusCode || 500) >= 400 || payload.success === false) {
            reject(
              new Error(
                payload.error ||
                  `VedicOrbit request failed (${res.statusCode || 0})`,
              ),
            );
            return;
          }
          resolve(payload);
        });
      },
    );
    req.on('timeout', () => {
      req.destroy(new Error('VedicOrbit request timed out'));
    });
    req.on('error', reject);
    req.end();
  });

const fetchWithRetry = async (url: string, apiKey: string) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await httpsGetJson(url, apiKey);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 400 * attempt));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('VedicOrbit request failed');
};

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

  const params = new URLSearchParams({
    mode,
    date,
    lat: String(environment.VEDICORBIT_LAT),
    lon: String(environment.VEDICORBIT_LON),
    timezone: environment.VEDICORBIT_TIMEZONE,
    lang,
  });

  let payload: VedicOrbitResponse | null = null;
  let lastError: unknown;
  for (const base of baseUrls()) {
    const url = `${base}?${params.toString()}`;
    try {
      payload = await fetchWithRetry(url, environment.VEDICORBIT_API_KEY);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!payload) {
    const detail =
      lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`VedicOrbit unavailable: ${detail}`);
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
