import {ResultSetHeader} from 'mysql2';

import mysql from '../../database/mysql';

const bumpQueueReadCount = async (broadcastId: number, by = 1) => {
  const id = Number(broadcastId || 0);
  const delta = Math.max(0, Number(by || 0));
  if (!id || !delta) {
    return;
  }
  try {
    await mysql.query(
      `
      UPDATE admin_notification_queue
      SET read_count = IFNULL(read_count, 0) + ?
      WHERE id = ?
      `,
      [delta, id],
    );
  } catch {
    // Best-effort analytics counter.
  }
};

const bumpQueueOpenedCount = async (broadcastId: number, by = 1) => {
  const id = Number(broadcastId || 0);
  const delta = Math.max(0, Number(by || 0));
  if (!id || !delta) {
    return;
  }
  try {
    await mysql.query(
      `
      UPDATE admin_notification_queue
      SET opened_count = IFNULL(opened_count, 0) + ?
      WHERE id = ?
      `,
      [delta, id],
    );
  } catch {
    // Best-effort analytics counter.
  }
};

class NotificationRepository {
  private expiresColumnReady = false;
  private broadcastIdReady = false;
  private userOpenedReady = false;
  private broadcastBackfillRunning = false;

  private async ensureExpiresColumn() {
    if (this.expiresColumnReady) {
      return;
    }
    this.expiresColumnReady = true;
    try {
      await mysql.query(
        `ALTER TABLE notifications ADD COLUMN expires_at TEXT NULL`,
      );
    } catch {
      // Column already exists (SQLite / MySQL).
    }
    await this.ensureBroadcastIdColumn();
    await this.ensureUserOpenedColumn();
  }

  /** True open: inbox open / mark-as-read / push tap — not the 2-day auto-read. */
  private async ensureUserOpenedColumn() {
    if (this.userOpenedReady) {
      return;
    }
    this.userOpenedReady = true;
    try {
      await mysql.query(
        `ALTER TABLE notifications ADD COLUMN user_opened INT NOT NULL DEFAULT 0`,
      );
    } catch {
      // Column already exists.
    }
    try {
      await mysql.query(
        `ALTER TABLE notifications ADD COLUMN opened_at TEXT NULL`,
      );
    } catch {
      // Column already exists.
    }
  }

  private async ensureBroadcastIdColumn() {
    if (this.broadcastIdReady) {
      return;
    }
    this.broadcastIdReady = true;
    try {
      await mysql.query(
        `ALTER TABLE notifications ADD COLUMN broadcast_id INT NULL`,
      );
    } catch {
      // Column already exists.
    }
    try {
      await mysql.query(
        `CREATE INDEX IF NOT EXISTS idx_notifications_broadcast_id ON notifications (broadcast_id)`,
      );
    } catch {
      // MySQL < 8.0 may not support IF NOT EXISTS on indexes.
      try {
        await mysql.query(
          `CREATE INDEX idx_notifications_broadcast_id ON notifications (broadcast_id)`,
        );
      } catch {
        // Index already exists.
      }
    }
    // Best-effort historical backfill (indexed reads; no analytics LIKE scans).
    void this.kickBroadcastIdBackfill();
  }

  private parseBroadcastId(extraData: any): number {
    if (!extraData) {
      return 0;
    }
    let parsed = extraData;
    if (typeof extraData === 'string') {
      try {
        parsed = JSON.parse(extraData);
      } catch {
        return 0;
      }
    }
    const raw = parsed?.broadcastId ?? parsed?.queuedId ?? 0;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : 0;
  }

