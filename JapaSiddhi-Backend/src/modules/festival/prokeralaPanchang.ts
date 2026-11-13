import https from 'https';
import {URL, URLSearchParams} from 'url';

import environment from '../../config/environment';
import {ExternalPanchangResult} from './vedicOrbitPanchang';

type TimingItem = {
  id?: number;
  name?: string;
  paksha?: string;
  start?: string;
  end?: string;
};

type MuhuratPeriod = {start?: string; end?: string};

type MuhuratItem = {
  id?: number;
  name?: string;
  type?: string;
  period?: MuhuratPeriod[];
};

type PanchangAdvancedData = {
  vaara?: string;
  nakshatra?: TimingItem[];
  tithi?: TimingItem[];
  karana?: TimingItem[];
  yoga?: TimingItem[];
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  auspicious_period?: MuhuratItem[];
  inauspicious_period?: MuhuratItem[];
};

type RituBlock = {
  id?: number;
  name?: string;
  vedic_name?: string;
  start?: string;
  end?: string;
};

type ProkeralaEnvelope<T> = {
  status?: string;
  data?: T;
};

type TokenState = {
  accessToken: string;
  expiresAt: number;
};

const cache = new Map<
  string,
  {expiresAt: number; value: ExternalPanchangResult}
>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20000;
const TOKEN_URL = 'https://api.prokerala.com/token';
const API_BASE = 'https://api.prokerala.com/v2';

const PROKERALA_LANGS = new Set(['en', 'hi', 'ta', 'ml', 'te']);

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

let tokenState: TokenState | null = null;

export const isProkeralaConfigured = () =>
  Boolean(
    environment.PROKERALA_CLIENT_ID?.trim() &&
      environment.PROKERALA_CLIENT_SECRET?.trim(),
  );

