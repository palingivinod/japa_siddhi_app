import mysql from '../../database/mysql';
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
const claimKeyFor = (isoDate: string) => `panchang_fetch_claim_${isoDate}`;

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Cross-instance lock: only one Render process may call Prokerala for a given day.
 * Prevents quota burn when many users open panchang at once / during redeploys.
 */
const tryClaimPanchangFetch = async (isoDate: string): Promise<boolean> => {
  const key = claimKeyFor(isoDate);
  const stamp = new Date().toISOString();
  const engine = mysql.getEngineName() || 'sqlite';
  try {
    if (engine === 'postgres') {
      const res = await mysql.query<any>(
        `
        INSERT INTO app_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON CONFLICT (setting_key) DO NOTHING
        `,
        [key, stamp],
      );
      return Number(res?.affectedRows || 0) > 0;
    }
    if (engine === 'mysql') {
      const res = await mysql.query<any>(
        `
        INSERT IGNORE INTO app_settings (setting_key, setting_value)
        VALUES (?, ?)
        `,
        [key, stamp],
      );
      return Number(res?.affectedRows || 0) > 0;
    }
    const res = await mysql.query<any>(
      `
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value)
      VALUES (?, ?)
      `,
      [key, stamp],
    );
    return Number(res?.affectedRows || 0) > 0;
  } catch (error) {
    console.warn('[panchang-daily] fetch claim failed:', errorDetail(error));
    return false;
  }
};

const clearPanchangFetchClaim = async (isoDate: string) => {
  try {
    await mysql.query(`DELETE FROM app_settings WHERE setting_key = ?`, [
      claimKeyFor(isoDate),
    ]);
  } catch {
    // ignore
  }
};

/** Wait briefly for another instance to finish writing today's cache. */
const waitForStoredPanchang = async (
  isoDate: string,
  preferStrongSource: boolean,
  fallback: PanchangResult | null,
): Promise<PanchangResult> => {
  for (let i = 0; i < 25; i += 1) {
    await sleep(400);
    memory.delete(isoDate);
    const row = await readStored(isoDate);
    if (!row?.payload) {
      continue;
    }
    const source = String(row.source || (row.payload as any)?.source || '');
    if (!preferStrongSource || !isWeakPanchangSource(source)) {
      return row.payload;
    }
  }
  if (fallback) {
    return fallback;
  }
  return getPanchang(isoDate);
};

const persistFetchedPanchang = async (
  isoDate: string,
  payload: PanchangResult,
) => {
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
  let upgradeFromLocal = false;
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
    upgradeFromLocal = true;
    console.log(
      `[panchang-daily] Upgrading local cache for ${isoDate} via Prokerala`,
    );
    // Keep serving the old local row to other requests — do NOT clear DB first.
  }

  const pending = inflight.get(isoDate);
  if (pending) {
    return pending;
  }

  const job = (async () => {
    const claimed = await tryClaimPanchangFetch(isoDate);
    if (!claimed) {
      // Another instance is fetching — wait for shared cache, keep local meantime.
      return waitForStoredPanchang(
        isoDate,
        upgradeFromLocal,
        existing?.payload || null,
      );
    }

    try {
      const payload = await fetchOnceForDate(isoDate);
      return await persistFetchedPanchang(isoDate, payload);
    } catch (error) {
      // Allow a later retry if this fetch hard-failed before writing.
      await clearPanchangFetchClaim(isoDate);
      throw error;
    }
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
  await clearPanchangFetchClaim(isoDate);
  // Do not wipe today's payload before the new fetch completes — avoids stampede.
  const pending = inflight.get(isoDate);
  if (pending) {
    return pending;
  }
  const job = (async () => {
    const claimed = await tryClaimPanchangFetch(isoDate);
    if (!claimed) {
      return waitForStoredPanchang(isoDate, true, null);
    }
    try {
      const payload = await fetchOnceForDate(isoDate);
      return await persistFetchedPanchang(isoDate, payload);
    } catch (error) {
      await clearPanchangFetchClaim(isoDate);
      throw error;
    }
  })().finally(() => {
    inflight.delete(isoDate);
  });
  inflight.set(isoDate, job);
  return job;
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
