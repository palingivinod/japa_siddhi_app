import {
  ResultSetHeader,
} from 'mysql2';

import mysql from '../../database/mysql';

class NotificationRepository {

  async create(
    data: {
      userId: number;
      title: string;
      message: string;
      notificationType: string;
      actionType?: string | null;
      actionId?: number | null;
      extraData?: Record<string, any> | null;
    },
  ): Promise<number> {

    const result =
      await mysql.query<ResultSetHeader>(
        `
        INSERT INTO notifications
        (
          user_id,
          title,
          message,
          notification_type,
          action_type,
          action_id,
          extra_data
        )
        VALUES
        (
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
          data.extraData
            ? JSON.stringify(data.extraData)
            : null,
        ],
      );

    return result.insertId;

  }

  async getUserNotifications(
    userId: number,
  ) {

    const rows =
      await mysql.query<any[]>(
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

          read_at AS readAt

        FROM notifications

        WHERE user_id = ?

        ORDER BY created_at DESC
        `,
        [
          userId,
        ],
      );

    return rows.map(
      (
        notification,
      ) => ({

        ...notification,

        extraData:
          notification.extraData
            ? JSON.parse(notification.extraData)
            : null,

      }),
    );

  }

  async markAsRead(
    id: number,
    userId: number,
  ): Promise<void> {

    await mysql.query(
      `
      UPDATE notifications

      SET

        is_read = 1,

        read_at = NOW()

      WHERE id = ?

      AND user_id = ?
      `,
      [
        id,
        userId,
      ],
    );

  }

  async getUnreadCount(
    userId: number,
  ) {

    const rows =
      await mysql.query<any[]>(
        `
        SELECT

          COUNT(*) AS unreadCount

        FROM notifications

        WHERE user_id = ?

        AND is_read = 0
        `,
        [
          userId,
        ],
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