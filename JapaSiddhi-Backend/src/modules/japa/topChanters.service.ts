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

/** Next morning at this hour (IST) each Top 10 chanter gets their rank push. */
export const TOP_CHANTERS_PUSH_HOUR_IST = 7;
/** Not sent after this hour, so a late server restart never pushes in the evening. */
const TOP_CHANTERS_PUSH_LAST_HOUR_IST = 20;
const PUSH_KEY_PREFIX = 'top_chanters_push_';
const PUSH_START_KEY = 'top_chanters_push_start';
let pushRunning = false;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m || 1) - 1]} ${y}`;
};

const rankMessage = (rank: number, total: number, label: string) => {
  const n = String(rank);
  const c = Number(total).toLocaleString('en-IN');
  return {
    en: {
      title: `You are Top ${n} in yesterday's japa 🙏`,
      message: `Congratulations! You were #${n} among the Top 10 chanters of ${label} with ${c} chants. Keep continuing like this!`,
    },
    hi: {
      title: `कल के जप में आप टॉप ${n} में हैं 🙏`,
      message: `बधाई! ${label} के टॉप 10 जापकों में आप #${n} रहे (${c} जप)। इसी तरह जारी रखें!`,
    },
    te: {
      title: `నిన్నటి జపంలో మీరు టాప్ ${n} 🙏`,
      message: `అభినందనలు! ${label} టాప్ 10 జపకుల్లో మీరు #${n} (${c} జపాలు). ఇలాగే కొనసాగించండి!`,
    },
    ta: {
      title: `நேற்றைய ஜபத்தில் நீங்கள் முதல் ${n} இடம் 🙏`,
      message: `வாழ்த்துகள்! ${label} முதல் 10 ஜபகர்களில் நீங்கள் #${n} (${c} ஜபம்). இதேபோல் தொடருங்கள்!`,
    },
    kn: {
      title: `ನಿನ್ನೆಯ ಜಪದಲ್ಲಿ ನೀವು ಟಾಪ್ ${n} 🙏`,
      message: `ಅಭಿನಂದನೆಗಳು! ${label} ಟಾಪ್ 10 ಜಪಕರಲ್ಲಿ ನೀವು #${n} (${c} ಜಪ). ಹೀಗೆಯೇ ಮುಂದುವರಿಸಿ!`,
    },
  };
};

/**
 * From 7 AM IST, sends each of yesterday's Top 10 chanters their own push
 * ("You are Top N in yesterday's japa"). Once per day: the day is claimed
 * before sending. It only reads japa counts.
 */
export const sendTopChantersRankPushes = async () => {
  if (pushRunning) {
    return;
  }
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const hour = ist.getUTCHours();
  if (
    hour < TOP_CHANTERS_PUSH_HOUR_IST ||
    hour >= TOP_CHANTERS_PUSH_LAST_HOUR_IST
  ) {
    return;
  }
  const today = ist.toISOString().slice(0, 10);

  pushRunning = true;
  try {
    // The first run only records today's date, so deploying this never sends
    // a push for a day that happened before the feature existed.
    let startDay = await appSettingsService.getSetting(PUSH_START_KEY, '');
    if (!startDay) {
      startDay = today;
      await appSettingsService.setSetting(PUSH_START_KEY, startDay);
    }
    const reportDate = shiftIso(today, -1);
    if (reportDate < startDay) {
      return;
    }

    const key = `${PUSH_KEY_PREFIX}${reportDate}`;
    if (await appSettingsService.getSetting(key, '')) {
      return;
    }
    // Claim the day before sending anything.
    await appSettingsService.setSetting(
      key,
      JSON.stringify({status: 'sending', sent: 0}),
    );

    const report = await ensureTopChantersReport(reportDate);
    const {deliverAdminNotification} = await import(
      '../admin/adminNotification.service'
    );
    const label = dateLabel(reportDate);
    let sent = 0;
    for (const chanter of report.chanters) {
      try {
        const copy = rankMessage(chanter.rank, chanter.total, label);
        await deliverAdminNotification({
          title: copy.en.title,
          message: copy.en.message,
          translations: copy,
          target: 'all',
          userIds: [chanter.userId],
          actionType: 'TOP_CHANTERS_RANK',
          bypassHours: true,
          extraData: {
            screen: 'TopChanters',
            topRank: chanter.rank,
            reportDate,
          },
        });
        sent += 1;
      } catch (error) {
        console.warn(
          '[top-chanters] Rank push failed for user',
          chanter.userId,
          error instanceof Error ? error.message : error,
        );
      }
    }
    await appSettingsService.setSetting(
      key,
      JSON.stringify({
        status: 'done',
        sent,
        total: report.chanters.length,
        at: new Date().toISOString(),
      }),
    );
  } finally {
    pushRunning = false;
  }
};

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
    sendTopChantersRankPushes().catch(error =>
      console.warn(
        '[top-chanters] Rank push failed:',
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
