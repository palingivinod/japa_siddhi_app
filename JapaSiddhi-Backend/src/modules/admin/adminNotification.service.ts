import {ResultSetHeader} from 'mysql2';

import mysql from '../../database/mysql';
import {admin, isFirebaseReady} from '../../firebase/firebase';
import notificationService from '../notification/notification.service';

export type AdminNotifyTarget = 'all' | 'active_japa' | 'blocked';

let queueReady = false;
let fcmColumnReady = false;

const ensureFcmColumn = async () => {
  if (fcmColumnReady) {
    return;
  }
  fcmColumnReady = true;
  try {
    await mysql.query(`ALTER TABLE users ADD COLUMN fcm_token TEXT NULL`);
  } catch {
    // Column already exists.
  }
};

const ensureQueueTable = async () => {
  if (queueReady) {
    return;
  }
  const engine = mysql.getEngineName() || 'sqlite';
  if (engine === 'mysql') {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS admin_notification_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        translations TEXT NULL,
        target_group VARCHAR(40) NOT NULL,
        send_at DATETIME NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        recipient_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME NULL
      )
    `);
  } else {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS admin_notification_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        translations TEXT,
        target_group TEXT NOT NULL,
        send_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        recipient_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at TEXT
      )
    `);
  }
  queueReady = true;
};

/**
 * Wall-clock stamp in Asia/Kolkata. Admin "Later" times are chosen on the
 * phone as local IST; Render runs in UTC, so we must never use server-local
 * Date.parse / NOW() for schedule comparisons.
 */
const nowIstStamp = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find(part => part.type === type)?.value || '00';
  // en-GB can still emit 24:xx near midnight in some engines — normalize.
  let hour = get('hour');
  if (hour === '24') {
    hour = '00';
  }
  return `${get('year')}-${get('month')}-${get('day')} ${hour}:${get(
    'minute',
  )}:${get('second')}`;
};

/** Keep the client wall-clock string; do not shift by server timezone. */
const normalizeScheduleStamp = (raw: string) => {
  let sendAt = String(raw || '').trim();
  if (!sendAt) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(sendAt)) {
    return `${sendAt} 09:00:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(sendAt)) {
    sendAt = sendAt.replace('T', ' ').slice(0, 19);
    if (sendAt.length === 16) {
      sendAt = `${sendAt}:00`;
    }
    return sendAt;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(sendAt)) {
    return `${sendAt}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(sendAt)) {
    return sendAt.slice(0, 19);
  }
  return '';
};

const localDateTime = (date = new Date()) => nowIstStamp(date);

const mapTarget = (raw: string): AdminNotifyTarget => {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (value === 'active_japa' || value === 'activejapa') {
    return 'active_japa';
  }
  if (value === 'blocked') {
    return 'blocked';
  }
  return 'all';
};

const parseJsonSafely = (val: any) => {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    const res = JSON.parse(val);
    return typeof res === 'object' && res !== null ? res : {};
  } catch {
    return {};
  }
};

/**
 * Device push tokens live in fcm_token. Also look up user preferred language code.
 */
const loadRecipients = async (target: AdminNotifyTarget) => {
  await ensureFcmColumn();

  const selectCols = `
    u.id,
    u.fcm_token AS fcmToken,
    COALESCE(us.language_code, l.code, 'en') AS langCode
  `;
  const joins = `
    LEFT JOIN user_settings us ON us.user_id = u.id
    LEFT JOIN languages l ON l.id = u.preferred_language_id
  `;

  if (target === 'blocked') {
    return mysql.query<any[]>(`
      SELECT ${selectCols}
      FROM users u
      ${joins}
      WHERE u.deleted_at IS NULL
        AND UPPER(IFNULL(u.account_status, 'ACTIVE')) IN ('BLOCKED', 'SUSPENDED')
    `);
  }

  if (target === 'active_japa') {
    return mysql.query<any[]>(`
      SELECT ${selectCols}
      FROM users u
      ${joins}
      WHERE u.deleted_at IS NULL
        AND UPPER(IFNULL(u.account_status, 'ACTIVE')) NOT IN ('BLOCKED', 'SUSPENDED')
        AND IFNULL((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.user_id = u.id
        ), 0) > 0
    `);
  }

  return mysql.query<any[]>(`
    SELECT ${selectCols}
    FROM users u
    ${joins}
    WHERE u.deleted_at IS NULL
      AND UPPER(IFNULL(u.account_status, 'ACTIVE')) NOT IN ('BLOCKED', 'SUSPENDED')
  `);
};

