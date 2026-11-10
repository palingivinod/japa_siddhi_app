import {ResultSetHeader} from 'mysql2';

import mysql from '../../database/mysql';
import {admin, isFirebaseReady} from '../../firebase/firebase';
import notificationService from '../notification/notification.service';

export type AdminNotifyTarget = 'all' | 'active_japa' | 'blocked' | 'selected_users';

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
  try {
    await mysql.query(
      `ALTER TABLE admin_notification_queue ADD COLUMN recipient_ids TEXT NULL`,
    );
  } catch {
    // Column already exists.
  }
  try {
    await mysql.query(
      `ALTER TABLE admin_notification_queue ADD COLUMN bypass_hours INT NOT NULL DEFAULT 0`,
    );
  } catch {
    // Column already exists.
  }
  try {
    await mysql.query(
      `ALTER TABLE admin_notification_queue ADD COLUMN image_url TEXT NULL`,
    );
  } catch {
    // Column already exists.
  }
  try {
    await mysql.query(
      `ALTER TABLE admin_notification_queue ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT 'general'`,
    );
  } catch {
    // Column already exists.
  }
  try {
    await mysql.query(
      `ALTER TABLE admin_notification_queue ADD COLUMN action_type VARCHAR(60) NULL`,
    );
  } catch {
    // Column already exists.
  }
  queueReady = true;
};

/**
 * Wall-clock stamp in Asia/Kolkata. Admin "Later" times are chosen on the
 * phone as local IST; Render runs in UTC, so we must never use server-local
 * Date.parse / NOW() for schedule comparisons.
 */
