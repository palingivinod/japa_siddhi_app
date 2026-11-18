import appSettingsService from '../admin/appSettings.service';
import {getPanchang} from './panchang';
import {PanchangResult} from './panchang';
import {
  fetchProkeralaPanchang,
  isProkeralaConfigured,
} from './prokeralaPanchang';
import {
  fetchVedicOrbitPanchang,
  isVedicOrbitConfigured,
} from './vedicOrbitPanchang';

type StoredDailyPanchang = {
  date: string;
  fetchedAt: string;
  source?: string;
  payload: PanchangResult;
};

const settingKeyFor = (isoDate: string) => `panchang_daily_${isoDate}`;

/** IST calendar YYYY-MM-DD. */
export const istCalendarDate = (value?: Date | null) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value ?? new Date());

const istMidnightMs = (isoDate: string) =>
  Date.parse(`${isoDate}T00:00:00+05:30`);

const nextIstCalendarDate = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

export const msUntilNextIstMidnight = (now = new Date()) => {
  const today = istCalendarDate(now);
  const tomorrow = nextIstCalendarDate(today);
  let target = istMidnightMs(tomorrow);
  const ms = target - now.getTime();
  if (ms > 5_000) {
    return ms;
  }
  // Already at/past midnight — aim for the following day.
  target = istMidnightMs(nextIstCalendarDate(tomorrow));
  return Math.max(5_000, target - now.getTime());
};

const memory = new Map<string, StoredDailyPanchang>();
const inflight = new Map<string, Promise<PanchangResult>>();
/** Avoid hammering Prokerala every request if credentials fail and we fall back to local. */
const localUpgradeAttempted = new Set<string>();

const errorDetail = (error: unknown) => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const code = (error as Error & {cause?: {code?: string}}).cause?.code;
  return `${error.message}${code ? ` [${code}]` : ''}`;
};

const readStored = async (
  isoDate: string,
): Promise<StoredDailyPanchang | null> => {
  const mem = memory.get(isoDate);
  if (mem?.date === isoDate && mem.payload) {
    return mem;
  }
  try {
    const raw = await appSettingsService.getSetting(settingKeyFor(isoDate), '');
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredDailyPanchang;
    if (
      parsed?.date === isoDate &&
      parsed?.payload &&
      typeof parsed.payload === 'object'
    ) {
      memory.set(isoDate, parsed);
      return parsed;
    }
  } catch {
    // Corrupt or missing — refresh below.
  }
  return null;
};

const writeStored = async (row: StoredDailyPanchang) => {
  memory.set(row.date, row);
  await appSettingsService.setSetting(
    settingKeyFor(row.date),
    JSON.stringify(row),
  );
};

/** One external provider call for the IST day (English). */
const fetchOnceForDate = async (isoDate: string): Promise<PanchangResult> => {
  let loaded: PanchangResult | null = null;

  if (isProkeralaConfigured()) {
    try {
      loaded = await fetchProkeralaPanchang({date: isoDate, lang: 'en'});
    } catch (error) {
      console.error(
        '[panchang-daily] Prokerala failed, trying VedicOrbit:',
        errorDetail(error),
      );
    }
  }

  if (!loaded && isVedicOrbitConfigured()) {
    try {
      loaded = await fetchVedicOrbitPanchang({
        date: isoDate,
        lang: 'en',
        mode: 'full',
      });
    } catch (error) {
      console.error(
        '[panchang-daily] VedicOrbit failed, using local fallback:',
        errorDetail(error),
      );
    }
  }

  if (!loaded) {
    loaded = getPanchang(isoDate);
  }
  return loaded;
};

const isWeakPanchangSource = (source?: string | null) => {
  const value = String(source || '')
    .trim()
    .toLowerCase();
  return !value || value === 'local';
};

/**
 * Ensure today's (or given IST date) panchang is stored.
 * Concurrent callers share one in-flight fetch — never stampede providers.
 * If an older "local" cache exists and Prokerala is now configured, refresh once.
 */
