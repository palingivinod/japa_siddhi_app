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

const localDateTime = (date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

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

/**
 * Device push tokens live in fcm_token. users.firebase_token stores the
 * Firebase Auth id token used at login and must never be sent to FCM.
 */
const loadRecipients = async (target: AdminNotifyTarget) => {
  await ensureFcmColumn();

  if (target === 'blocked') {
    return mysql.query<any[]>(`
      SELECT id, fcm_token AS fcmToken
      FROM users
      WHERE deleted_at IS NULL
        AND UPPER(IFNULL(account_status, 'ACTIVE')) IN ('BLOCKED', 'SUSPENDED')
    `);
  }

  if (target === 'active_japa') {
    return mysql.query<any[]>(`
      SELECT u.id, u.fcm_token AS fcmToken
      FROM users u
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
    SELECT id, fcm_token AS fcmToken
    FROM users
    WHERE deleted_at IS NULL
      AND UPPER(IFNULL(account_status, 'ACTIVE')) NOT IN ('BLOCKED', 'SUSPENDED')
  `);
};

const tryPush = async (
  tokens: string[],
  title: string,
  message: string,
) => {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) {
    return {pushSent: 0, pushSkipped: 'no_tokens' as string | null};
  }
  if (!isFirebaseReady()) {
    return {
      pushSent: 0,
      pushSkipped: 'firebase_not_configured' as string | null,
    };
  }

  let pushSent = 0;
  try {
    const result = await admin.messaging().sendEachForMulticast({
      tokens: unique.slice(0, 500),
      notification: {title, body: message},
      data: {
        type: 'ADMIN_BROADCAST',
        title,
        body: message,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    pushSent = result.successCount || 0;
  } catch {
    return {pushSent: 0, pushSkipped: 'push_failed'};
  }
  return {pushSent, pushSkipped: null as string | null};
};

export const deliverAdminNotification = async (input: {
  title: string;
  message: string;
  target: AdminNotifyTarget;
  extraData?: Record<string, any>;
}) => {
  const recipients = await loadRecipients(input.target);
  const userIds = (recipients || []).map(row => Number(row.id)).filter(Boolean);

  for (const userId of userIds) {
    await notificationService.create({
      userId,
      title: input.title,
      message: input.message,
      notificationType: 'SYSTEM',
      actionType: 'ADMIN_BROADCAST',
      actionId: null,
      extraData: {
        target: input.target,
        ...(input.extraData || {}),
      },
    });
  }

  const tokens = (recipients || [])
    .map(row => String(row.fcmToken || '').trim())
    .filter(Boolean);
  const push = await tryPush(tokens, input.title, input.message);

  return {
    recipientCount: userIds.length,
    ...push,
  };
};

export const flushDueAdminNotifications = async () => {
  await ensureQueueTable();
  const engine = mysql.getEngineName() || 'sqlite';
  const dueSql =
    engine === 'mysql'
      ? `
      SELECT id, title, message, target_group AS targetGroup
      FROM admin_notification_queue
      WHERE status = 'PENDING'
        AND send_at <= NOW()
      ORDER BY id ASC
      LIMIT 20
    `
      : `
      SELECT id, title, message, target_group AS targetGroup
      FROM admin_notification_queue
      WHERE status = 'PENDING'
        AND send_at <= datetime('now', 'localtime')
      ORDER BY id ASC
      LIMIT 20
    `;
  const due = await mysql.query<any[]>(dueSql);

  for (const job of due || []) {
    const result = await deliverAdminNotification({
      title: job.title,
      message: job.message,
      target: mapTarget(job.targetGroup),
      extraData: {queuedId: job.id},
    });
    await mysql.query(
      `
      UPDATE admin_notification_queue
      SET status = 'SENT',
          recipient_count = ?,
          processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [result.recipientCount, job.id],
    );
  }
};

export const sendAdminNotification = async (input: {
  title: string;
  message: string;
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

  if (!sendNow) {
    let sendAt = String(input.scheduledAt || '').trim();
    if (!sendAt) {
      const error: any = new Error(
        'Pick a date and time for a scheduled notification.',
      );
      error.statusCode = 400;
      throw error;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(sendAt)) {
      sendAt = `${sendAt} 09:00:00`;
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(sendAt)) {
      sendAt = sendAt.replace('T', ' ').slice(0, 19);
      if (sendAt.length === 16) {
        sendAt = `${sendAt}:00`;
      }
    }

    const sendAtMs = Date.parse(sendAt.replace(' ', 'T'));
    if (!Number.isFinite(sendAtMs)) {
      const error: any = new Error('Invalid schedule date/time.');
      error.statusCode = 400;
      throw error;
    }
    if (sendAtMs <= Date.now() + 30_000) {
      const error: any = new Error(
        'Schedule time must be in the future.',
      );
      error.statusCode = 400;
      throw error;
    }

    sendAt = localDateTime(new Date(sendAtMs));

    const insert = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO admin_notification_queue (
        title, message, target_group, send_at, status
      ) VALUES (?, ?, ?, ?, 'PENDING')
      `,
      [title, message, target, sendAt],
    );

    return {
      mode: 'scheduled' as const,
      queueId: insert.insertId,
      target,
      sendAt,
      recipientCount: 0,
      pushSent: 0,
      message: `Scheduled for ${sendAt}. It will send automatically after that time.`,
    };
  }

  const delivered = await deliverAdminNotification({title, message, target});
  return {
    mode: 'sent' as const,
    target,
    sendAt: localDateTime(),
    ...delivered,
    message:
      delivered.recipientCount > 0
        ? `Sent to ${delivered.recipientCount} user(s) in-app${
            delivered.pushSent ? ` and ${delivered.pushSent} push` : ''
          }.`
        : 'No matching users found for this target group.',
  };
};

export default {
  sendAdminNotification,
  flushDueAdminNotifications,
  mapTarget,
};