  private async kickBroadcastIdBackfill() {
    if (this.broadcastBackfillRunning) {
      return;
    }
    this.broadcastBackfillRunning = true;
    try {
      const engine = mysql.getEngineName() || 'sqlite';
      for (let i = 0; i < 40; i++) {
        let affected = 0;
        if (engine === 'postgres') {
          const result = await mysql.query<ResultSetHeader>(
            `
            UPDATE notifications AS n
            SET broadcast_id = COALESCE(
              NULLIF(substring(n.extra_data from '"broadcastId"[[:space:]]*:[[:space:]]*([0-9]+)'), '')::int,
              NULLIF(substring(n.extra_data from '"queuedId"[[:space:]]*:[[:space:]]*([0-9]+)'), '')::int
            )
            FROM (
              SELECT id
              FROM notifications
              WHERE broadcast_id IS NULL
                AND extra_data IS NOT NULL
                AND extra_data <> ''
                AND (extra_data LIKE '%broadcastId%' OR extra_data LIKE '%queuedId%')
              ORDER BY id DESC
              LIMIT 2000
            ) AS batch
            WHERE n.id = batch.id
            `,
          );
          affected = Number(result?.affectedRows || 0);
        } else if (engine === 'mysql') {
          const result = await mysql.query<ResultSetHeader>(
            `
            UPDATE notifications
            SET broadcast_id = COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.broadcastId')) AS UNSIGNED),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.queuedId')) AS UNSIGNED)
            )
            WHERE broadcast_id IS NULL
              AND extra_data IS NOT NULL
              AND extra_data <> ''
              AND (extra_data LIKE '%broadcastId%' OR extra_data LIKE '%queuedId%')
            LIMIT 2000
            `,
          );
          affected = Number(result?.affectedRows || 0);
        } else {
          // sqlite: extract via app for a small recent batch
          const rows = await mysql.query<any[]>(
            `
            SELECT id, extra_data AS extraData
            FROM notifications
            WHERE broadcast_id IS NULL
              AND extra_data IS NOT NULL
              AND extra_data <> ''
              AND (extra_data LIKE '%broadcastId%' OR extra_data LIKE '%queuedId%')
            ORDER BY id DESC
            LIMIT 200
            `,
          );
          for (const row of rows || []) {
            const bid = this.parseBroadcastId(row.extraData);
            if (!bid) {
              continue;
            }
            await mysql.query(
              `UPDATE notifications SET broadcast_id = ? WHERE id = ?`,
              [bid, row.id],
            );
            affected += 1;
          }
        }
        if (affected <= 0) {
          break;
        }
      }
    } catch {
      // Non-blocking — analytics still uses stored queue.read_count.
    } finally {
      this.broadcastBackfillRunning = false;
    }
  }

  /**
   * Drop reminder rows that are past their useful life so the Notifications
   * screen does not keep piling up daily / deadline prompts.
   */
  async purgeExpired(userId?: number) {
    await this.ensureExpiresColumn();
    const engine = mysql.getEngineName() || 'sqlite';
    const nowExpr =
      engine === 'mysql' ? 'NOW()' : `datetime('now', 'localtime')`;
    const todayExpr =
      engine === 'mysql'
        ? `DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE))`
        : `date('now', '+5 hours', '30 minutes')`;
    const endDateCol =
      engine === 'mysql'
        ? `JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.endDate'))`
        : `json_extract(extra_data, '$.endDate')`;
    const dayCol =
      engine === 'mysql'
        ? `COALESCE(
             JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.date')),
             DATE(sent_at)
           )`
        : `COALESCE(
             json_extract(extra_data, '$.date'),
             date(sent_at)
           )`;
    const olderThan7 =
      engine === 'mysql'
        ? `${todayExpr} - INTERVAL 7 DAY`
        : `date('now', '+5 hours', '30 minutes', '-7 days')`;

    const userFilter = userId ? 'AND user_id = ?' : '';
    const params: any[] = userId ? [userId] : [];

    // Unread for 2+ days → treat as read so Home / app icon badge count drops.
    const unreadOlderThan2Days =
      engine === 'mysql'
        ? `DATE_SUB(NOW(), INTERVAL 2 DAY)`
        : `datetime('now', 'localtime', '-2 days')`;
    await mysql.query(
      `
      UPDATE notifications
      SET
        is_read = 1,
        read_at = CURRENT_TIMESTAMP
      WHERE is_read = 0
        AND COALESCE(sent_at, created_at) <= ${unreadOlderThan2Days}
        ${userFilter}
      `,
      params,
    );

    await mysql.query(
      `
      DELETE FROM notifications
      WHERE expires_at IS NOT NULL
        AND expires_at <> ''
        AND expires_at <= ${nowExpr}
        ${userFilter}
      `,
      params,
    );

    // Daily reminders only belong to their calendar day.
    await mysql.query(
      `
      DELETE FROM notifications
      WHERE action_type IN ('DAILY_JAPA_REMINDER', 'DAILY_JAPA_PENDING')
        AND date(${dayCol}) < ${todayExpr}
        ${userFilter}
      `,
      params,
    );

    // Read items leave the inbox about one day after they were opened.
    const readOlderThan1Day =
      engine === 'mysql'
        ? `DATE_SUB(NOW(), INTERVAL 1 DAY)`
        : `datetime('now', 'localtime', '-1 day')`;
    await mysql.query(
      `
      DELETE FROM notifications
      WHERE is_read = 1
        AND read_at IS NOT NULL
        AND read_at <= ${readOlderThan1Day}
        AND IFNULL(action_type, '') NOT IN (
          'JAPA_MILESTONE',
          'ADMIN_BROADCAST',
          'ADMIN_REWARD_NEW',
          'ADMIN_MANTRA_NEW',
          'ADMIN_BANNER_NEW',
          'ADMIN_CHALLENGE_NEW',
          'ADMIN_PRODUCT_NEW',
          'TODAY_BIRTHDAY',
          'ADVANCE_BIRTHDAY',
          'DOB_WISH',
          'MEETING_LIVE',
          'MEETING_SCHEDULED',
          'NITHYA_HOMAM_ANNOUNCEMENT'
        )
        ${userFilter}
      `,
      params,
    );

    // Deadline prompts leave after the challenge / goal end date.
    await mysql.query(
      `
      DELETE FROM notifications
      WHERE action_type IN ('CHALLENGE_DEADLINE', 'GOAL_DEADLINE')
        AND ${endDateCol} IS NOT NULL
        AND date(${endDateCol}) < ${todayExpr}
        ${userFilter}
      `,
      params,
    );

    await mysql.query(
      `
      DELETE FROM notifications
      WHERE notification_type = 'JAPA_REMINDER'
        AND date(sent_at) < ${olderThan7}
        ${userFilter}
      `,
      params,
    );
  }

