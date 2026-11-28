import mysql from '../../database/mysql';
import appSettingsService from './appSettings.service';
import notificationRepository from '../notification/notification.repository';

/**
 * Light "who opened what" records for admin analytics. Only counts taps made
 * after the app update that sends them. Nothing here touches japa data.
 */
export const ENGAGEMENT_TYPES = [
  'BANNER_TAP',
  'TOP10_OPEN',
  'HOMAM_UPDATES_OPEN',
] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

const ALLOWED_SOURCES = new Set([
  'home',
  'services',
  'notification',
  'push',
  'other',
]);

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOMAM_ACTION_TYPE = 'NITHYA_HOMAM_ANNOUNCEMENT';

let tableReady = false;

const ensureTable = async () => {
  if (tableReady) {
    return;
  }
  const engine = mysql.getEngineName() || 'sqlite';
  if (engine === 'mysql') {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS engagement_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        event_type VARCHAR(30) NOT NULL,
        ref_id VARCHAR(60) NULL,
        source VARCHAR(20) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS engagement_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        ref_id TEXT,
        source TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  try {
    await mysql.query(
      `CREATE INDEX idx_engagement_type_ref ON engagement_events (event_type, ref_id)`,
    );
  } catch {
    // Index already exists.
  }
  tableReady = true;
};

export const logEngagement = async (input: {
  userId: number;
  type: string;
  refId?: string | number | null;
  source?: string | null;
}) => {
  const type = String(input.type || '').trim().toUpperCase();
  if (!(ENGAGEMENT_TYPES as readonly string[]).includes(type)) {
    const error: any = new Error('Unknown event type.');
    error.statusCode = 400;
    throw error;
  }
  const userId = Number(input.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return;
  }
  const refId = String(input.refId ?? '').trim().slice(0, 60) || null;
  const sourceRaw = String(input.source || '').trim().toLowerCase();
  const source = ALLOWED_SOURCES.has(sourceRaw) ? sourceRaw : 'other';
  await ensureTable();
  await mysql.query(
    `INSERT INTO engagement_events (user_id, event_type, ref_id, source) VALUES (?, ?, ?, ?)`,
    [userId, type, refId, source],
  );
};

const toUtcSql = (ms: number) =>
  new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

/** Start of today (IST), the last 7 days (today + 6), and all time, as UTC stamps. */
const windows = () => {
  const now = Date.now();
  const istMidnightMs =
    Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  return {
    today: toUtcSql(istMidnightMs),
    week: toUtcSql(istMidnightMs - 6 * DAY_MS),
    all: '1970-01-02 00:00:00',
  };
};

type WindowKey = 'today' | 'week' | 'all';
const WINDOW_KEYS: WindowKey[] = ['today', 'week', 'all'];

export type Counts = {opens: number; members: number};
const zero = (): Counts => ({opens: 0, members: 0});

/** Opens + distinct members for one event type, per window (optionally by source). */
const totalsFor = async (type: EngagementType, source?: string) => {
  await ensureTable();
  const w = windows();
  const out: Record<WindowKey, Counts> = {
    today: zero(),
    week: zero(),
    all: zero(),
  };
  for (const key of WINDOW_KEYS) {
    const rows = await mysql.query<any[]>(
      `
      SELECT COUNT(*) AS opens, COUNT(DISTINCT user_id) AS members
      FROM engagement_events
      WHERE event_type = ?
        AND created_at >= ?
        ${source ? 'AND source = ?' : ''}
      `,
      source ? [type, w[key], source] : [type, w[key]],
    );
    out[key] = {
      opens: Number(rows?.[0]?.opens || 0),
      members: Number(rows?.[0]?.members || 0),
    };
  }
  return out;
};

export const getBannerAnalytics = async () => {
  await ensureTable();
  const w = windows();
  const banners = await mysql.query<any[]>(
    `SELECT id, title, status, module_name AS moduleName FROM app_banners ORDER BY id DESC`,
  );
  const perWindow: Record<WindowKey, Map<string, Counts>> = {
    today: new Map(),
    week: new Map(),
    all: new Map(),
  };
  for (const key of WINDOW_KEYS) {
    const rows = await mysql.query<any[]>(
      `
      SELECT ref_id AS refId, COUNT(*) AS opens, COUNT(DISTINCT user_id) AS members
      FROM engagement_events
      WHERE event_type = 'BANNER_TAP' AND created_at >= ?
      GROUP BY ref_id
      `,
      [w[key]],
    );
    for (const row of rows || []) {
      perWindow[key].set(String(row.refId || ''), {
        opens: Number(row.opens || 0),
        members: Number(row.members || 0),
      });
    }
  }
  const known = new Set<string>();
  const items = (banners || []).map(row => {
    const id = String(row.id);
    known.add(id);
    return {
      bannerId: id,
      title: String(row.title || `Banner #${id}`),
      status: String(row.status || 'Active'),
      today: perWindow.today.get(id) || zero(),
      week: perWindow.week.get(id) || zero(),
      all: perWindow.all.get(id) || zero(),
    };
  });
  // Banners that were deleted after being tapped still show their numbers.
  for (const id of perWindow.all.keys()) {
    if (id && !known.has(id)) {
      items.push({
        bannerId: id,
        title: `Banner #${id} (removed)`,
        status: 'Removed',
        today: perWindow.today.get(id) || zero(),
        week: perWindow.week.get(id) || zero(),
        all: perWindow.all.get(id) || zero(),
      });
    }
  }
  items.sort((a, b) => b.all.opens - a.all.opens);
  return {totals: await totalsFor('BANNER_TAP'), items};
};

export const getHomamAnalytics = async () => {
  await ensureTable();
  const queue = await mysql.query<any[]>(
    `
    SELECT
      id,
      title,
      message,
      recipient_count AS recipientCount,
      IFNULL(processed_at, IFNULL(send_at, created_at)) AS sentAt
    FROM admin_notification_queue
    WHERE action_type = ? AND status IN ('SENT', 'SENDING')
    ORDER BY id DESC
    LIMIT 30
    `,
    [HOMAM_ACTION_TYPE],
  );

  const ids = (queue || [])
    .map(row => Number(row.id))
    .filter(id => Number.isFinite(id) && id > 0);
  let opened = new Map<number, number>();
  if (ids.length) {
    try {
      for (let pass = 0; pass < 8; pass++) {
        const filled = await notificationRepository
          .backfillBroadcastIdsForQueueIds(ids)
          .catch(() => 0);
        if (!filled) {
          break;
        }
      }
      opened = await notificationRepository.countOpenedForQueueIds(ids);
    } catch {
      opened = new Map();
    }
  }

  const messages = (queue || []).map(row => {
    const id = Number(row.id);
    const received = Math.max(0, Number(row.recipientCount || 0));
    const openedCount = Math.min(received, Number(opened.get(id) || 0));
    return {
      id,
      title: String(row.title || ''),
      message: String(row.message || ''),
      sentAt: String(row.sentAt || ''),
      received,
      opened: openedCount,
      openedRate:
        received > 0 ? Math.round((openedCount / received) * 1000) / 10 : 0,
    };
  });

  // Devotees who ever got a homam message, and how many have opened one.
  let devoteesMessaged = 0;
  let devoteesOpened = 0;
  try {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        COUNT(DISTINCT user_id) AS messaged,
        COUNT(DISTINCT CASE WHEN IFNULL(user_opened, 0) = 1 THEN user_id END) AS opened
      FROM notifications
      WHERE action_type = ?
      `,
      [HOMAM_ACTION_TYPE],
    );
    devoteesMessaged = Number(rows?.[0]?.messaged || 0);
    devoteesOpened = Number(rows?.[0]?.opened || 0);
  } catch {
    // Counters stay 0 if the column is not there yet.
  }

  return {
    devoteesMessaged,
    devoteesOpened,
    viaServices: await totalsFor('HOMAM_UPDATES_OPEN', 'services'),
    viaNotifications: await totalsFor('HOMAM_UPDATES_OPEN', 'notification'),
    messages,
  };
};

export const TOP_CHANTERS_PUSH_KEY_PREFIX = 'top_chanters_push_';

export const getTopChantersOpenAnalytics = async () => {
  await ensureTable();
  const daily = await mysql.query<any[]>(
    `
    SELECT
      ref_id AS refId,
      COUNT(*) AS opens,
      COUNT(DISTINCT user_id) AS members,
      SUM(CASE WHEN source = 'home' THEN 1 ELSE 0 END) AS fromHome,
      SUM(CASE WHEN source IN ('notification', 'push') THEN 1 ELSE 0 END) AS fromPush
    FROM engagement_events
    WHERE event_type = 'TOP10_OPEN' AND ref_id IS NOT NULL
    GROUP BY ref_id
    ORDER BY ref_id DESC
    LIMIT 30
    `,
  );
  const days = [] as Array<{
    date: string;
    opens: number;
    members: number;
    fromHome: number;
    fromPush: number;
    pushSent: number;
  }>;
  for (const row of daily || []) {
    const date = String(row.refId || '');
    let pushSent = 0;
    try {
      const raw = await appSettingsService.getSetting(
        `${TOP_CHANTERS_PUSH_KEY_PREFIX}${date}`,
        '',
      );
      pushSent = Number(JSON.parse(raw || '{}')?.sent || 0);
    } catch {
      pushSent = 0;
    }
    days.push({
      date,
      opens: Number(row.opens || 0),
      members: Number(row.members || 0),
      fromHome: Number(row.fromHome || 0),
      fromPush: Number(row.fromPush || 0),
      pushSent,
    });
  }
  return {totals: await totalsFor('TOP10_OPEN'), days};
};