/** Map app language to Prokerala `la` codes. */
export const toProkeralaLang = (lang?: string | null) => {
  const code = String(lang || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  if (PROKERALA_LANGS.has(code)) {
    return code;
  }
  if (code === 'mr' || code === 'bn') {
    return 'hi';
  }
  return 'en';
};

const istDateToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: environment.PROKERALA_TIMEZONE || 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

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

const formatIstClock = (iso?: string) => {
  if (!iso) {
    return '';
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(parsed)
    .replace(/\s+/g, ' ')
    .toUpperCase();
};

const formatIstWindow = (start?: string, end?: string) => {
  const from = formatIstClock(start);
  const to = formatIstClock(end);
  if (from && to) {
    return `${from} – ${to}`;
  }
  return from || to || '';
};

const pickActive = <T extends {start?: string; end?: string}>(
  items: T[] | undefined,
  at: Date,
): T | undefined => {
  if (!items?.length) {
    return undefined;
  }
  const t = at.getTime();
  const active = items.find(item => {
    const start = item.start ? new Date(item.start).getTime() : NaN;
    const end = item.end ? new Date(item.end).getTime() : NaN;
    return Number.isFinite(start) && Number.isFinite(end) && start <= t && t < end;
  });
  return active || items[0];
};

const normalizePaksha = (value?: string) => {
  if (!value) {
    return '';
  }
  return value.replace(/\s*Paksha\s*$/i, '').trim();
};

const findMuhuratWindow = (list: MuhuratItem[] | undefined, pattern: RegExp) => {
  const item = (list || []).find(entry => pattern.test(String(entry.name || '')));
  const period = item?.period?.[0];
  return formatIstWindow(period?.start, period?.end);
};

const collectAmrutha = (list: MuhuratItem[] | undefined) => {
  const slots: Array<{startTime: string; endTime: string}> = [];
  for (const item of list || []) {
    if (!/amrit/i.test(String(item.name || ''))) {
      continue;
    }
    for (const period of item.period || []) {
      const startTime = formatIstClock(period.start);
      const endTime = formatIstClock(period.end);
      if (startTime && endTime) {
        slots.push({startTime, endTime});
      }
    }
  }
  return slots;
};

const httpsRequest = (
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
) =>
  new Promise<{status: number; body: string}>((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json',
          Connection: 'close',
          ...(options.headers || {}),
        },
        timeout: REQUEST_TIMEOUT_MS,
        servername: parsed.hostname,
        family: 4,
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy(new Error('Prokerala request timed out'));
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });

const getAccessToken = async () => {
  if (tokenState && tokenState.expiresAt > Date.now() + 60_000) {
    return tokenState.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: environment.PROKERALA_CLIENT_ID,
    client_secret: environment.PROKERALA_CLIENT_SECRET,
  }).toString();

  const response = await httpsRequest(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': String(Buffer.byteLength(body)),
    },
    body,
  });

  let payload: {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } = {};
  try {
    payload = response.body ? JSON.parse(response.body) : {};
  } catch {
    throw new Error('Prokerala token response was invalid JSON');
  }

  if (response.status >= 400 || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Prokerala token failed (${response.status})`,
    );
  }

  const expiresIn = Number(payload.expires_in || 3600);
  tokenState = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
  };
  return tokenState.accessToken;
};

const apiGet = async <T>(
  path: string,
  query: Record<string, string>,
): Promise<T> => {
  const token = await getAccessToken();
  const params = new URLSearchParams(query);
  const url = `${API_BASE}${path}?${params.toString()}`;
  const response = await httpsRequest(url, {
    headers: {Authorization: `Bearer ${token}`},
  });

  let payload: ProkeralaEnvelope<T> & {errors?: unknown; message?: string} =
    {};
  try {
    payload = response.body ? JSON.parse(response.body) : {};
  } catch {
    throw new Error(`Prokerala ${path} returned invalid JSON`);
  }

  if (response.status >= 400 || payload.status === 'error' || !payload.data) {
    throw new Error(
      payload.message ||
        `Prokerala ${path} failed (${response.status || 0})`,
    );
  }

  return payload.data;
};

const mapPanchang = (
  data: PanchangAdvancedData,
  ritu: {vedic_ritu?: RituBlock; drik_ritu?: RituBlock} | null,
  date: string,
  lang: string,
  at: Date,
): ExternalPanchangResult => {
  const nakshatra = pickActive(data.nakshatra, at);
  const tithi = pickActive(data.tithi, at);
  const yoga = pickActive(data.yoga, at);
  const karana = pickActive(data.karana, at);
  const paksha = normalizePaksha(tithi?.paksha);
  const tithiName = tithi?.name || '';
  const vaara = data.vaara || '';
  const vedic = ritu?.vedic_ritu;
  const drik = ritu?.drik_ritu;

  return {
    date,
    displayDate: formatDisplayDate(date, lang),
    weekday: vaara,
    vara: vaara,
    nakshatra: nakshatra?.name || '',
    pada: 0,
    tithi: paksha && tithiName ? `${paksha} ${tithiName}` : tithiName,
    tithiName,
    tithiNumber: Number(tithi?.id || 0),
    paksha,
    yoga: yoga?.name || '',
    karana: karana?.name || '',
    moonRashi: '',
    sunRashi: '',
    timezone: 'Asia/Kolkata',
    computedAt: new Date().toISOString(),
    source: 'Prokerala Astrology API',
    locationName: 'Hyderabad, Telangana, India',
    sunrise: formatIstClock(data.sunrise),
    sunset: formatIstClock(data.sunset),
    moonrise: formatIstClock(data.moonrise),
    moonset: formatIstClock(data.moonset),
    rahuKalam: findMuhuratWindow(data.inauspicious_period, /rahu/i),
    yamagandam: findMuhuratWindow(data.inauspicious_period, /yama/i),
    gulikaKalam: findMuhuratWindow(data.inauspicious_period, /gulika/i),
    auspiciousTimings: {
      amruthaGadiyalu: collectAmrutha(data.auspicious_period),
    },
    ritu: vedic?.name || vedic?.vedic_name
      ? {
          name: vedic.name || '',
          vedicName: vedic.vedic_name || vedic.name || '',
          drikName: drik?.name || '',
          drikVedicName: drik?.vedic_name || '',
        }
      : undefined,
  };
};

export const fetchProkeralaPanchang = async (options: {
  date?: string;
  lang?: string;
} = {}): Promise<ExternalPanchangResult> => {
  if (!isProkeralaConfigured()) {
    throw new Error('Prokerala API credentials are not configured');
  }

  const date = options.date || istDateToday();
  const lang = toProkeralaLang(options.lang);
  const lat = environment.PROKERALA_LAT;
  const lon = environment.PROKERALA_LON;
  const cacheKey = `prokerala|${date}|${lang}|${lat}|${lon}`;

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const datetime = `${date}T12:00:00+05:30`;
  const coordinates = `${lat},${lon}`;
  const common = {
    ayanamsa: String(environment.PROKERALA_AYANAMSA || 1),
    coordinates,
    datetime,
    la: lang,
  };

  const [panchang, ritu] = await Promise.all([
    apiGet<PanchangAdvancedData>('/astrology/panchang/advanced', common),
    apiGet<{vedic_ritu?: RituBlock; drik_ritu?: RituBlock}>(
      '/astrology/ritu',
      common,
    ).catch(() => null),
  ]);

  const at = new Date(datetime);
  const mapped = mapPanchang(panchang, ritu, date, lang, at);
  if (!mapped.nakshatra && !mapped.tithiName) {
    throw new Error('Prokerala panchang response missing core fields');
  }

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: mapped,
  });

  return mapped;
};
