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
  bypassHours = false,
) => {
  if (!bypassHours && !isWithinNotificationHoursIST()) {
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
  const extractedUrl =
    String(input.message || '').match(/https?:\/\/[^\s]+/i)?.[0] ||
    String(input.extraData?.url || input.extraData?.link || '');

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
  return deliverAdminNotification({
    title: cfg.title,
    message: cfg.message,
    target: 'all',
    actionType: cfg.actionType,
    actionId: id,
    extraData: cfg.extraData,
  });
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
  ];
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
  const translations =
    typeof input.translations === 'object'
      ? JSON.stringify(input.translations)
      : input.translations || null;
  const actionType =
    String(input.actionType || 'ADMIN_BROADCAST').trim() || 'ADMIN_BROADCAST';

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
        title, message, translations, target_group, send_at, status,
        recipient_ids, bypass_hours, image_url
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
      `,
      [
        title,
        message,
        translations,
        userIds.length ? 'selected_users' : target,
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
  let queueId: number | null = null;
  try {
    const queueInsert = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO admin_notification_queue (
        title, message, translations, target_group, send_at, status,
        recipient_ids, bypass_hours, image_url, recipient_count, processed_at
      ) VALUES (?, ?, ?, ?, ?, 'SENDING', ?, ?, ?, 0, ?)
      `,
      [
        title,
        message,
        translations,
        userIds.length ? 'selected_users' : target,
        now,
        userIds.length ? JSON.stringify(userIds) : null,
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

  const delivered = await deliverAdminNotification({
    title,
    message,
    translations,
    target,
    userIds: userIds.length ? userIds : undefined,
    bypassHours,
    actionType,
    imageUrl,
    extraData: queueId ? {broadcastId: queueId, queuedId: queueId} : undefined,
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

  const pushNote = delivered.pushSent
    ? ` and ${delivered.pushSent} push popup(s)`
    : delivered.pushSkipped
      ? ` (push skipped: ${delivered.pushSkipped})`
      : '';
  return {
    mode: 'sent' as const,
    target: userIds.length ? 'selected_users' : target,
    userIds,
    testUser: testUserLabel || undefined,
    sendAt: localDateTime(),
    ...delivered,
    message:
      delivered.recipientCount > 0
        ? testUserLabel
          ? `Sent only to ${testUserLabel} in-app${pushNote}.`
          : `Sent to ${delivered.recipientCount} user(s) in-app in their language${pushNote}.`
        : userIds.length
          ? 'No matching app users found for the selected people.'
          : 'No matching users found for this target group.',
  };
};

export const getNotificationAnalytics = async () => {
  await ensureQueueTable();
  const rows = await mysql.query<any[]>(
    `
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
      created_at AS createdAt
    FROM admin_notification_queue
    WHERE status IN ('SENT', 'SENDING')
    ORDER BY id DESC
    LIMIT 100
    `,
  );

  const items = [];
  let totalDelivered = 0;
  let totalRead = 0;

  for (const row of rows || []) {
    const queueId = Number(row.id);
    const declaredSent = Number(row.recipientCount || 0);

    let readCount = 0;
    let actualInboxCount = 0;

    try {
      const stats = await mysql.query<any[]>(
        `
        SELECT
          COUNT(*) AS total_inbox,
          COALESCE(SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END), 0) AS read_count
        FROM notifications
        WHERE (
          extra_data LIKE ?
          OR extra_data LIKE ?
        )
        `,
        [`%"broadcastId":${queueId}%`, `%"queuedId":${queueId}%`],
      );
      if (stats?.length) {
        actualInboxCount = Number(stats[0].total_inbox || 0);
        readCount = Number(stats[0].read_count || 0);
      }
    } catch (err) {
      console.warn('Analytics stats query failed for queue item', queueId, err);
    }

    if (actualInboxCount === 0 && row.title) {
      try {
        const cleanTitle = String(row.title).slice(0, 30).trim();
        const fallbackStats = await mysql.query<any[]>(
          `
          SELECT
            COUNT(*) AS total_inbox,
            COALESCE(SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END), 0) AS read_count
          FROM notifications
          WHERE notification_type = 'SYSTEM'
            AND (title LIKE ? OR extra_data LIKE ?)
          `,
          [`%${cleanTitle}%`, `%"mantraName":"%${cleanTitle}%`],
        );
        if (
          fallbackStats?.length &&
          Number(fallbackStats[0].total_inbox || 0) > 0
        ) {
          actualInboxCount = Number(fallbackStats[0].total_inbox || 0);
          readCount = Number(fallbackStats[0].read_count || 0);
        }
      } catch {
        // ignore fallback error
      }
    }

    const sentCount = Math.max(declaredSent, actualInboxCount);
    const unreadCount = Math.max(0, sentCount - readCount);
    const readRate =
      sentCount > 0 ? Math.round((readCount / sentCount) * 100) : 0;

    totalDelivered += sentCount;
    totalRead += readCount;

    items.push({
      id: queueId,
      title: row.title,
      message: row.message,
      targetGroup: row.targetGroup || 'all',
      sentAt: row.processedAt || row.sendAt || row.createdAt,
      sentCount,
      readCount,
      unreadCount,
      readRate,
    });
  }

  const totalBroadcasts = items.length;
  const averageReadRate =
    totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

  return {
    summary: {
      totalBroadcasts,
      totalDelivered,
      totalRead,
      totalUnread: Math.max(0, totalDelivered - totalRead),
      averageReadRate,
    },
    items,
  };
};

export default {
  sendAdminNotification,
  flushDueAdminNotifications,
  notifyAdminContentCreated,
  deliverAdminNotification,
  getNotificationAnalytics,
  mapTarget,
};
