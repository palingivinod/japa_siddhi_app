import { ResultSetHeader } from 'mysql2';

import mysql from '../../database/mysql';
import socketEmitter from '../../socket/socketEmitter';

class JapaRepository {

  async createSession(
    data: {
      userId: number;
      japaGoalId?: number;
      mantraType: 'DEFAULT' | 'PERSONAL';
      mantraId?: number | null;
      personalMantraId?: number | null;
      chantMode: 'TAP' | 'VOICE';
      sessionCount: number;
      durationSeconds: number;
      remarks?: string | null;
    },
  ): Promise<number> {

    const result =
      await mysql.query<ResultSetHeader>(
        `
        INSERT INTO japa_sessions
        (
          user_id,
          japa_goal_id,
          mantra_type,
          mantra_id,
          personal_mantra_id,
          chant_mode,
          session_count,
          duration_seconds,
          started_at,
          completed_at,
          remarks
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
          NOW(),
          NOW(),
          ?
        )
        `,
        [
          data.userId,
          data.japaGoalId ?? null,
          data.mantraType,
          data.mantraId ?? null,
          data.personalMantraId ?? null,
          data.chantMode,
          data.sessionCount,
          data.durationSeconds,
          data.remarks ?? null,
        ],
      );

    return result.insertId;

  }


  private toCount(value: unknown): number {
    return Number(value ?? 0) || 0;
  }

  async updateJapaGoalProgress(
    goalId: number,
    _count: number,
    userId: number,
  ): Promise<void> {
    const rows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS total
      FROM japa_sessions
      WHERE japa_goal_id = ?
      AND user_id = ?
      `,
      [goalId, userId],
    );
    const completed = this.toCount(rows[0]?.total);

    await mysql.query(
      `
      UPDATE japa_goals
      SET
        completed_count = ?,
        remaining_count =
          CASE
            WHEN target_count - ? < 0 THEN 0
            ELSE target_count - ?
          END
      WHERE id = ?
      AND user_id = ?
      `,
      [completed, completed, completed, goalId, userId],
    );
  }

  async getExactGlobalJapaCount(): Promise<number> {
    const rows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS totalJapaCount
      FROM japa_sessions
      `,
    );
    return this.toCount(rows[0]?.totalJapaCount);
  }

  async updateGlobalJapaCount(
    _count: number,
  ): Promise<number> {
    const totalCount = await this.getExactGlobalJapaCount();

    await mysql.query(
      `
      UPDATE global_japa_counter
      SET total_japa_count = ?
      WHERE id = 1
      `,
      [totalCount],
    );

    socketEmitter.emitGlobalCount(totalCount);
    return totalCount;
  }

  async getUserTotalJapa(userId: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS totalJapaCount
      FROM japa_sessions
      WHERE user_id = ?
      `,
      [userId],
    );
    return this.toCount(rows[0]?.totalJapaCount);
  }

  async getSessionRows(userId: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT created_at AS createdAt, session_count AS sessionCount
      FROM japa_sessions
      WHERE user_id = ?
      ORDER BY created_at ASC
      `,
      [userId],
    );
    return (rows || []).map(item => ({
      createdAt: String(item.createdAt || item.created_at || ''),
      sessionCount: this.toCount(item.sessionCount ?? item.session_count),
    }));
  }

  async getRangeJapa(userId: number, fromSql: string) {
    const rows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS total
      FROM japa_sessions
      WHERE user_id = ?
      AND DATE(created_at, '+5 hours', '30 minutes') >= ${fromSql}
      `,
      [userId],
    );
    return this.toCount(rows[0]?.total);
  }

  async getTodayJapa(userId: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS todayJapaCount
      FROM japa_sessions
      WHERE user_id = ?
      AND DATE(created_at, '+5 hours', '30 minutes') =
          DATE('now', '+5 hours', '30 minutes')
      `,
      [userId],
    );
    return this.toCount(rows[0]?.todayJapaCount);
  }

  async getWeekJapa(userId: number) {
    return this.getRangeJapa(
      userId,
      "DATE('now', '+5 hours', '30 minutes', '-6 days')",
    );
  }

  async getMonthJapa(userId: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS total
      FROM japa_sessions
      WHERE user_id = ?
      AND strftime('%Y-%m', created_at, '+5 hours', '30 minutes') =
          strftime('%Y-%m', 'now', '+5 hours', '30 minutes')
      `,
      [userId],
    );
    return this.toCount(rows[0]?.total);
  }

  async getGlobalJapaCount() {
    return this.getExactGlobalJapaCount();
  }

  async getDevoteeCount() {
    const rows = await mysql.query<any[]>(
      `
      SELECT COUNT(DISTINCT user_id) AS total
      FROM japa_sessions
      `,
    );
    return this.toCount(rows[0]?.total);
  }

  async getWeeklyBreakdown(userId: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        DATE(created_at, '+5 hours', '30 minutes') AS day,
        COALESCE(SUM(session_count), 0) AS count
      FROM japa_sessions
      WHERE user_id = ?
      AND DATE(created_at, '+5 hours', '30 minutes') >=
          DATE('now', '+5 hours', '30 minutes', '-6 days')
      GROUP BY DATE(created_at, '+5 hours', '30 minutes')
      ORDER BY DATE(created_at, '+5 hours', '30 minutes') ASC
      `,
      [userId],
    );
    return (rows || []).map(item => ({
      day: String(item.day || ''),
      count: this.toCount(item.count),
    }));
  }

  async saveReference(
    userId: number,
    mantraId: number | null,
    durationMs: number,
  ) {
    await mysql.query(
      `DELETE FROM japa_references WHERE user_id = ?`,
      [userId],
    );
    const result = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO japa_references (user_id, mantra_id, duration_ms)
      VALUES (?, ?, ?)
      `,
      [userId, mantraId, durationMs],
    );
    return result.insertId;
  }

  async getReference(userId: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        mantra_id AS mantraId,
        duration_ms AS durationMs,
        created_at AS createdAt
      FROM japa_references
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId],
    );
    return rows[0] ?? null;
  }

  async getSettings(userId: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        language_code AS languageCode,
        notifications_on AS notificationsOn,
        auto_lock_on AS autoLockOn
      FROM user_settings
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId],
    );
    return (
      rows[0] ?? {
        languageCode: 'en',
        notificationsOn: 1,
        autoLockOn: 1,
      }
    );
  }

  async saveSettings(
    userId: number,
    data: {
      languageCode?: string;
      notificationsOn?: number;
      autoLockOn?: number;
    },
  ) {
    const current = await this.getSettings(userId);
    await mysql.query(`DELETE FROM user_settings WHERE user_id = ?`, [userId]);
    await mysql.query(
      `
      INSERT INTO user_settings
        (user_id, language_code, notifications_on, auto_lock_on)
      VALUES (?, ?, ?, ?)
      `,
      [
        userId,
        data.languageCode ?? current.languageCode ?? 'en',
        data.notificationsOn ?? current.notificationsOn ?? 1,
        data.autoLockOn ?? current.autoLockOn ?? 1,
      ],
    );
    return this.getSettings(userId);
  }

}

export default new JapaRepository();