/**
 * Check if the current time is within allowed notification hours (7:00 AM to 10:00 PM IST).
 * Outside 7 AM - 10 PM Indian Standard Time, notifications are suppressed.
 */
export const isWithinNotificationHoursIST = (): boolean => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hourCycle: 'h23',
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    return hour >= 7 && hour < 22;
  } catch {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const istMinutes = utcHours * 60 + utcMinutes + 330;
    const istHour = Math.floor((istMinutes / 60) % 24);
    return istHour >= 7 && istHour < 22;
  }
};

const tryPush = async (
  tokens: string[],
  title: string,
  message: string,
  dataType = 'ADMIN_BROADCAST',
  extraData?: Record<string, string>,
) => {
  if (!isWithinNotificationHoursIST()) {
    return {
      pushSent: 0,
      pushFailed: 0,
      pushSkipped: 'quiet_hours_7am_to_10pm_ist' as string | null,
    };
  }

  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) {
    return {
      pushSent: 0,
      pushFailed: 0,
      pushSkipped: 'no_tokens' as string | null,
    };
  }
  if (!isFirebaseReady()) {
    const {getFirebaseInitError} = await import('../../firebase/firebase');
    return {
      pushSent: 0,
      pushFailed: 0,
      pushSkipped: (getFirebaseInitError() ||
        'firebase_not_configured') as string | null,
    };
  }

  try {
    const safeExtra: Record<string, string> = {};
    Object.entries(extraData || {}).forEach(([key, value]) => {
      if (value != null && String(value).trim() !== '') {
        safeExtra[key] = String(value);
      }
    });
    const result = await admin.messaging().sendEachForMulticast({
      tokens: unique.slice(0, 500),
      notification: {title, body: message},
      data: {
        type: String(dataType || 'ADMIN_BROADCAST'),
        title,
        body: message,
        ...safeExtra,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'fcm_fallback_notification_channel',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title,
              body: message,
            },
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
      },
    });
    const pushSent = result.successCount || 0;
    const pushFailed = result.failureCount || 0;
    const firstError = (result.responses || []).find(r => !r.success)?.error
      ?.message;
    return {
      pushSent,
      pushFailed,
      pushSkipped:
        pushSent === 0
          ? (firstError || 'push_failed')
          : (null as string | null),
    };
  } catch (error: any) {
    return {
      pushSent: 0,
      pushFailed: unique.length,
      pushSkipped: error?.message || 'push_failed',
    };
  }
};

/** Send a system tray / banner push to one or more device tokens. */
export const sendPushToTokens = (
  tokens: string[],
  title: string,
  message: string,
  dataType = 'REMINDER',
  extraData?: Record<string, string>,
) => tryPush(tokens, title, message, dataType, extraData);

export const deliverAdminNotification = async (input: {
  title: string;
  message: string;
  target: AdminNotifyTarget;
  translations?: Record<string, any> | string | null;
  extraData?: Record<string, any>;
}) => {
  const recipients = await loadRecipients(input.target);
  const parsedTrans = parseJsonSafely(input.translations);

  const tokensByLang: Record<string, string[]> = {};

  for (const user of recipients || []) {
    const userId = Number(user.id);
    if (!userId) continue;

    const userLang = String(user.langCode || 'en').toLowerCase();
    const userTrans = parsedTrans[userLang] || parsedTrans['en'] || {};
    const title = String(userTrans.title || input.title || '').trim();
    const message = String(userTrans.message || input.message || '').trim();

    await notificationService.create({
      userId,
      title,
      message,
      notificationType: 'SYSTEM',
      actionType: 'ADMIN_BROADCAST',
      actionId: null,
      extraData: {
        target: input.target,
        translations: parsedTrans,
        ...(input.extraData || {}),
      },
    });

    const fcm = String(user.fcmToken || '').trim();
    if (fcm) {
      if (!tokensByLang[userLang]) {
        tokensByLang[userLang] = [];
      }
      tokensByLang[userLang].push(fcm);
    }
  }

  let totalPushSent = 0;
  let totalPushFailed = 0;
  let lastPushSkipped: string | null = null;

  for (const [langCode, tokens] of Object.entries(tokensByLang)) {
    const langTrans = parsedTrans[langCode] || parsedTrans['en'] || {};
    const pushTitle = String(langTrans.title || input.title || '').trim();
    const pushMessage = String(langTrans.message || input.message || '').trim();
    const pushResult = await tryPush(tokens, pushTitle, pushMessage);
    totalPushSent += pushResult.pushSent;
    totalPushFailed += pushResult.pushFailed;
    if (pushResult.pushSkipped) {
      lastPushSkipped = pushResult.pushSkipped;
    }
  }

  return {
    recipientCount: (recipients || []).length,
    pushSent: totalPushSent,
    pushFailed: totalPushFailed,
    pushSkipped: totalPushSent > 0 ? null : lastPushSkipped,
  };
};