export const nowIstStamp = (date = new Date()) => {
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

const isTestTarget = (raw: string) => {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return value === 'test';
};

/**
 * Resolve a single devotee for Notification Management → Test.
 * Accepts user id, user code, phone, email, or full name.
 */
export const resolveTestUser = async (rawQuery: string) => {
  const query = String(rawQuery || '').trim();
  if (!query) {
    const error: any = new Error(
      'Enter a name, user id, phone, or email for the Test person.',
    );
    error.statusCode = 400;
    throw error;
  }

  const digits = query.replace(/\D/g, '');
  const like = `%${query.replace(/[%_]/g, '')}%`;

  let rows: any[] = [];
  try {
    if (/^\d+$/.test(query)) {
      rows = await mysql.query<any[]>(
        `
        SELECT u.id, u.full_name AS fullName, u.email, u.mobile_number AS mobileNumber
        FROM users u
        WHERE u.deleted_at IS NULL AND u.id = ?
        LIMIT 1
        `,
        [Number(query)],
      );
    }

    if (!rows?.length && query.includes('@')) {
      rows = await mysql.query<any[]>(
        `
        SELECT u.id, u.full_name AS fullName, u.email, u.mobile_number AS mobileNumber
        FROM users u
        WHERE u.deleted_at IS NULL AND LOWER(TRIM(u.email)) = LOWER(?)
        LIMIT 5
        `,
        [query],
      );
    }

    if (!rows?.length && digits.length >= 8) {
      rows = await mysql.query<any[]>(
        `
        SELECT u.id, u.full_name AS fullName, u.email, u.mobile_number AS mobileNumber
        FROM users u
        WHERE u.deleted_at IS NULL
          AND (
            REPLACE(REPLACE(REPLACE(IFNULL(u.mobile_number, ''), ' ', ''), '-', ''), '+', '') LIKE ?
            OR CONCAT(
              IFNULL(u.mobile_country_code, ''),
              IFNULL(u.mobile_number, '')
            ) LIKE ?
          )
        LIMIT 5
        `,
        [`%${digits}%`, `%${digits}%`],
      );
    }

    if (!rows?.length) {
      rows = await mysql.query<any[]>(
        `
        SELECT u.id, u.full_name AS fullName, u.email, u.mobile_number AS mobileNumber
        FROM users u
        WHERE u.deleted_at IS NULL
          AND (
            LOWER(IFNULL(u.user_code, '')) = LOWER(?)
            OR LOWER(IFNULL(u.full_name, '')) = LOWER(?)
            OR LOWER(IFNULL(u.full_name, '')) LIKE LOWER(?)
          )
        ORDER BY
          CASE
            WHEN LOWER(IFNULL(u.user_code, '')) = LOWER(?) THEN 0
            WHEN LOWER(IFNULL(u.full_name, '')) = LOWER(?) THEN 1
            ELSE 2
          END,
          u.id DESC
        LIMIT 5
        `,
        [query, query, like, query, query],
      );
    }
  } catch (err) {
    console.warn('resolveTestUser query failed:', err);
    const error: any = new Error('Unable to look up the Test person.');
    error.statusCode = 500;
    throw error;
  }

  if (!rows?.length) {
    const error: any = new Error(
      `No user found for "${query}". Check the name, id, phone, or email.`,
    );
    error.statusCode = 404;
    throw error;
  }

  if (rows.length > 1) {
    const names = rows
      .slice(0, 3)
      .map(
        (r: any) =>
          `#${r.id} ${r.fullName || r.email || r.mobileNumber || ''}`.trim(),
      )
      .join('; ');
    const error: any = new Error(
      `Multiple users match "${query}" (${names}). Use a user id, phone, or email instead.`,
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    id: Number(rows[0].id),
    fullName: String(rows[0].fullName || ''),
    email: String(rows[0].email || ''),
    mobileNumber: String(rows[0].mobileNumber || ''),
  };
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

/** Fix auto-translate junk like "ఇది%20is%20a%20Test" before store/push. */
const sanitizeNotifyText = (val: any) => {
  let out = String(val || '').trim();
  if (!out) {
    return '';
  }
  if (/MYMEMORY WARNING/i.test(out)) {
    return '';
  }
  for (let i = 0; i < 3; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(out)) {
      break;
    }
    try {
      const decoded = decodeURIComponent(out.replace(/\+/g, ' '));
      if (!decoded || decoded === out) {
        out = out.replace(/%20/gi, ' ');
        break;
      }
      out = decoded;
    } catch {
      out = out.replace(/%20/gi, ' ');
      break;
    }
  }
  // Normalize line breaks and preserve paragraph spacing (do NOT collapse \n to space)
  return out
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[^\S\r\n]*\n[^\S\r\n]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const sanitizeNotifyTitle = (val: any) => {
  return sanitizeNotifyText(val).replace(/\n+/g, ' ').trim();
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

  try {
    if (target === 'blocked') {
      return await mysql.query<any[]>(`
        SELECT ${selectCols}
        FROM users u
        ${joins}
        WHERE u.deleted_at IS NULL
          AND UPPER(IFNULL(u.account_status, 'ACTIVE')) IN ('BLOCKED', 'SUSPENDED')
      `);
    }

    if (target === 'active_japa') {
      return await mysql.query<any[]>(`
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

    return await mysql.query<any[]>(`
      SELECT ${selectCols}
      FROM users u
      ${joins}
      WHERE u.deleted_at IS NULL
        AND UPPER(IFNULL(u.account_status, 'ACTIVE')) NOT IN ('BLOCKED', 'SUSPENDED')
    `);
  } catch (err) {
    // Fallback if joins/columns differ across SQLite/MySQL installs.
    console.warn('loadRecipients primary query failed, using fallback:', err);
    return mysql.query<any[]>(`
      SELECT
        u.id,
        u.fcm_token AS fcmToken,
        'en' AS langCode
      FROM users u
      WHERE u.deleted_at IS NULL
        AND UPPER(IFNULL(u.account_status, 'ACTIVE')) NOT IN ('BLOCKED', 'SUSPENDED')
    `);
  }
};

const loadRecipientsByIds = async (userIds: number[]) => {
  await ensureFcmColumn();
  const ids = [
    ...new Set(
      (userIds || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0),
    ),
  ];
  if (!ids.length) {
    return [];
  }
  const placeholders = ids.map(() => '?').join(',');
  const selectCols = `
    u.id,
    u.fcm_token AS fcmToken,
    COALESCE(us.language_code, l.code, 'en') AS langCode
  `;
  const joins = `
    LEFT JOIN user_settings us ON us.user_id = u.id
    LEFT JOIN languages l ON l.id = u.preferred_language_id
  `;
  try {
    return await mysql.query<any[]>(
      `
      SELECT ${selectCols}
      FROM users u
      ${joins}
      WHERE u.deleted_at IS NULL
        AND u.id IN (${placeholders})
      `,
      ids,
    );
  } catch (err) {
    console.warn('loadRecipientsByIds primary query failed, using fallback:', err);
    return mysql.query<any[]>(
      `
      SELECT
        u.id,
        u.fcm_token AS fcmToken,
        'en' AS langCode
      FROM users u
      WHERE u.deleted_at IS NULL
        AND u.id IN (${placeholders})
      `,
      ids,
    );
  }
};

const parseRecipientIds = (raw: unknown): number[] => {
  const text = String(raw || '').trim();
  if (!text) {
    return [];
  }
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0);
    }
  } catch {
    // Comma-separated fallback.
  }
  return text
    .split(/[,|\s]+/)
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0);
};

/**
 * Check if the current time is within allowed notification hours (6:00 AM to 10:00 PM IST).
 * Outside 6 AM - 10 PM Indian Standard Time, notifications are suppressed.
 */
export const isWithinNotificationHoursIST = (): boolean => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hourCycle: 'h23',
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    return hour >= 6 && hour < 22;
  } catch {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const istMinutes = utcHours * 60 + utcMinutes + 330;
    const istHour = Math.floor((istMinutes / 60) % 24);
    return istHour >= 6 && istHour < 22;
  }
};

const tryPush = async (
  tokens: string[],
  title: string,
  message: string,
  dataType = 'ADMIN_BROADCAST',
  extraData?: Record<string, string>,
  bypassHours = false,
) => {
  if (!bypassHours && !isWithinNotificationHoursIST()) {
    return {
      pushSent: 0,
      pushFailed: 0,
      pushSkipped: 'quiet_hours_6am_to_10pm_ist' as string | null,
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
    // Android: data-only so JapaFirebaseMessagingService can draw MessagingStyle
    // with full-color logo on the LEFT. A system `notification` payload would
    // make the OS show only the small white icon and skip our custom tray.
    const result = await admin.messaging().sendEachForMulticast({
      tokens: unique.slice(0, 500),
      data: {
        type: String(dataType || 'ADMIN_BROADCAST'),
        actionType: String(
          safeExtra.actionType || dataType || 'ADMIN_BROADCAST',
        ),
        title,
        body: message,
        badge: String(safeExtra.badge || '1'),
        ...safeExtra,
      },
      android: {
        priority: 'high',
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
            badge: Number(safeExtra.badge || 1),
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
  bypassHours = false,
) => tryPush(tokens, title, message, dataType, extraData, bypassHours);

const routingExtraKeys = [
  'challengeId',
  'mantraId',
  'rewardId',
  'bannerId',
  'productId',
  'contentKind',
  'screen',
] as const;

const buildRoutingPushExtra = (
  actionType: string,
  actionId: number | null,
  extraData?: Record<string, any>,
) => {
  const pushExtra: Record<string, string> = {
    actionType,
    actionId: actionId != null ? String(actionId) : '',
  };
  routingExtraKeys.forEach(key => {
    const value = extraData?.[key];
    if (value != null && String(value).trim() !== '') {
      pushExtra[key] = String(value);
    }
  });
  return pushExtra;
};

export const deliverAdminNotification = async (input: {
  title: string;
  message: string;
  target: AdminNotifyTarget;
  userIds?: number[];
  translations?: Record<string, any> | string | null;
  extraData?: Record<string, any>;
  actionType?: string;
  actionId?: number | null;
  /** Public https URL shown as Big Picture in the Android tray. */
  imageUrl?: string | null;
  /** Optional video for in-app notification playback (does not replace image/url). */
  videoUrl?: string | null;
  url?: string | null;
  link?: string | null;
  /** When true, push even outside 7 AM–10 PM IST (e.g. class going live). */
  bypassHours?: boolean;
}) => {
  const targetedIds = Array.isArray(input.userIds)
    ? input.userIds
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0)
    : [];
  const recipients = targetedIds.length
    ? await loadRecipientsByIds(targetedIds)
    : await loadRecipients(input.target);
  const parsedTrans = parseJsonSafely(input.translations);
  const BRAND_HEADING = 'Japasiddhi - Bilva Patra Trust';
  const actionType =
    String(input.actionType || 'ADMIN_BROADCAST').trim() || 'ADMIN_BROADCAST';
  const actionId =
    input.actionId != null && Number(input.actionId) > 0
      ? Number(input.actionId)
      : null;
  const imageUrl = String(input.imageUrl || '').trim();
  const videoUrl = String(input.videoUrl || input.extraData?.videoUrl || '').trim();
  let extractedUrl =
    String((input as any).url || (input as any).link || (input as any).linkUrl || '').trim() ||
    String(input.extraData?.url || input.extraData?.link || '').trim() ||
    String(input.message || '').match(/(?:https?:\/\/|www\.)[^\s]+/i)?.[0] ||
    '';
  if (extractedUrl) {
    while (/[.,!?);:\]\>]$/.test(extractedUrl)) {
      extractedUrl = extractedUrl.slice(0, -1);
    }
    if (/^www\./i.test(extractedUrl)) {
      extractedUrl = `https://${extractedUrl}`;
    }
  }

  const tokensByLang: Record<string, string[]> = {};
  let inboxCreated = 0;

  // Build clean, sanitized translation map so mobile in-app list can dynamically switch language
  const cleanTranslations: Record<string, {title: string; message: string}> = {};
  Object.entries(parsedTrans).forEach(([code, trans]: [string, any]) => {
    if (trans && (trans.title || trans.message)) {
      cleanTranslations[code] = {
        title: sanitizeNotifyTitle(trans.title || ''),
        message: sanitizeNotifyText(trans.message || ''),
      };
    }
  });
  if (!cleanTranslations.en && (input.title || input.message)) {
    cleanTranslations.en = {
      title: sanitizeNotifyTitle(input.title || ''),
      message: sanitizeNotifyText(input.message || ''),
    };
  }

  for (const user of recipients || []) {
    const userId = Number(user.id);
    if (!userId) continue;

    const userLang = String(user.langCode || 'en').toLowerCase();
    const userTrans = parsedTrans[userLang] || parsedTrans['en'] || {};
    // Admin: clean tray text — no "Announcement" labels.
    // Title = admin subject, body = admin message only.
    const subject =
      sanitizeNotifyTitle(userTrans.title || input.title) || 'Update';
    const detail = sanitizeNotifyText(userTrans.message || input.message);
    const pushTitle = subject;
    const pushBody = detail || subject;

    try {
      // Keep extra_data small — large translation packs can break inserts.
      const slimExtra = {
        target: targetedIds.length ? 'selected_users' : input.target,
        mantraName: subject,
        detail,
        pushTitle,
        pushBody,
        ...(imageUrl ? {imageUrl} : {}),
        ...(videoUrl ? {videoUrl} : {}),
        ...(extractedUrl ? {url: extractedUrl, link: extractedUrl} : {}),
        ...(Object.keys(cleanTranslations).length ? {translations: cleanTranslations} : {}),
        ...(input.extraData || {}),
      };
      await notificationService.create({
        userId,
        title: BRAND_HEADING,
        message: pushBody,
        notificationType: 'SYSTEM',
        actionType,
        actionId,
        extraData: slimExtra,
      });
      inboxCreated += 1;
    } catch (err) {
      console.warn('Admin notify inbox create failed for user', userId, err);
    }

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
    const subject =
      sanitizeNotifyTitle(langTrans.title || input.title) || 'Update';
    const detail = sanitizeNotifyText(langTrans.message || input.message);
    const pushTitle = subject;
    const pushBody = detail || subject;
    const pushResult = await tryPush(
      tokens,
      pushTitle,
      pushBody,
      actionType,
      {
        ...buildRoutingPushExtra(actionType, actionId, input.extraData),
        mantraName: subject,
        ...(imageUrl ? {imageUrl} : {}),
        ...(extractedUrl ? {url: extractedUrl, link: extractedUrl} : {}),
      },
      Boolean(input.bypassHours),
    );
    totalPushSent += pushResult.pushSent;
    totalPushFailed += pushResult.pushFailed;
    if (pushResult.pushSkipped) {
      lastPushSkipped = pushResult.pushSkipped;
    }
  }

  return {
    recipientCount: (recipients || []).length,
    inboxCreated,
    pushSent: totalPushSent,
    pushFailed: totalPushFailed,
    pushSkipped: totalPushSent > 0 ? null : lastPushSkipped,
  };
};

/**
 * When admin adds a mantra / challenge / reward / banner / product,
 * notify all users (inbox + tray) with a deep-link action type.
 */
export const notifyAdminContentCreated = async (input: {
  kind: 'challenge' | 'mantra' | 'reward' | 'banner' | 'product';
  id: number | string;
  name: string;
}) => {
  const id = Number(input.id);
  if (!Number.isFinite(id) || id <= 0) {
    return {recipientCount: 0, pushSent: 0, pushFailed: 0, pushSkipped: 'no_id'};
  }
  const name = String(input.name || '').trim() || 'Update';

  const configs = {
    challenge: {
      actionType: 'ADMIN_CHALLENGE_NEW',
      title: 'New Challenge',
      message: `"${name}" is now open. Tap to view and join.`,
      extraData: {challengeId: id, contentKind: 'challenge'},
    },
    mantra: {
      actionType: 'ADMIN_MANTRA_NEW',
      title: 'New Mantra',
      message: `"${name}" is now available. Tap to start japa.`,
      extraData: {mantraId: id, contentKind: 'mantra'},
    },
    reward: {
      actionType: 'ADMIN_REWARD_NEW',
      title: 'New Reward',
      message: `"${name}" has been added. Tap to explore rewards.`,
      extraData: {rewardId: id, contentKind: 'reward'},
    },
    banner: {
      actionType: 'ADMIN_BANNER_NEW',
      title: 'New Update',
      message: `${name}. Tap to open Home.`,
      extraData: {bannerId: id, contentKind: 'banner'},
    },
    product: {
      actionType: 'ADMIN_PRODUCT_NEW',
      title: 'New Offering',
      message: `"${name}" is now available. Tap to view.`,
      extraData: {productId: id, contentKind: 'product'},
    },
  } as const;

  const cfg = configs[input.kind];
  await ensureQueueTable();
  const now = nowIstStamp();
  let queueId: number | null = null;
  try {
    const queueInsert = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO admin_notification_queue (
        title, message, target_group, category, action_type, send_at, status,
        recipient_count, processed_at
      ) VALUES (?, ?, 'all', 'general', ?, ?, 'SENDING', 0, ?)
      `,
      [cfg.title, cfg.message, cfg.actionType, now, now],
    );
    queueId = Number(
      (queueInsert as any)?.insertId ?? (queueInsert as any)?.id ?? 0,
    );
  } catch (err) {
    console.warn('admin_notification_queue insert failed on notifyAdminContentCreated:', err);
  }

  const delivered = await deliverAdminNotification({
    title: cfg.title,
    message: cfg.message,
    target: 'all',
    actionType: cfg.actionType,
    actionId: id,
    extraData: {
      ...cfg.extraData,
      ...(queueId ? {broadcastId: queueId, queuedId: queueId} : {}),
    },
  });

  if (queueId) {
    try {
      await mysql.query(
        `
        UPDATE admin_notification_queue
        SET status = 'SENT',
            recipient_count = ?,
            processed_at = ?
        WHERE id = ?
        `,
        [delivered.recipientCount, now, queueId],
      );
    } catch (err) {
      console.warn('admin_notification_queue update failed:', err);
    }
  }

  return delivered;
};

export const flushDueAdminNotifications = async () => {
  await ensureQueueTable();
  const withinHours = isWithinNotificationHoursIST();
  const now = nowIstStamp();
  const due = await mysql.query<any[]>(
    `
      SELECT
        id,
        title,
        message,
        translations,
        target_group AS targetGroup,
        recipient_ids AS recipientIds,
        IFNULL(bypass_hours, 0) AS bypassHours,
        image_url AS imageUrl
      FROM admin_notification_queue
      WHERE status = 'PENDING'
        AND send_at <= ?
      ORDER BY id ASC
      LIMIT 20
    `,
    [now],
  );

  for (const job of due || []) {
    const bypass = Number(job.bypassHours || 0) === 1;
    if (!withinHours && !bypass) {
      continue;
    }
    try {
      // Claim the row first so a second poller/instance cannot send the same job.
      const claimed = await mysql.query<ResultSetHeader>(
        `
        UPDATE admin_notification_queue
        SET status = 'SENDING',
            processed_at = ?
        WHERE id = ?
          AND status = 'PENDING'
        `,
        [now, job.id],
      );
      const affected = Number(
        (claimed as any)?.affectedRows ??
          (claimed as any)?.changes ??
          0,
      );
      if (affected < 1) {
        continue;
      }

      const userIds = parseRecipientIds(job.recipientIds);
      const result = await deliverAdminNotification({
        title: job.title,
        message: job.message,
        translations: job.translations,
        target: mapTarget(job.targetGroup),
        userIds: userIds.length ? userIds : undefined,
        bypassHours: bypass,
        imageUrl: job.imageUrl || null,
        extraData: {queuedId: job.id},
      });
      await mysql.query(
        `
        UPDATE admin_notification_queue
        SET status = 'SENT',
            recipient_count = ?,
            processed_at = ?
        WHERE id = ?
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
          AND status IN ('PENDING', 'SENDING')
        `,
        [now, job.id],
      );
    }
  }
};

/** Block accidental repeat admin broadcasts of the same content. */
const DUPLICATE_SEND_WINDOW_MINUTES = 3;

/** Same-process rapid double-tap before the queue row exists. */
const liveBroadcastKeys = new Map<string, number>();

const broadcastDedupeKey = (
  title: string,
  message: string,
  targetGroup: string,
  recipientIdsJson: string | null,
) => `${title}\n${message}\n${targetGroup}\n${recipientIdsJson || ''}`;

const assertNoRecentDuplicateBroadcast = async (opts: {
  title: string;
  message: string;
  targetGroup: string;
  recipientIdsJson: string | null;
  actionType: string;
}) => {
  // Only guard manual admin broadcasts — automated jobs use other action types.
  const action = String(opts.actionType || 'ADMIN_BROADCAST').trim();
  if (action !== 'ADMIN_BROADCAST') {
    return;
  }

  const key = broadcastDedupeKey(
    opts.title,
    opts.message,
    opts.targetGroup,
    opts.recipientIdsJson,
  );
  const nowMs = Date.now();
  const windowMs = DUPLICATE_SEND_WINDOW_MINUTES * 60_000;
  for (const [k, startedAt] of liveBroadcastKeys) {
    if (nowMs - startedAt > windowMs) {
      liveBroadcastKeys.delete(k);
    }
  }
  if (liveBroadcastKeys.has(key)) {
    const error: any = new Error(
      `Same notification was already sent in the last ${DUPLICATE_SEND_WINDOW_MINUTES} minutes. Wait a bit, or change the title/message before sending again.`,
    );
    error.statusCode = 409;
    throw error;
  }

  try {
    const engine = mysql.getEngineName() || 'sqlite';
    const sinceExpr =
      engine === 'mysql'
        ? `NOW() - INTERVAL ${DUPLICATE_SEND_WINDOW_MINUTES} MINUTE`
        : engine === 'postgres'
          ? `NOW() - INTERVAL '${DUPLICATE_SEND_WINDOW_MINUTES} minutes'`
          : `datetime('now', '-${DUPLICATE_SEND_WINDOW_MINUTES} minutes')`;
    const coalesceAction =
      engine === 'postgres'
        ? `COALESCE(action_type, 'ADMIN_BROADCAST')`
        : `IFNULL(action_type, 'ADMIN_BROADCAST')`;
    const rows = await mysql.query<
      Array<{id?: number; createdAt?: string; sendAt?: string}>
    >(
      `
      SELECT id, created_at AS createdAt, send_at AS sendAt
      FROM admin_notification_queue
      WHERE title = ?
        AND message = ?
        AND target_group = ?
        AND ${coalesceAction} = 'ADMIN_BROADCAST'
        AND status IN ('PENDING', 'SENDING', 'SENT')
        AND created_at >= ${sinceExpr}
        AND (
          (? IS NULL AND recipient_ids IS NULL)
          OR recipient_ids = ?
        )
      ORDER BY id DESC
      LIMIT 1
      `,
      [
        opts.title,
        opts.message,
        opts.targetGroup,
        opts.recipientIdsJson,
        opts.recipientIdsJson,
      ],
    );
    if (rows?.length) {
      const error: any = new Error(
        `Same notification was already sent in the last ${DUPLICATE_SEND_WINDOW_MINUTES} minutes. Wait a bit, or change the title/message before sending again.`,
      );
      error.statusCode = 409;
      throw error;
    }
  } catch (err: any) {
    if (err?.statusCode === 409) {
      throw err;
    }
    // Queue table / SQL dialect issues must not block legitimate sends.
    console.warn('Duplicate broadcast check skipped:', err?.message || err);
  }

  liveBroadcastKeys.set(key, nowMs);
};

export const sendAdminNotification = async (input: {
  title: string;
  message: string;
  translations?: Record<string, any> | string;
  targetRaw: string;
  scheduleRaw: string;
  scheduledAt?: string;
  userIds?: number[];
  /** When Target Group is Test: name / id / phone / email of one person. */
  testQuery?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  url?: string | null;
  link?: string | null;
  linkUrl?: string | null;
  extraData?: Record<string, any>;
  /** Skip 7 AM–10 PM IST quiet hours (DOB wishes, live class, etc.). */
  bypassHours?: boolean;
  actionType?: string;
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

  let userIds = [
    ...new Set(
      (input.userIds || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0),
    ),
  ].sort((a, b) => a - b);
  let testUserLabel = '';
  if (isTestTarget(String(input.targetRaw || '')) && !userIds.length) {
    const resolved = await resolveTestUser(String(input.testQuery || ''));
    userIds = [resolved.id];
    testUserLabel =
      resolved.fullName ||
      resolved.email ||
      resolved.mobileNumber ||
      `user #${resolved.id}`;
  }
  const target = userIds.length ? 'all' : mapTarget(input.targetRaw);
  const schedule = String(input.scheduleRaw || 'now').trim().toLowerCase();
  const sendNow = schedule !== 'later';
  const bypassHours = Boolean(input.bypassHours);
  const imageUrl = String(input.imageUrl || '').trim() || null;
  const videoUrl = String(input.videoUrl || '').trim() || null;
  const translations =
    typeof input.translations === 'object'
      ? JSON.stringify(input.translations)
      : input.translations || null;
  const actionType =
    String(input.actionType || 'ADMIN_BROADCAST').trim() || 'ADMIN_BROADCAST';
  const targetGroup = userIds.length ? 'selected_users' : target;
  const recipientIdsJson = userIds.length ? JSON.stringify(userIds) : null;

  await assertNoRecentDuplicateBroadcast({
    title,
    message,
    targetGroup,
    recipientIdsJson,
    actionType,
  });

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

    const category = resolveAnalyticsCategory(actionType, title);

    const insert = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO admin_notification_queue (
        title, message, translations, target_group, category, action_type, send_at, status,
        recipient_ids, bypass_hours, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
      `,
      [
        title,
        message,
        translations,
        userIds.length ? 'selected_users' : target,
        category,
        actionType || 'ADMIN_BROADCAST',
        sendAt,
        userIds.length ? JSON.stringify(userIds) : null,
        bypassHours ? 1 : 0,
        imageUrl,
      ],
    );

    return {
      mode: 'scheduled' as const,
      queueId: insert.insertId,
      target: userIds.length ? 'selected_users' : target,
      userIds,
      testUser: testUserLabel || undefined,
      imageUrl,
      sendAt,
      recipientCount: userIds.length,
      pushSent: 0,
      message: userIds.length
        ? `Scheduled for ${sendAt} IST to ${
            testUserLabel || `${userIds.length} selected user(s)`
          }.`
        : `Scheduled for ${sendAt} IST in all languages. It will send automatically around that time.`,
    };
  }

  const now = nowIstStamp();
  const category = resolveAnalyticsCategory(actionType, title);

  // Claim a queue row first so duplicate guard + admin UI know a send is live.
  // Delivery (inbox + FCM) runs in the background so Render/proxy timeouts
  // don't show a fake "server error" after devotees already got the message.
  let queueId: number | null = null;
  try {
    const queueInsert = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO admin_notification_queue (
        title, message, translations, target_group, category, action_type, send_at, status,
        recipient_ids, bypass_hours, image_url, recipient_count, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SENDING', ?, ?, ?, 0, ?)
      `,
      [
        title,
        message,
        translations,
        targetGroup,
        category,
        actionType || 'ADMIN_BROADCAST',
        now,
        recipientIdsJson,
        bypassHours ? 1 : 0,
        imageUrl,
        now,
      ],
    );
    queueId = Number(
      (queueInsert as any)?.insertId ?? (queueInsert as any)?.id ?? 0,
    );
  } catch (err) {
    console.warn('admin_notification_queue insert failed on sendNow:', err);
  }

  const deliveryInput = {
    title,
    message,
    translations,
    target,
    userIds: userIds.length ? userIds : undefined,
    bypassHours,
    actionType,
    imageUrl,
    videoUrl,
    url: input.url || input.link || input.linkUrl,
    link: input.url || input.link || input.linkUrl,
    extraData: {
      ...(input.extraData || {}),
      ...(queueId ? {broadcastId: queueId, queuedId: queueId} : {}),
    },
  };

  const finalizeQueue = async (
    status: 'SENT' | 'FAILED',
    recipientCount = 0,
  ) => {
    if (!queueId) {
      return;
    }
    try {
      await mysql.query(
        `
        UPDATE admin_notification_queue
        SET status = ?,
            recipient_count = ?,
            processed_at = ?
        WHERE id = ?
        `,
        [status, recipientCount, nowIstStamp(), queueId],
      );
    } catch (err) {
      console.warn('admin_notification_queue update failed:', err);
    }
  };

  setImmediate(() => {
    deliverAdminNotification(deliveryInput)
      .then(async delivered => {
        await finalizeQueue('SENT', delivered.recipientCount);
        console.log(
          `[Admin notify] queue #${queueId || '-'} done: inbox=${delivered.inboxCreated} push=${delivered.pushSent}`,
        );
      })
      .catch(async err => {
        console.warn(
          `[Admin notify] queue #${queueId || '-'} failed:`,
          err?.message || err,
        );
        await finalizeQueue('FAILED', 0);
      });
  });

  const audience = testUserLabel
    ? testUserLabel
    : userIds.length
      ? `${userIds.length} selected user(s)`
      : 'all matching users';

  return {
    mode: 'sending' as const,
    target: targetGroup,
    userIds,
    testUser: testUserLabel || undefined,
    queueId,
    sendAt: localDateTime(),
    recipientCount: userIds.length,
    inboxCreated: 0,
    pushSent: 0,
    pushFailed: 0,
    pushSkipped: null,
    message: `Notification is being delivered to ${audience} now. Do not tap Send again for ${DUPLICATE_SEND_WINDOW_MINUTES} minutes — the same message is blocked to prevent duplicates.`,
  };
};


/** Analytics buckets for admin Notification Analytics filters. */
export type AnalyticsCategory = 'general' | 'birthday' | 'orders';

const ORDER_ACTION_TYPES = new Set([
  'ORDER_STATUS',
  'ORDER_ADMIN_NOTE',
]);

const BIRTHDAY_ACTION_TYPES = new Set([
  'TODAY_BIRTHDAY',
  'ADVANCE_BIRTHDAY',
  'DOB_WISH',
]);

const GENERAL_ACTION_TYPES = new Set([
  'SUPPORT_TICKET_REPLY',
  'ADMIN_SEVA_REPLY',
  'MEETING_SCHEDULED',
  'MEETING_LIVE',
  'ADMIN_BROADCAST',
  'ADMIN_REWARD_NEW',
  'ADMIN_MANTRA_NEW',
  'ADMIN_BANNER_NEW',
  'ADMIN_CHALLENGE_NEW',
  'ADMIN_PRODUCT_NEW',
]);

export const resolveAnalyticsCategory = (
  actionTypeRaw?: string | null,
  titleRaw?: string | null,
  storedCategory?: string | null,
): AnalyticsCategory => {
  const actionType = String(actionTypeRaw || '')
    .trim()
    .toUpperCase();
  const title = String(titleRaw || '');
  const stored = String(storedCategory || '')
    .trim()
    .toLowerCase();

  if (ORDER_ACTION_TYPES.has(actionType) || stored === 'orders') {
    return 'orders';
  }
  // Support tickets / seva replies / meetings always belong in General —
  // older rows were wrongly stored as category "specific".
  if (
    GENERAL_ACTION_TYPES.has(actionType) ||
    /support\s*ticket|support replied|ticket solved|seva prayer reply|online class|class scheduled|class is live/i.test(
      title,
    )
  ) {
    return 'general';
  }
  if (
    BIRTHDAY_ACTION_TYPES.has(actionType) ||
    stored === 'birthday' ||
    /birthday|jayanthi|vardhanti|occasion|anniversary/i.test(title)
  ) {
    return 'birthday';
  }
  // Legacy "specific" rows without order action → treat as birthday/occasion.
  if (stored === 'specific' && !ORDER_ACTION_TYPES.has(actionType)) {
    if (/order/i.test(title)) {
      return 'orders';
    }
    if (/support|ticket|seva|meeting|class/i.test(title)) {
      return 'general';
    }
    return 'birthday';
  }
  return 'general';
};

/**
 * Analytics timestamps for admin UI in Asia/Kolkata.
 * DB/drivers on Render store/return UTC; convert and tag +05:30 so clients
 * do not shift the value a second time.
 */
export const toIstAnalyticsStamp = (raw: any): string => {
  if (raw == null || raw === '') {
    return '';
  }

  const toTaggedIst = (date: Date) => {
    const wall = nowIstStamp(date);
    return `${wall.replace(' ', 'T')}+05:30`;
  };

  if (raw instanceof Date && Number.isFinite(raw.getTime())) {
    return toTaggedIst(raw);
  }
  const str = String(raw).trim();
  if (!str) {
    return '';
  }
  // Already tagged IST from a previous convert — keep wall clock stable.
  if (/\+05:30$/.test(str)) {
    const wall = str.replace('T', ' ').replace(/\+05:30$/, '').trim();
    return `${wall.replace(' ', 'T')}+05:30`;
  }
  if (
    /^\d{4}-\d{2}-\d{2}T/.test(str) ||
    /Z$/i.test(str) ||
    /[+-]\d{2}:\d{2}$/.test(str)
  ) {
    const ms = Date.parse(str);
    if (Number.isFinite(ms)) {
      return toTaggedIst(new Date(ms));
    }
  }
  // Naive "YYYY-MM-DD HH:mm:ss" is UTC wall-clock (e.g. 11:40 → 17:10 IST).
  const naive = str.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/,
  );
  if (naive) {
    const asUtc = Date.parse(`${naive[1]}T${naive[2]}Z`);
    if (Number.isFinite(asUtc)) {
      return toTaggedIst(new Date(asUtc));
    }
    return `${naive[1]} ${naive[2]}`;
  }
  return str.replace('T', ' ').slice(0, 19);
};

export const syncUnqueuedBatchesToAnalytics = async () => {
  try {
    const unqueued = await mysql.query<any[]>(`
      SELECT action_type, message, count(*) as count,
             min(created_at) as first_created,
             min(extra_data) as sample_extra
      FROM notifications
      WHERE action_type IN (
        'ADMIN_REWARD_NEW', 'ADMIN_MANTRA_NEW', 'ADMIN_BANNER_NEW',
        'ADMIN_CHALLENGE_NEW', 'ADMIN_PRODUCT_NEW', 'TODAY_BIRTHDAY',
        'ADVANCE_BIRTHDAY', 'DOB_WISH', 'MEETING_SCHEDULED', 'MEETING_LIVE',
        'ORDER_STATUS', 'ORDER_ADMIN_NOTE', 'SUPPORT_TICKET_REPLY', 'ADMIN_SEVA_REPLY'
      )
      AND (extra_data NOT LIKE '%"broadcastId":%' OR extra_data IS NULL)
      GROUP BY action_type, message
      ORDER BY first_created ASC
      LIMIT 100
    `);

    for (const batch of unqueued || []) {
      const actionType = String(batch.action_type || '');
      const message = String(batch.message || '');
      const count = Number(batch.count || 0);
      const firstCreated =
        toIstAnalyticsStamp(batch.first_created) || nowIstStamp();

      let title = '';
      if (actionType === 'ADMIN_REWARD_NEW') title = 'New Reward';
      else if (actionType === 'ADMIN_MANTRA_NEW') title = 'New Mantra';
      else if (actionType === 'ADMIN_CHALLENGE_NEW') title = 'New Challenge';
      else if (actionType === 'ADMIN_BANNER_NEW') title = 'New Update';
      else if (actionType === 'ADMIN_PRODUCT_NEW') title = 'New Offering';
      else if (actionType === 'TODAY_BIRTHDAY') title = 'Happy Birthday! 🎂🌸';
      else if (actionType === 'ADVANCE_BIRTHDAY') title = 'Advance Birthday Blessings 🌸';
      else if (actionType === 'DOB_WISH') title = 'Birthday Wishes 🎂';
      else if (actionType === 'MEETING_SCHEDULED') title = 'Online Class Scheduled';
      else if (actionType === 'MEETING_LIVE') title = 'Online Class is LIVE';
      else if (actionType === 'ORDER_STATUS') title = 'Order Status Update 📦';
      else if (actionType === 'ORDER_ADMIN_NOTE') title = 'Order Update Note 📝';
      else if (actionType === 'SUPPORT_TICKET_REPLY') title = 'Support Ticket Reply 💬';
      else if (actionType === 'ADMIN_SEVA_REPLY') title = 'Seva Prayer Reply 🙏';
      else title = 'Notification';

      const category = resolveAnalyticsCategory(actionType, title);
      const targetGroup =
        category === 'general' ? 'all' : 'selected_users';

      const insertResult = await mysql.query<ResultSetHeader>(`
        INSERT INTO admin_notification_queue (
          title, message, target_group, category, action_type, send_at, status,
          recipient_count, processed_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?, ?)
      `, [title, message, targetGroup, category, actionType, firstCreated, count, firstCreated]);

      const queueId = Number(
        (insertResult as any)?.insertId ?? (insertResult as any)?.id ?? 0,
      );

      if (queueId > 0) {
        const matchingRows = await mysql.query<any[]>(`
          SELECT id FROM notifications
          WHERE action_type = ? AND message = ?
            AND (extra_data NOT LIKE '%"broadcastId":%' OR extra_data IS NULL)
        `, [actionType, message]);

        const ids = (matchingRows || []).map(r => r.id);
        if (ids.length > 0) {
          for (let i = 0; i < ids.length; i += 200) {
            const chunk = ids.slice(i, i + 200);
            await mysql.query(`
              UPDATE notifications
              SET extra_data = CASE
                WHEN extra_data IS NULL OR extra_data = '' THEN '{"broadcastId":${queueId},"queuedId":${queueId}}'
                WHEN extra_data LIKE '{%}' THEN REPLACE(extra_data, '{', '{"broadcastId":${queueId},"queuedId":${queueId},')
                ELSE extra_data
              END
              WHERE id IN (${chunk.join(',')})
            `);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[AdminNotification] syncUnqueuedBatches error:', err);
  }
};

const fetchInboxStatsForQueueIds = async (queueIds: number[]) => {
  const statsById = new Map<number, {inbox: number; read: number}>();
  const ids = queueIds.filter(id => id > 0);
  if (!ids.length) {
    return statsById;
  }

  // Batch OR lookups (chunks) instead of one query per broadcast.
  const chunkSize = 40;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const clauses: string[] = [];
    const params: any[] = [];
    chunk.forEach(id => {
      clauses.push('(extra_data LIKE ? OR extra_data LIKE ?)');
      params.push(`%"broadcastId":${id}%`, `%"queuedId":${id}%`);
    });
    try {
      const rows = await mysql.query<any[]>(
        `
        SELECT extra_data AS extraData, is_read AS isRead
        FROM notifications
        WHERE ${clauses.join(' OR ')}
        `,
        params,
      );
      (rows || []).forEach(row => {
        const extra = String(row.extraData || '');
        const broadcastMatch = extra.match(/"broadcastId"\s*:\s*(\d+)/);
        const queuedMatch = extra.match(/"queuedId"\s*:\s*(\d+)/);
        const id = Number(broadcastMatch?.[1] || queuedMatch?.[1] || 0);
        if (!id) {
          return;
        }
        const prev = statsById.get(id) || {inbox: 0, read: 0};
        prev.inbox += 1;
        if (Number(row.isRead) === 1 || row.isRead === true) {
          prev.read += 1;
        }
        statsById.set(id, prev);
      });
    } catch (err) {
      console.warn('Analytics batch stats query failed', err);
    }
  }
  return statsById;
};

const mapAnalyticsRow = (
  row: any,
  statsById: Map<number, {inbox: number; read: number}>,
) => {
  const queueId = Number(row.id);
  const declaredSent = Number(row.recipientCount || 0);
  const inbox = statsById.get(queueId);
  const actualInboxCount = Number(inbox?.inbox || 0);
  const readCount = Number(inbox?.read || 0);
  const sentCount =
    declaredSent > 0 ? declaredSent : actualInboxCount > 0 ? actualInboxCount : 0;
  const safeReadCount = Math.min(readCount, sentCount || readCount);
  const unreadCount = Math.max(0, sentCount - safeReadCount);
  const readRate =
    sentCount > 0 ? Math.round((safeReadCount / sentCount) * 100) : 0;
  const category = resolveAnalyticsCategory(
    row.actionType,
    row.title,
    row.category,
  );
  return {
    id: queueId,
    title: row.title,
    message: row.message,
    targetGroup: row.targetGroup || 'all',
    category,
    actionType: row.actionType || 'ADMIN_BROADCAST',
    sentAt: toIstAnalyticsStamp(
      row.processedAt || row.sendAt || row.createdAt,
    ),
    sentCount,
    readCount: safeReadCount,
    unreadCount,
    readRate,
  };
};

export const getNotificationAnalytics = async (opts?: {
  categoryFilter?: string;
  page?: number;
  limit?: number;
  q?: string;
}) => {
  await ensureQueueTable();
  // Do not block analytics on sync — run in background.
  void syncUnqueuedBatchesToAnalytics().catch(() => undefined);

  try {
    await mysql.query(
      `
      UPDATE admin_notification_queue
      SET category = 'general'
      WHERE action_type IN ('SUPPORT_TICKET_REPLY', 'ADMIN_SEVA_REPLY', 'MEETING_SCHEDULED', 'MEETING_LIVE')
        AND IFNULL(category, '') IN ('specific', 'birthday')
      `,
    );
  } catch {
    // Ignore if table/columns differ on older DBs.
  }

  const page = Math.max(1, Number(opts?.page) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(opts?.limit) || 30),
  );
  const offset = (page - 1) * limit;
  const q = String(opts?.q || '').trim().toLowerCase();
  const filter = String(opts?.categoryFilter || '')
    .trim()
    .toLowerCase();

  const rows = await mysql.query<any[]>(
    `
    SELECT * FROM (
      (
        SELECT
          id,
          title,
          message,
          translations,
          target_group AS targetGroup,
          recipient_count AS recipientCount,
          status,
          send_at AS sendAt,
          processed_at AS processedAt,
          created_at AS createdAt,
          IFNULL(category, 'general') AS category,
          action_type AS actionType
        FROM admin_notification_queue
        WHERE status IN ('SENT', 'SENDING')
          AND IFNULL(action_type, '') NOT IN ('ORDER_STATUS', 'ORDER_ADMIN_NOTE')
          AND NOT (
            IFNULL(category, '') = 'orders'
            OR title LIKE '%Order Status%'
            OR title LIKE '%Order Update%'
          )
        ORDER BY id DESC
        LIMIT 500
      )
      UNION ALL
      (
        SELECT
          id,
          title,
          message,
          translations,
          target_group AS targetGroup,
          recipient_count AS recipientCount,
          status,
          send_at AS sendAt,
          processed_at AS processedAt,
          created_at AS createdAt,
          IFNULL(category, 'general') AS category,
          action_type AS actionType
        FROM admin_notification_queue
        WHERE status IN ('SENT', 'SENDING')
          AND (
            action_type IN ('ORDER_STATUS', 'ORDER_ADMIN_NOTE')
            OR IFNULL(category, '') = 'orders'
            OR title LIKE '%Order Status%'
            OR title LIKE '%Order Update%'
          )
        ORDER BY id DESC
        LIMIT 500
      )
    ) AS analytics_rows
    ORDER BY id DESC
    `,
  );

  // Resolve categories in memory first (cheap), then batch inbox stats only
  // for the filtered/paginated slice.
  const classified = (rows || []).map(row => {
    const category = resolveAnalyticsCategory(
      row.actionType,
      row.title,
      row.category,
    );
    return {...row, resolvedCategory: category};
  });

  const generalRows = classified.filter(r => r.resolvedCategory === 'general');
  const birthdayRows = classified.filter(r => r.resolvedCategory === 'birthday');
  const ordersRows = classified.filter(r => r.resolvedCategory === 'orders');

  let filtered = classified;
  if (filter === 'general') {
    filtered = generalRows;
  } else if (filter === 'birthday' || filter === 'specific') {
    filtered = birthdayRows;
  } else if (filter === 'orders' || filter === 'order') {
    filtered = ordersRows;
  }

  if (q) {
    filtered = filtered.filter(row => {
      const hay = [
        row.title,
        row.message,
        row.targetGroup,
        row.actionType,
        row.resolvedCategory,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  const total = filtered.length;
  const pageRows = filtered.slice(offset, offset + limit);
  const statsById = await fetchInboxStatsForQueueIds(
    pageRows.map(row => Number(row.id)),
  );
  const items = pageRows.map(row => mapAnalyticsRow(row, statsById));

  // Summary for active tab uses recipient_count (fast). Read totals for the
  // current page only are exact; overall read uses recipient-based estimate
  // when full inbox scan would be too heavy.
  const summarySource =
    filter === 'general'
      ? generalRows
      : filter === 'birthday' || filter === 'specific'
        ? birthdayRows
        : filter === 'orders' || filter === 'order'
          ? ordersRows
          : classified;

  let totalDelivered = 0;
  summarySource.forEach(row => {
    totalDelivered += Number(row.recipientCount || 0);
  });
  const pageDelivered = items.reduce((sum, it) => sum + it.sentCount, 0);
  const pageRead = items.reduce((sum, it) => sum + it.readCount, 0);
  const estimatedRead =
    pageDelivered > 0
      ? Math.round((pageRead / pageDelivered) * totalDelivered)
      : 0;
  const averageReadRate =
    totalDelivered > 0 ? Math.round((estimatedRead / totalDelivered) * 100) : 0;

  return {
    summary: {
      totalBroadcasts: summarySource.length,
      totalDelivered,
      totalRead: estimatedRead,
      totalUnread: Math.max(0, totalDelivered - estimatedRead),
      averageReadRate,
      generalCount: generalRows.length,
      birthdayCount: birthdayRows.length,
      ordersCount: ordersRows.length,
      specificCount: birthdayRows.length,
    },
    items,
    page,
    limit,
    total,
    hasMore: offset + items.length < total,
  };
};

export default {
  sendAdminNotification,
  flushDueAdminNotifications,
  notifyAdminContentCreated,
  deliverAdminNotification,
  getNotificationAnalytics,
  mapTarget,
  nowIstStamp,
  toIstAnalyticsStamp,
  resolveAnalyticsCategory,
};
