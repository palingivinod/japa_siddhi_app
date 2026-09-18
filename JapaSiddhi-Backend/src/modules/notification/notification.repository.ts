import {ResultSetHeader} from 'mysql2';

import mysql from '../../database/mysql';

class NotificationRepository {
  private expiresColumnReady = false;

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
      WHERE action_type = 'DAILY_JAPA_REMINDER'
        AND date(${dayCol}) < ${todayExpr}
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
        expires_at
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
      ],
    );

    return result.insertId;
  }

  async getUserNotifications(userId: number) {
    await this.purgeExpired(userId);

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
        sent_at AS sentAt,
        read_at AS readAt,
        expires_at AS expiresAt
      FROM notifications
      WHERE user_id = ?
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
      `,
      [userId],
    );

    return (rows || []).map(notification => ({
      ...notification,
      extraData: notification.extraData
        ? typeof notification.extraData === 'string'
          ? JSON.parse(notification.extraData)
          : notification.extraData
        : null,
    }));
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    await mysql.query(
      `
      UPDATE notifications
      SET
        is_read = 1,
        read_at = CURRENT_TIMESTAMP
      WHERE id = ?
      AND user_id = ?
      `,
      [id, userId],
    );
  }

  async getUnreadCount(userId: number) {
    await this.purgeExpired(userId);
    const rows = await mysql.query<any[]>(
      `
      SELECT COUNT(*) AS unreadCount
      FROM notifications
      WHERE user_id = ?
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
      [userId],
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

  async markActionAsRead(userId: number, actionType: string) {
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
}

export default new NotificationRepository();