export const ensureDailyPanchang = async (
  dateInput?: string,
): Promise<PanchangResult> => {
  const isoDate =
    String(dateInput || '').trim().slice(0, 10) || istCalendarDate();
  const existing = await readStored(isoDate);
  if (existing?.payload) {
    const source = String(
      existing.source || (existing.payload as any)?.source || '',
    );
    const shouldUpgrade =
      isWeakPanchangSource(source) &&
      isProkeralaConfigured() &&
      !localUpgradeAttempted.has(isoDate);
    if (!shouldUpgrade) {
      return existing.payload;
    }
    localUpgradeAttempted.add(isoDate);
    console.log(
      `[panchang-daily] Upgrading local cache for ${isoDate} via Prokerala`,
    );
    memory.delete(isoDate);
  }

  const pending = inflight.get(isoDate);
  if (pending) {
    return pending;
  }

  const job = (async () => {
    // Clear stale local row before rewrite so a failed provider does not
    // leave us stuck forever if a concurrent reader re-cached it.
    try {
      await appSettingsService.setSetting(settingKeyFor(isoDate), '');
    } catch {
      // ignore
    }
    const payload = await fetchOnceForDate(isoDate);
    const row: StoredDailyPanchang = {
      date: isoDate,
      fetchedAt: new Date().toISOString(),
      source: String((payload as any)?.source || ''),
      payload,
    };
    try {
      await writeStored(row);
    } catch (error) {
      console.warn('[panchang-daily] Could not persist cache:', errorDetail(error));
      memory.set(isoDate, row);
    }
    console.log(
      `[panchang-daily] Cached panchang for ${isoDate} (source=${row.source || 'local'})`,
    );
    return payload;
  })().finally(() => {
    inflight.delete(isoDate);
  });

  inflight.set(isoDate, job);
  return job;
};

/** Force refresh for an IST date (used by midnight job). */
export const refreshDailyPanchang = async (dateInput?: string) => {
  const isoDate =
    String(dateInput || '').trim().slice(0, 10) || istCalendarDate();
  memory.delete(isoDate);
  localUpgradeAttempted.delete(isoDate);
  try {
    await appSettingsService.setSetting(settingKeyFor(isoDate), '');
  } catch {
    // ignore
  }
  return ensureDailyPanchang(isoDate);
};

let midnightTimer: NodeJS.Timeout | null = null;
let bootTimer: NodeJS.Timeout | null = null;

const scheduleNextMidnightRefresh = () => {
  if (midnightTimer) {
    clearTimeout(midnightTimer);
  }
  const waitMs = msUntilNextIstMidnight();
  midnightTimer = setTimeout(() => {
    const today = istCalendarDate();
    refreshDailyPanchang(today)
      .catch(error =>
        console.warn(
          '[panchang-daily] Midnight refresh failed:',
          errorDetail(error),
        ),
      )
      .finally(() => {
        scheduleNextMidnightRefresh();
      });
  }, waitMs);
  if (typeof midnightTimer.unref === 'function') {
    midnightTimer.unref();
  }
  console.log(
    `[panchang-daily] Next IST midnight refresh in ${Math.round(waitMs / 60000)} min`,
  );
};

/** Start midnight IST refresh + warm today's cache shortly after boot. */
export const startPanchangDailyScheduler = () => {
  if (bootTimer || midnightTimer) {
    return;
  }
  bootTimer = setTimeout(() => {
    const today = istCalendarDate();
    // After adding Prokerala env vars, force refresh so we don't keep a
    // previously cached "local" day (missing sunrise / rahu / etc.).
    const warm = isProkeralaConfigured()
      ? refreshDailyPanchang(today)
      : ensureDailyPanchang(today);
    warm.catch(error =>
      console.warn(
        '[panchang-daily] Boot warm-up failed:',
        errorDetail(error),
      ),
    );
  }, 20_000);
  if (typeof bootTimer.unref === 'function') {
    bootTimer.unref();
  }
  scheduleNextMidnightRefresh();
};