export const flushDueAdminNotifications = async () => {
  if (!isWithinNotificationHoursIST()) {
    return;
  }
  await ensureQueueTable();
  const now = nowIstStamp();
  const due = await mysql.query<any[]>(
    `
      SELECT id, title, message, translations, target_group AS targetGroup
      FROM admin_notification_queue
      WHERE status = 'PENDING'
        AND send_at <= ?
      ORDER BY id ASC
      LIMIT 20
    `,
    [now],
  );

  for (const job of due || []) {
    try {
      const result = await deliverAdminNotification({
        title: job.title,
        message: job.message,
        translations: job.translations,
        target: mapTarget(job.targetGroup),
        extraData: {queuedId: job.id},
      });
      await mysql.query(
        `
        UPDATE admin_notification_queue
        SET status = 'SENT',
            recipient_count = ?,
            processed_at = ?
        WHERE id = ?
          AND status = 'PENDING'
        `,
        [result.recipientCount, now, job.id],
      );
    } catch (error) {
      console.warn(`Scheduled admin notification ${job.id} failed:`, error);
      await mysql.query(
        `
        UPDATE admin_notification_queue
        SET status = 'FAILED',
            processed_at = ?
        WHERE id = ?
          AND status = 'PENDING'
        `,
        [now, job.id],
      );
    }
  }
};

export const sendAdminNotification = async (input: {
  title: string;
  message: string;
  translations?: Record<string, any> | string;
  targetRaw: string;
  scheduleRaw: string;
  scheduledAt?: string;
}) => {
  await ensureQueueTable();
  await flushDueAdminNotifications();

  const title = String(input.title || '').trim();
  const message = String(input.message || '').trim();
  if (!title || !message) {
    const error: any = new Error('Title and message are required.');
    error.statusCode = 400;
    throw error;
  }

  const target = mapTarget(input.targetRaw);
  const schedule = String(input.scheduleRaw || 'now').trim().toLowerCase();
  const sendNow = schedule !== 'later';
  const translations =
    typeof input.translations === 'object'
      ? JSON.stringify(input.translations)
      : input.translations || null;

  if (!sendNow) {
    const sendAt = normalizeScheduleStamp(String(input.scheduledAt || ''));
    if (!sendAt) {
      const error: any = new Error(
        'Pick a date and time for a scheduled notification.',
      );
      error.statusCode = 400;
      throw error;
    }

    const now = nowIstStamp();
    if (sendAt <= now) {
      const error: any = new Error(
        'Schedule time must be in the future (India time).',
      );
      error.statusCode = 400;
      throw error;
    }

    const insert = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO admin_notification_queue (
        title, message, translations, target_group, send_at, status
      ) VALUES (?, ?, ?, ?, ?, 'PENDING')
      `,
      [title, message, translations, target, sendAt],
    );

    return {
      mode: 'scheduled' as const,
      queueId: insert.insertId,
      target,
      sendAt,
      recipientCount: 0,
      pushSent: 0,
      message: `Scheduled for ${sendAt} IST in all languages. It will send automatically around that time.`,
    };
  }

  const delivered = await deliverAdminNotification({
    title,
    message,
    translations,
    target,
  });
  const pushNote = delivered.pushSent
    ? ` and ${delivered.pushSent} push popup(s)`
    : delivered.pushSkipped
      ? ` (push skipped: ${delivered.pushSkipped})`
      : '';
  return {
    mode: 'sent' as const,
    target,
    sendAt: localDateTime(),
    ...delivered,
    message:
      delivered.recipientCount > 0
        ? `Sent to ${delivered.recipientCount} user(s) in-app in their language${pushNote}.`
        : 'No matching users found for this target group.',
  };
};

export default {
  sendAdminNotification,
  flushDueAdminNotifications,
  mapTarget,
};
