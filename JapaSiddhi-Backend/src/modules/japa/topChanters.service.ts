import appSettingsService from '../admin/appSettings.service';
import japaRepository from './japa.repository';

/**
 * Daily "Top 10 Chanters" report.
 *
 * Every day at 9 PM IST the top 10 chanters of that day are picked (chants
 * from 12:00 AM up to 9 PM) and saved. Until the next 9 PM everyone sees that
 * same saved list: before 9 PM it is yesterday's report, after 9 PM it is
 * today's. This only reads japa counts — it never changes them.
 */

/** Hour (IST, 24h) when the day's top 10 is picked. */
export const TOP_CHANTERS_PICK_HOUR_IST = 21;
const LIST_SIZE = 10;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export type TopChanter = {
  rank: number;
  userId: number;
  name: string;
  city: string;
  total: number;
};

export type TopChantersReport = {
  date: string;
  pickedAtHour: number;
  chanters: TopChanter[];
};

const memory = new Map<string, TopChantersReport>();
const inFlight = new Map<string, Promise<TopChantersReport>>();
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

const settingKeyFor = (isoDate: string) => `top_chanters_${isoDate}`;

const shiftIso = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** The report date everyone should see right now (IST clock). */
export const publishedReportDate = (nowMs = Date.now()): string => {
  const ist = new Date(nowMs + IST_OFFSET_MS);
  const today = ist.toISOString().slice(0, 10);
  return ist.getUTCHours() >= TOP_CHANTERS_PICK_HOUR_IST
    ? today
    : shiftIso(today, -1);
};

const toUtcSql = (ms: number) =>
  new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

const readStored = async (
  isoDate: string,
): Promise<TopChantersReport | null> => {
  const cached = memory.get(isoDate);
  if (cached) {
    return cached;
  }
  try {
    const raw = await appSettingsService.getSetting(
      settingKeyFor(isoDate),
      '',
    );
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as TopChantersReport;
    if (parsed?.date === isoDate && Array.isArray(parsed.chanters)) {
      memory.set(isoDate, parsed);
      return parsed;
    }
  } catch {
    // Missing or corrupt — it is rebuilt below.
  }
  return null;
};

const buildReport = async (isoDate: string): Promise<TopChantersReport> => {
  const dayStartMs = Date.parse(`${isoDate}T00:00:00+05:30`);
  const pickMs = dayStartMs + TOP_CHANTERS_PICK_HOUR_IST * 60 * 60 * 1000;
  const rows = await japaRepository.getTopChantersBetween(
    toUtcSql(dayStartMs),
    toUtcSql(pickMs),
    LIST_SIZE,
  );
  const report: TopChantersReport = {
    date: isoDate,
    pickedAtHour: TOP_CHANTERS_PICK_HOUR_IST,
    chanters: rows.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      name: row.name,
      city: row.city,
      total: row.total,
    })),
  };
  await appSettingsService.setSetting(
    settingKeyFor(isoDate),
    JSON.stringify(report),
  );
  memory.set(isoDate, report);
  // Only the latest few days are kept in memory.
  if (memory.size > 3) {
    const oldest = Array.from(memory.keys()).sort()[0];
    memory.delete(oldest);
  }
  return report;
};

/** Returns the saved report for a past pick time, building it once if needed. */
export const ensureTopChantersReport = async (
  isoDate: string,
): Promise<TopChantersReport> => {
  const stored = await readStored(isoDate);
  if (stored) {
    return stored;
  }
  const pending = inFlight.get(isoDate);
  if (pending) {
    return pending;
  }
  const job = buildReport(isoDate).finally(() => {
    inFlight.delete(isoDate);
  });
  inFlight.set(isoDate, job);
  return job;
};

/** The report shown to users right now. */
export const getTopChantersReport = () =>
  ensureTopChantersReport(publishedReportDate());

/**
 * Takes each day's snapshot soon after 9 PM IST. A request also builds it if
 * the server was asleep or restarting at that time, so the list is never lost.
 */
export const startTopChantersScheduler = () => {
  if (schedulerTimer) {
    return;
  }
  const tick = () => {
    getTopChantersReport().catch(error =>
      console.warn(
        '[top-chanters] Snapshot failed:',
        error instanceof Error ? error.message : error,
      ),
    );
  };
  const boot = setTimeout(tick, 30_000);
  if (typeof boot.unref === 'function') {
    boot.unref();
  }
  schedulerTimer = setInterval(tick, CHECK_INTERVAL_MS);
  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }
};