  async create(data: {
    userId: number;
    title: string;
    message: string;
    notificationType: string;
    actionType?: string | null;
    actionId?: number | null;
    extraData?: Record<string, any> | null;
    expiresAt?: string | null;
  }): Promise<number> {
    await this.ensureExpiresColumn();

    await this.ensureBroadcastIdColumn();
    const broadcastId = this.parseBroadcastId(data.extraData);

    const result = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO notifications
      (
        user_id,
        title,
        message,
        notification_type,
        action_type,
        action_id,
        extra_data,
        expires_at,
        broadcast_id
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
      `,
      [
        data.userId,
        data.title,
        data.message,
        data.notificationType,
        data.actionType ?? null,
        data.actionId ?? null,
        data.extraData ? JSON.stringify(data.extraData) : null,
        data.expiresAt ?? null,
        broadcastId || null,
      ],
    );

    return result.insertId;
  }

  async getUserNotifications(
    userId: number,
    limit = 15,
    actionType?: string,
  ) {
    await this.purgeExpired(userId);
    const take = Math.max(1, Math.min(50, Number(limit) || 15));
    const actionFilter = actionType ? 'AND action_type = ?' : '';
    const listParams: any[] = actionType ? [userId, actionType] : [userId];

    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        user_id AS userId,
        title,
        message,
        notification_type AS notificationType,
        action_type AS actionType,
        action_id AS actionId,
        extra_data AS extraData,
        is_read AS isRead,
        created_at AS createdAt,
        COALESCE(sent_at, created_at) AS sentAt,
        read_at AS readAt,
        expires_at AS expiresAt
      FROM notifications
      WHERE user_id = ?
        ${actionFilter}
        AND (
          expires_at IS NULL
          OR expires_at = ''
          OR expires_at > ${
            mysql.getEngineName() === 'mysql'
              ? 'NOW()'
              : `datetime('now', 'localtime')`
          }
        )
      ORDER BY created_at DESC
      LIMIT ${take}
      `,
      listParams,
    );

    return (rows || []).map(notification => {
      const toIso = (value: any) => {
        if (value == null || value === '') {
          return null;
        }
        if (value instanceof Date) {
          return Number.isNaN(value.getTime()) ? null : value.toISOString();
        }
        const asDate = new Date(value);
        if (!Number.isNaN(asDate.getTime())) {
          return asDate.toISOString();
        }
        return String(value);
      };
      const createdAt = toIso(notification.createdAt);
      const sentAt = toIso(notification.sentAt) || createdAt;
      let parsedExtra: any = null;
      if (notification.extraData) {
        try {
          parsedExtra =
            typeof notification.extraData === 'string'
              ? JSON.parse(notification.extraData)
              : notification.extraData;
        } catch {
          parsedExtra = null;
        }
      }
      return {
        ...notification,
        createdAt,
        sentAt,
        extraData: parsedExtra,
        imageUrl: parsedExtra?.imageUrl || parsedExtra?.image || null,
        videoUrl: parsedExtra?.videoUrl || parsedExtra?.video || null,
      };
    });
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    await this.ensureExpiresColumn();
    const engine = mysql.getEngineName() || 'sqlite';
    // Keep the notification visible after open, then auto-delete in about a day
    // (or sooner if a shorter expires_at was already set, e.g. end of day).
    // Spiritual milestones keep their own lifetime — do not force expiry on them.
    const plusOneDay =
      engine === 'mysql'
        ? `DATE_ADD(NOW(), INTERVAL 1 DAY)`
        : `datetime('now', 'localtime', '+1 day')`;
    const nowExpr =
      engine === 'mysql' ? 'NOW()' : `datetime('now', 'localtime')`;

    const before = await mysql.query<any[]>(
      `
      SELECT
        IFNULL(is_read, 0) AS isRead,
        IFNULL(user_opened, 0) AS userOpened,
        broadcast_id AS broadcastId,
        extra_data AS extraData
      FROM notifications
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [id, userId],
    );
    const prev = before?.[0];
    const wasUnread = prev && Number(prev.isRead || 0) === 0;
    const wasUnopened = prev && Number(prev.userOpened || 0) === 0;

    const result = await mysql.query<ResultSetHeader>(
      `
      UPDATE notifications
      SET
        is_read = 1,
        read_at = CURRENT_TIMESTAMP,
        user_opened = 1,
        opened_at = CASE
          WHEN IFNULL(user_opened, 0) = 1 THEN opened_at
          ELSE CURRENT_TIMESTAMP
        END,
        expires_at = CASE
          WHEN IFNULL(action_type, '') IN (
            'JAPA_MILESTONE',
            'ADMIN_BROADCAST',
            'ADMIN_REWARD_NEW',
            'ADMIN_MANTRA_NEW',
            'ADMIN_BANNER_NEW',
            'ADMIN_CHALLENGE_NEW',
            'ADMIN_PRODUCT_NEW',
            'TODAY_BIRTHDAY',
            'ADVANCE_BIRTHDAY',
            'DOB_WISH',
            'MEETING_LIVE',
            'MEETING_SCHEDULED'
          ) THEN expires_at
          WHEN expires_at IS NOT NULL
            AND expires_at <> ''
            AND expires_at > ${nowExpr}
            AND expires_at < ${plusOneDay}
          THEN expires_at
          ELSE ${plusOneDay}
        END
      WHERE id = ?
      AND user_id = ?
      `,
      [id, userId],
    );

    if (Number(result?.affectedRows || 0) > 0) {
      const bid =
        Number(prev?.broadcastId || 0) || this.parseBroadcastId(prev?.extraData);
      if (bid) {
        if (wasUnread) {
          await bumpQueueReadCount(bid, 1);
        }
        if (wasUnopened) {
          await bumpQueueOpenedCount(bid, 1);
        }
      }
    }
  }

  async getUnreadCount(userId: number, actionType?: string) {
    await this.purgeExpired(userId);
    const rows = await mysql.query<any[]>(
      `
      SELECT COUNT(*) AS unreadCount
      FROM notifications
      WHERE user_id = ?
        ${actionType ? 'AND action_type = ?' : ''}
        AND is_read = 0
        AND (
          expires_at IS NULL
          OR expires_at = ''
          OR expires_at > ${
            mysql.getEngineName() === 'mysql'
              ? 'NOW()'
              : `datetime('now', 'localtime')`
          }
        )
      `,
      actionType ? [userId, actionType] : [userId],
    );
    return rows[0]?.unreadCount ?? 0;
  }

  async existsByAction(
    userId: number,
    actionType: string,
    actionId: number,
  ) {
    const rows = await mysql.query<any[]>(
      `
      SELECT id
      FROM notifications
      WHERE user_id = ?
        AND action_type = ?
        AND action_id = ?
      LIMIT 1
      `,
      [userId, actionType, actionId],
    );
    return Boolean(rows[0]?.id);
  }

  async findByAction(
    userId: number,
    actionType: string,
    actionId: number,
  ) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        title,
        message,
        extra_data AS extraData
      FROM notifications
      WHERE user_id = ?
        AND action_type = ?
        AND action_id = ?
      LIMIT 1
      `,
      [userId, actionType, actionId],
    );
    const row = rows?.[0];
    if (!row) {
      return null;
    }
    let extraData: Record<string, any> = {};
    if (row.extraData) {
      try {
        extraData =
          typeof row.extraData === 'string'
            ? JSON.parse(row.extraData)
            : row.extraData;
      } catch {
        extraData = {};
      }
    }
    return {
      id: Number(row.id),
      title: String(row.title || ''),
      message: String(row.message || ''),
      extraData,
    };
  }

