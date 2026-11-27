import environment from '../../config/environment';
import {ExternalPanchangResult} from './vedicOrbitPanchang';

/**
 * Navamsha astrology API — detailed Panchang (one call per IST day).
 * Costs 4 credits per call. Server-side only; the key is read from
 * NAVAMSHA_API_KEY and is never sent to the app.
 */
const NAVAMSHA_BASE_URL = 'https://api.navamsha.in';
const NAVAMSHA_PATH = '/api/v1/astrology/panchang/advanced';
const REQUEST_TIMEOUT_MS = 20000;
/** Sample the day at 06:00 IST (close to sunrise) so tithi matches the sunrise rule. */
const SAMPLE_HOUR_IST = 6;
const IST_TZ = 'Asia/Kolkata' as const;

export const isNavamshaConfigured = () =>
  Boolean(String(environment.NAVAMSHA_API_KEY || '').trim());

type NavamshaTimed = {
  name?: string;
  start?: string;
  end?: string;
  paksha?: string;
  id?: number;
  index?: number;
  lord?: {name?: string} | string;
};

type NavamshaPeriod = {
  name?: string;
  period?: Array<{start?: string; end?: string}>;
};

type NavamshaOutput = {
  vaara?: string;
  tithi?: NavamshaTimed[];
  nakshatra?: NavamshaTimed[];
  yoga?: NavamshaTimed[];
  karana?: NavamshaTimed[];
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  auspicious_period?: NavamshaPeriod[];
  inauspicious_period?: NavamshaPeriod[];
};

const parseIso = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

/** Readable IST clock time, e.g. "6:56 am". */
const formatIstTime = (value?: string | null) => {
  const ms = parseIso(value);
  if (ms === null) {
    return undefined;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(ms))
    .toLowerCase();
};

const formatWindow = (
  period?: NavamshaPeriod | null,
): string | undefined => {
  const first = period?.period?.[0];
  const start = formatIstTime(first?.start);
  const end = formatIstTime(first?.end);
  return start && end ? `${start} - ${end}` : undefined;
};

/** Pick the element active at the sample time; fall back to the first one. */
const pickActive = (list: NavamshaTimed[] | undefined, sampleMs: number) => {
  const items = Array.isArray(list) ? list : [];
  const hit = items.find(item => {
    const start = parseIso(item.start);
    const end = parseIso(item.end);
    return start !== null && end !== null && start <= sampleMs && sampleMs < end;
  });
  return hit || items[0];
};

const findPeriod = (list: NavamshaPeriod[] | undefined, name: string) =>
  (Array.isArray(list) ? list : []).find(
    item => String(item.name || '').toLowerCase() === name.toLowerCase(),
  );

const dayMonthYear = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return {year, month, day};
};

const displayDateFor = (isoDate: string) => {
  const {year, month, day} = dayMonthYear(isoDate);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

export const fetchNavamshaPanchang = async (options: {
  date: string;
}): Promise<ExternalPanchangResult> => {
  const key = String(environment.NAVAMSHA_API_KEY || '').trim();
  if (!key) {
    throw new Error('Navamsha API key is not configured');
  }

  const isoDate = String(options.date || '').slice(0, 10);
  const {year, month, day} = dayMonthYear(isoDate);
  const sampleMs = Date.parse(
    `${isoDate}T${String(SAMPLE_HOUR_IST).padStart(2, '0')}:00:00+05:30`,
  );
  if (!Number.isFinite(sampleMs)) {
    throw new Error(`Invalid Panchang date: ${options.date}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let body: {statusCode?: number; output?: NavamshaOutput; message?: string};
  try {
    const response = await fetch(`${NAVAMSHA_BASE_URL}${NAVAMSHA_PATH}`, {
      method: 'POST',
      headers: {
        'X-API-Key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year,
        month,
        date: day,
        hours: SAMPLE_HOUR_IST,
        minutes: 0,
        latitude: environment.NAVAMSHA_LAT,
        longitude: environment.NAVAMSHA_LON,
        timezone: environment.NAVAMSHA_TIMEZONE,
      }),
      signal: controller.signal,
    });
    body = (await response.json().catch(() => ({}))) as typeof body;
    if (!response.ok) {
      // 402 = out of credits, 429 = rate limited. Caller falls back to the next source.
      throw new Error(
        `Navamsha HTTP ${response.status}${body?.message ? `: ${body.message}` : ''}`,
      );
    }
  } finally {
    clearTimeout(timer);
  }

  const out = body?.output;
  if (!out) {
    throw new Error('Navamsha panchang response missing output');
  }

  const tithi = pickActive(out.tithi, sampleMs);
  const nakshatra = pickActive(out.nakshatra, sampleMs);
  const yoga = pickActive(out.yoga, sampleMs);
  const karana = pickActive(out.karana, sampleMs);
  if (!tithi?.name || !nakshatra?.name) {
    throw new Error('Navamsha panchang response missing core fields');
  }

  const vara = String(out.vaara || '').trim();
  const tithiName = String(tithi.name);
  const paksha = String(tithi.paksha || '').trim();
  const rahu = findPeriod(out.inauspicious_period, 'Rahu Kalam');
  const gulika = findPeriod(out.inauspicious_period, 'Gulika Kalam');
  const yamaganda = findPeriod(out.inauspicious_period, 'Yamaganda');

  return {
    date: isoDate,
    displayDate: displayDateFor(isoDate),
    weekday: vara,
    vara,
    nakshatra: String(nakshatra.name),
    pada: 0,
    tithi: tithiName,
    tithiName,
    tithiNumber: Number(tithi.index ?? tithi.id ?? 0) || 0,
    paksha,
    yoga: String(yoga?.name || ''),
    karana: String(karana?.name || ''),
    moonRashi: '',
    sunRashi: '',
    timezone: IST_TZ,
    computedAt: new Date().toISOString(),
    source: 'navamsha',
    locationName: 'Mumbai',
    sunrise: formatIstTime(out.sunrise),
    sunset: formatIstTime(out.sunset),
    moonrise: formatIstTime(out.moonrise),
    moonset: formatIstTime(out.moonset),
    rahuKalam: formatWindow(rahu),
    gulikaKalam: formatWindow(gulika),
    yamagandam: formatWindow(yamaganda),
    auspiciousTimings: {amruthaGadiyalu: []},
  };
};