  async mergeExtraData(
    id: number,
    userId: number,
    patch: Record<string, any>,
  ) {
    const rows = await mysql.query<any[]>(
      `
      SELECT extra_data AS extraData
      FROM notifications
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [id, userId],
    );
    const row = rows?.[0];
    if (!row) {
      return;
    }
    let extraData: Record<string, any> = {};
    if (row.extraData) {
      try {
        extraData =
          typeof row.extraData === 'string'
            ? JSON.parse(row.extraData)
            : row.extraData;
      } catch {
        extraData = {};
      }
    }
    const next = {...extraData, ...patch};
    await mysql.query(
      `
      UPDATE notifications
      SET extra_data = ?
      WHERE id = ?
        AND user_id = ?
      `,
      [JSON.stringify(next), id, userId],
    );
  }

  async getUnreadCountByAction(userId: number, actionType: string) {
    const rows = await mysql.query<any[]>(
      `
      SELECT COUNT(*) AS unreadCount
      FROM notifications
      WHERE user_id = ?
        AND action_type = ?
        AND is_read = 0
      `,
      [userId, actionType],
    );
    return Number(rows[0]?.unreadCount ?? 0);
  }

  async getLatestByAction(userId: number, actionType: string) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        title,
        message,
        action_id AS actionId,
        sent_at AS sentAt,
        is_read AS isRead
      FROM notifications
      WHERE user_id = ?
        AND action_type = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId, actionType],
    );
    return rows[0] ?? null;
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.ensureExpiresColumn();

    // Capture unread + not-yet-opened before flip for accurate analytics.
    let pendingRows: any[] = [];
    try {
      pendingRows = await mysql.query<any[]>(
        `
        SELECT
          IFNULL(is_read, 0) AS isRead,
          IFNULL(user_opened, 0) AS userOpened,
          broadcast_id AS broadcastId,
          extra_data AS extraData
        FROM notifications
        WHERE user_id = ?
          AND (IFNULL(is_read, 0) = 0 OR IFNULL(user_opened, 0) = 0)
        `,
        [userId],
      );
    } catch {
      // Older DBs without user_opened — fall back to unread-only.
      try {
        pendingRows = await mysql.query<any[]>(
          `
          SELECT
            IFNULL(is_read, 0) AS isRead,
            0 AS userOpened,
            broadcast_id AS broadcastId,
            extra_data AS extraData
          FROM notifications
          WHERE user_id = ?
            AND is_read = 0
          `,
          [userId],
        );
      } catch {
        pendingRows = [];
      }
    }

    try {
      await mysql.query(
        `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = CURRENT_TIMESTAMP,
          user_opened = 1,
          opened_at = CASE
            WHEN IFNULL(user_opened, 0) = 1 THEN opened_at
            ELSE CURRENT_TIMESTAMP
          END
        WHERE user_id = ?
          AND (IFNULL(is_read, 0) = 0 OR IFNULL(user_opened, 0) = 0)
        `,
        [userId],
      );
    } catch {
      await mysql.query(
        `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND is_read = 0
        `,
        [userId],
      );
    }

    const unreadByBroadcast = new Map<number, number>();
    const openedByBroadcast = new Map<number, number>();
    for (const row of pendingRows || []) {
      const bid =
        Number(row?.broadcastId || 0) || this.parseBroadcastId(row?.extraData);
      if (!bid) {
        continue;
      }
      if (Number(row?.isRead || 0) === 0) {
        unreadByBroadcast.set(bid, (unreadByBroadcast.get(bid) || 0) + 1);
      }
      if (Number(row?.userOpened || 0) === 0) {
        openedByBroadcast.set(bid, (openedByBroadcast.get(bid) || 0) + 1);
      }
    }
    for (const [bid, count] of unreadByBroadcast) {
      await bumpQueueReadCount(bid, count);
    }
    for (const [bid, count] of openedByBroadcast) {
      await bumpQueueOpenedCount(bid, count);
    }
  }

  async markMatchingAsRead(
    userId: number,
    filters: { actionType?: string; actionId?: number; broadcastId?: number },
  ): Promise<void> {
    await this.ensureExpiresColumn();
    const matchClauses: string[] = [];
    const matchParams: any[] = [];
    if (filters.actionType) {
      matchClauses.push('action_type = ?');
      matchParams.push(filters.actionType);
    }
    if (filters.actionId) {
      matchClauses.push('action_id = ?');
      matchParams.push(filters.actionId);
    }
    if (filters.broadcastId) {
      matchClauses.push(
        '(broadcast_id = ? OR extra_data LIKE ? OR extra_data LIKE ?)',
      );
      matchParams.push(Number(filters.broadcastId));
      matchParams.push(`%"broadcastId":${filters.broadcastId}%`);
      matchParams.push(`%"queuedId":${filters.broadcastId}%`);
    }

    if (matchClauses.length === 0) {
      return;
    }

    const matchSql = matchClauses.join(' OR ');
    let pendingRows: any[] = [];
    try {
      pendingRows = await mysql.query<any[]>(
        `
        SELECT
          IFNULL(is_read, 0) AS isRead,
          IFNULL(user_opened, 0) AS userOpened,
          broadcast_id AS broadcastId,
          extra_data AS extraData
        FROM notifications
        WHERE user_id = ?
          AND (IFNULL(is_read, 0) = 0 OR IFNULL(user_opened, 0) = 0)
          AND (${matchSql})
        `,
        [userId, ...matchParams],
      );
    } catch {
      pendingRows = [];
    }

    try {
      await mysql.query(
        `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = CURRENT_TIMESTAMP,
          user_opened = 1,
          opened_at = CASE
            WHEN IFNULL(user_opened, 0) = 1 THEN opened_at
            ELSE CURRENT_TIMESTAMP
          END
        WHERE user_id = ?
          AND (IFNULL(is_read, 0) = 0 OR IFNULL(user_opened, 0) = 0)
          AND (${matchSql})
        `,
        [userId, ...matchParams],
      );
    } catch {
      await mysql.query(
        `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND is_read = 0
          AND (${matchSql})
        `,
        [userId, ...matchParams],
      );
    }

    const unreadByBroadcast = new Map<number, number>();
    const openedByBroadcast = new Map<number, number>();
    for (const row of pendingRows || []) {
      const bid =
        Number(row?.broadcastId || 0) ||
        this.parseBroadcastId(row?.extraData) ||
        Number(filters.broadcastId || 0);
      if (!bid) {
        continue;
      }
      if (Number(row?.isRead || 0) === 0) {
        unreadByBroadcast.set(bid, (unreadByBroadcast.get(bid) || 0) + 1);
      }
      if (Number(row?.userOpened || 0) === 0) {
        openedByBroadcast.set(bid, (openedByBroadcast.get(bid) || 0) + 1);
      }
    }
    for (const [bid, count] of unreadByBroadcast) {
      await bumpQueueReadCount(bid, count);
    }
    for (const [bid, count] of openedByBroadcast) {
      await bumpQueueOpenedCount(bid, count);
    }
  }

  async markActionAsRead(userId: number, actionType: string) {
    await this.ensureExpiresColumn();
    let pendingRows: any[] = [];
    try {
      pendingRows = await mysql.query<any[]>(
        `
        SELECT
          IFNULL(is_read, 0) AS isRead,
          IFNULL(user_opened, 0) AS userOpened,
          broadcast_id AS broadcastId,
          extra_data AS extraData
        FROM notifications
        WHERE user_id = ?
          AND action_type = ?
          AND (IFNULL(is_read, 0) = 0 OR IFNULL(user_opened, 0) = 0)
        `,
        [userId, actionType],
      );
    } catch {
      pendingRows = [];
    }

    try {
      await mysql.query(
        `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = CURRENT_TIMESTAMP,
          user_opened = 1,
          opened_at = CASE
            WHEN IFNULL(user_opened, 0) = 1 THEN opened_at
            ELSE CURRENT_TIMESTAMP
          END
        WHERE user_id = ?
          AND action_type = ?
          AND (IFNULL(is_read, 0) = 0 OR IFNULL(user_opened, 0) = 0)
        `,
        [userId, actionType],
      );
    } catch {
      await mysql.query(
        `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND action_type = ?
          AND is_read = 0
        `,
        [userId, actionType],
      );
    }

    const unreadByBroadcast = new Map<number, number>();
    const openedByBroadcast = new Map<number, number>();
    for (const row of pendingRows || []) {
      const bid =
        Number(row?.broadcastId || 0) || this.parseBroadcastId(row?.extraData);
      if (!bid) {
        continue;
      }
      if (Number(row?.isRead || 0) === 0) {
        unreadByBroadcast.set(bid, (unreadByBroadcast.get(bid) || 0) + 1);
      }
      if (Number(row?.userOpened || 0) === 0) {
        openedByBroadcast.set(bid, (openedByBroadcast.get(bid) || 0) + 1);
      }
    }
    for (const [bid, count] of unreadByBroadcast) {
      await bumpQueueReadCount(bid, count);
    }
    for (const [bid, count] of openedByBroadcast) {
      await bumpQueueOpenedCount(bid, count);
    }
  }

  async deleteById(id: number, userId: number): Promise<void> {
    await mysql.query(
      `
      DELETE FROM notifications
      WHERE id = ? AND user_id = ?
      `,
      [id, userId],
    );
  }

  async clearAll(userId: number): Promise<void> {
    await mysql.query(
      `
      DELETE FROM notifications
      WHERE user_id = ?
      `,
      [userId],
    );
  }

  /** Ensure broadcast_id exists and kick a background backfill for analytics. */
  async ensureBroadcastSchema(): Promise<void> {
    await this.ensureBroadcastIdColumn();
  }

  /** Run one synchronous backfill batch so the first analytics page can show reads. */
  async backfillBroadcastIdsOnce(limit = 800): Promise<number> {
    await this.ensureBroadcastIdColumn();
    const engine = mysql.getEngineName() || 'sqlite';
    try {
      if (engine === 'postgres') {
        const result = await mysql.query<ResultSetHeader>(
          `
          UPDATE notifications AS n
          SET broadcast_id = COALESCE(
            NULLIF(substring(n.extra_data from '"broadcastId"[[:space:]]*:[[:space:]]*([0-9]+)'), '')::int,
            NULLIF(substring(n.extra_data from '"queuedId"[[:space:]]*:[[:space:]]*([0-9]+)'), '')::int
          )
          FROM (
            SELECT id
            FROM notifications
            WHERE broadcast_id IS NULL
              AND extra_data IS NOT NULL
              AND extra_data <> ''
              AND (extra_data LIKE '%broadcastId%' OR extra_data LIKE '%queuedId%')
            ORDER BY id DESC
            LIMIT ${Math.max(1, Math.min(2000, Number(limit) || 800))}
          ) AS batch
          WHERE n.id = batch.id
          `,
        );
        return Number(result?.affectedRows || 0);
      }
      if (engine === 'mysql') {
        const result = await mysql.query<ResultSetHeader>(
          `
          UPDATE notifications
          SET broadcast_id = COALESCE(
            CAST(JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.broadcastId')) AS UNSIGNED),
            CAST(JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.queuedId')) AS UNSIGNED)
          )
          WHERE broadcast_id IS NULL
            AND extra_data IS NOT NULL
            AND extra_data <> ''
            AND (extra_data LIKE '%broadcastId%' OR extra_data LIKE '%queuedId%')
          LIMIT ${Math.max(1, Math.min(2000, Number(limit) || 800))}
          `,
        );
        return Number(result?.affectedRows || 0);
      }
    } catch {
      return 0;
    }
    return 0;
  }

  /** LIKE patterns that match exact queue ids in extra_data JSON (no id 12→123). */
  private buildQueueIdMatchSql(ids: number[]): {matchSql: string; params: any[]} {
    const likeClauses: string[] = [];
    const params: any[] = [];
    for (const id of ids) {
      likeClauses.push(
        `(extra_data LIKE ? OR extra_data LIKE ? OR extra_data LIKE ? OR extra_data LIKE ? OR extra_data LIKE ? OR extra_data LIKE ? OR extra_data LIKE ? OR extra_data LIKE ?)`,
      );
      params.push(
        `%"broadcastId":${id},%`,
        `%"broadcastId":${id}}%`,
        `%"broadcastId": ${id},%`,
        `%"broadcastId": ${id}}%`,
        `%"queuedId":${id},%`,
        `%"queuedId":${id}}%`,
        `%"queuedId": ${id},%`,
        `%"queuedId": ${id}}%`,
      );
    }
    return {matchSql: likeClauses.join(' OR '), params};
  }

  /**
   * Fill broadcast_id only for the queue IDs on the current analytics page.
   * One bounded scan (OR of exact id patterns) — avoids leaving older page
   * rows at read=0 after a tiny newest-first backfill.
   */
  async backfillBroadcastIdsForQueueIds(queueIds: number[]): Promise<number> {
    const ids = [...new Set(
      (queueIds || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0),
    )].slice(0, 50);
    if (!ids.length) {
      return 0;
    }
    await this.ensureBroadcastIdColumn();
    const engine = mysql.getEngineName() || 'sqlite';
    const {matchSql, params} = this.buildQueueIdMatchSql(ids);

    try {
      if (engine === 'postgres') {
        const result = await mysql.query<ResultSetHeader>(
          `
          UPDATE notifications AS n
          SET broadcast_id = COALESCE(
            NULLIF(substring(n.extra_data from '"broadcastId"[[:space:]]*:[[:space:]]*"?([0-9]+)"?'), '')::int,
            NULLIF(substring(n.extra_data from '"queuedId"[[:space:]]*:[[:space:]]*"?([0-9]+)"?'), '')::int
          )
          FROM (
            SELECT id
            FROM notifications
            WHERE broadcast_id IS NULL
              AND extra_data IS NOT NULL
              AND extra_data <> ''
              AND (${matchSql})
            LIMIT 50000
          ) AS batch
          WHERE n.id = batch.id
          `,
          params,
        );
        return Number(result?.affectedRows || 0);
      }
      if (engine === 'mysql') {
        const result = await mysql.query<ResultSetHeader>(
          `
          UPDATE notifications
          SET broadcast_id = COALESCE(
            CAST(JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.broadcastId')) AS UNSIGNED),
            CAST(JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.queuedId')) AS UNSIGNED)
          )
          WHERE broadcast_id IS NULL
            AND extra_data IS NOT NULL
            AND extra_data <> ''
            AND (${matchSql})
          LIMIT 50000
          `,
          params,
        );
        return Number(result?.affectedRows || 0);
      }

      // sqlite fallback — small batches via app parse
      const rows = await mysql.query<any[]>(
        `
        SELECT id, extra_data AS extraData
        FROM notifications
        WHERE broadcast_id IS NULL
          AND extra_data IS NOT NULL
          AND extra_data <> ''
          AND (${matchSql})
        LIMIT 2000
        `,
        params,
      );
      let affected = 0;
      const allowed = new Set(ids);
      for (const row of rows || []) {
        const bid = this.parseBroadcastId(row.extraData);
        if (!bid || !allowed.has(bid)) {
          continue;
        }
        await mysql.query(
          `UPDATE notifications SET broadcast_id = ? WHERE id = ?`,
          [bid, row.id],
        );
        affected += 1;
      }
      return affected;
    } catch {
      return 0;
    }
  }

  /**
   * Accurate read counts for a page of queue ids.
   * Uses indexed broadcast_id plus extra_data fallback for rows not backfilled yet.
   */
  async countReadsForQueueIds(
    queueIds: number[],
  ): Promise<Map<number, number>> {
    return this.countFlagForQueueIds(queueIds, 'is_read');
  }

  /**
   * Actual opens: inbox open / mark-as-read / push tap (user_opened=1).
   * Does not include the 2-day auto-read.
   */
  async countOpenedForQueueIds(
    queueIds: number[],
  ): Promise<Map<number, number>> {
    await this.ensureUserOpenedColumn();
    return this.countFlagForQueueIds(queueIds, 'user_opened');
  }

  private async countFlagForQueueIds(
    queueIds: number[],
    flagColumn: 'is_read' | 'user_opened',
  ): Promise<Map<number, number>> {
    const ids = [...new Set(
      (queueIds || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0),
    )].slice(0, 50);
    const out = new Map<number, number>();
    if (!ids.length) {
      return out;
    }
    await this.ensureBroadcastIdColumn();
    const engine = mysql.getEngineName() || 'sqlite';
    const placeholders = ids.map(() => '?').join(', ');
    const flagExpr = `IFNULL(${flagColumn}, 0)`;

    try {
      // Fast path: indexed broadcast_id.
      const indexed = await mysql.query<any[]>(
        `
        SELECT
          broadcast_id AS bid,
          SUM(CASE WHEN ${flagExpr} = 1 THEN 1 ELSE 0 END) AS hits
        FROM notifications
        WHERE broadcast_id IN (${placeholders})
        GROUP BY broadcast_id
        `,
        ids,
      );
      for (const row of indexed || []) {
        const bid = Number(row.bid || 0);
        if (bid) {
          out.set(bid, Math.max(0, Number(row.hits || 0)));
        }
      }

      const missing = ids.filter(id => !out.has(id));
      if (!missing.length) {
        return out;
      }

      // Fallback for rows that still lack broadcast_id (or only have queuedId).
      const {matchSql, params} = this.buildQueueIdMatchSql(missing);
      if (engine === 'postgres') {
        const rows = await mysql.query<any[]>(
          `
          SELECT bid, SUM(hits) AS hits
          FROM (
            SELECT
              COALESCE(
                broadcast_id,
                NULLIF(substring(extra_data from '"broadcastId"[[:space:]]*:[[:space:]]*"?([0-9]+)"?'), '')::int,
                NULLIF(substring(extra_data from '"queuedId"[[:space:]]*:[[:space:]]*"?([0-9]+)"?'), '')::int
              ) AS bid,
              CASE WHEN ${flagExpr} = 1 THEN 1 ELSE 0 END AS hits
            FROM notifications
            WHERE broadcast_id IN (${missing.map(() => '?').join(', ')})
               OR (
                 broadcast_id IS NULL
                 AND extra_data IS NOT NULL
                 AND extra_data <> ''
                 AND (${matchSql})
               )
          ) AS matched
          WHERE bid IN (${missing.map(() => '?').join(', ')})
          GROUP BY bid
          `,
          [...missing, ...params, ...missing],
        );
        for (const row of rows || []) {
          const bid = Number(row.bid || 0);
          if (bid) {
            out.set(bid, Math.max(0, Number(row.hits || 0)));
          }
        }
      } else if (engine === 'mysql') {
        const rows = await mysql.query<any[]>(
          `
          SELECT bid, SUM(hits) AS hits
          FROM (
            SELECT
              COALESCE(
                broadcast_id,
                CAST(JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.broadcastId')) AS UNSIGNED),
                CAST(JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.queuedId')) AS UNSIGNED)
              ) AS bid,
              CASE WHEN ${flagExpr} = 1 THEN 1 ELSE 0 END AS hits
            FROM notifications
            WHERE broadcast_id IN (${missing.map(() => '?').join(', ')})
               OR (
                 broadcast_id IS NULL
                 AND extra_data IS NOT NULL
                 AND extra_data <> ''
                 AND (${matchSql})
               )
          ) AS matched
          WHERE bid IN (${missing.map(() => '?').join(', ')})
          GROUP BY bid
          `,
          [...missing, ...params, ...missing],
        );
        for (const row of rows || []) {
          const bid = Number(row.bid || 0);
          if (bid) {
            out.set(bid, Math.max(0, Number(row.hits || 0)));
          }
        }
      } else {
        const rows = await mysql.query<any[]>(
          `
          SELECT
            extra_data AS extraData,
            ${flagExpr} AS hit
          FROM notifications
          WHERE broadcast_id IS NULL
            AND extra_data IS NOT NULL
            AND extra_data <> ''
            AND (${matchSql})
          LIMIT 20000
          `,
          params,
        );
        const allowed = new Set(missing);
        for (const row of rows || []) {
          const bid = this.parseBroadcastId(row.extraData);
          if (!bid || !allowed.has(bid)) {
            continue;
          }
          if (Number(row.hit || 0) === 1) {
            out.set(bid, (out.get(bid) || 0) + 1);
          } else if (!out.has(bid)) {
            out.set(bid, 0);
          }
        }
      }
    } catch {
      // Caller falls back to stored queue counters.
    }
    return out;
  }
}

export default new NotificationRepository();
