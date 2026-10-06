import { ResultSetHeader } from 'mysql2';

import mysql from '../../database/mysql';


class JapaGoalRepository {


  async createGoal(
    data: {
      userId: number;
      mantraType: 'DEFAULT' | 'PERSONAL';
      mantraId?: number | null;
      personalMantraId?: number | null;
      goalName: string;
      targetCount: number;
      remainingCount: number;
      dailyTarget: number;
      startDate: string;
      endDate: string;
      notes?: string | null;
    },
  ): Promise<number> {


    const result =
      await mysql.query<ResultSetHeader>(
        `
        INSERT INTO japa_goals
        (
          user_id,
          mantra_type,
          mantra_id,
          personal_mantra_id,
          goal_name,
          target_count,
          completed_count,
          remaining_count,
          start_date,
          end_date,
          daily_target,
          status,
          notes
        )
        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          0,
          ?,
          ?,
          ?,
          ?,
          'ACTIVE',
          ?
        )
        `,
        [
          data.userId,
          data.mantraType,
          data.mantraId ?? null,
          data.personalMantraId ?? null,
          data.goalName,
          data.targetCount,
          data.remainingCount,
          data.startDate,
          data.endDate,
          data.dailyTarget,
          data.notes ?? null,
        ],
      );


    return result.insertId;

  }



  async findOrCreateActiveGoal(
    userId: number,
    mantraId?: number | null,
  ): Promise<number> {
    const rows = await mysql.query<any[]>(
      `
      SELECT id
      FROM japa_goals
      WHERE user_id = ?
      AND status = 'ACTIVE'
      AND mantra_type = 'DEFAULT'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId],
    );

    if (rows.length) {
      return Number(rows[0].id);
    }

    return this.createGoal({
      userId,
      mantraType: 'DEFAULT',
      mantraId: mantraId ?? 1,
      personalMantraId: null,
      goalName: 'Daily Japa',
      targetCount: 10800,
      remainingCount: 10800,
      dailyTarget: 108,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '2026-12-31',
      notes: 'Personal sadhana',
    });
  }

  /**
   * Samuhika japa membership is per mantra, so an active goal on a different
   * mantra must not be reused when a devotee joins this one.
   */
  async findOrCreateActiveGoalForMantra(
    userId: number,
    mantraId: number,
  ): Promise<number> {
    const rows = await mysql.query<any[]>(
      `
      SELECT id
      FROM japa_goals
      WHERE user_id = ?
      AND status = 'ACTIVE'
      AND mantra_type = 'DEFAULT'
      AND mantra_id = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId, mantraId],
    );

    if (rows.length) {
      return Number(rows[0].id);
    }

    return this.createGoal({
      userId,
      mantraType: 'DEFAULT',
      mantraId,
      personalMantraId: null,
      goalName: 'Samuhika Japa',
      targetCount: 10800,
      remainingCount: 10800,
      dailyTarget: 108,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '2026-12-31',
      notes: 'Samuhika japa',
    });
  }

  async findActiveGoalForPersonalMantra(
    userId: number,
    personalMantraId: number,
  ): Promise<number | undefined> {
    const rows = await mysql.query<any[]>(
      `
      SELECT id
      FROM japa_goals
      WHERE user_id = ?
      AND status = 'ACTIVE'
      AND mantra_type = 'PERSONAL'
      AND personal_mantra_id = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId, personalMantraId],
    );

    if (rows.length) {
      return Number(rows[0].id);
    }

    return undefined;
  }

  async getUserGoals(
    userId: number,
  ) {
    try {
      await mysql.query(
        `
        UPDATE japa_goals
        SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND status = 'ACTIVE'
          AND end_date < CURRENT_DATE
          AND COALESCE(completed_count, 0) < COALESCE(target_count, 0)
        `,
        [userId],
      );
      await mysql.query(
        `
        UPDATE japa_goals
        SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND status = 'ACTIVE'
          AND COALESCE(completed_count, 0) >= COALESCE(target_count, 0)
          AND COALESCE(target_count, 0) > 0
        `,
        [userId],
      );
      // Auto-cleanup dummy 10800 duplicate goals with 0 progress when user has an active custom goal for the same mantra
      await mysql.query(
        `
        UPDATE japa_goals
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND status = 'ACTIVE'
          AND target_count = 10800
          AND COALESCE(completed_count, 0) = 0
          AND (
            SELECT COUNT(*)
            FROM japa_goals other
            WHERE other.user_id = japa_goals.user_id
              AND other.status = 'ACTIVE'
              AND other.id != japa_goals.id
              AND (
                (japa_goals.mantra_id IS NOT NULL AND other.mantra_id = japa_goals.mantra_id)
                OR (japa_goals.personal_mantra_id IS NOT NULL AND other.personal_mantra_id = japa_goals.personal_mantra_id)
              )
          ) > 0
        `,
        [userId],
      );
    } catch {
      // ignore
    }

    const isMysql = mysql.getEngineName() === 'mysql';
    const todayCondition = isMysql
      ? `DATE(DATE_ADD(js.created_at, INTERVAL 330 MINUTE)) = DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE))`
      : `DATE(js.created_at, '+5 hours', '30 minutes') = DATE('now', '+5 hours', '30 minutes')`;

    return mysql.query<any[]>(
      `
      SELECT

        j.id,

        j.goal_name AS goalName,

        j.mantra_type AS mantraType,

        j.mantra_id AS mantraId,

        j.personal_mantra_id AS personalMantraId,

        COALESCE(
          m.mantra_name,
          upm.mantra_name
        ) AS mantraName,

        j.target_count AS targetCount,

        COALESCE((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.user_id = j.user_id
          AND (
            js.japa_goal_id = j.id
            OR (
              (j.personal_mantra_id IS NOT NULL AND js.personal_mantra_id = j.personal_mantra_id)
              OR (j.mantra_id IS NOT NULL AND js.mantra_id = j.mantra_id)
            )
          )
        ), 0) AS completedCount,

        COALESCE((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.user_id = j.user_id
          AND (
            js.japa_goal_id = j.id
            OR (
              (j.personal_mantra_id IS NOT NULL AND js.personal_mantra_id = j.personal_mantra_id)
              OR (j.mantra_id IS NOT NULL AND js.mantra_id = j.mantra_id)
            )
          )
          AND ${todayCondition}
        ), 0) AS todayCompletedCount,

        CASE
          WHEN j.target_count - COALESCE((
            SELECT SUM(js.session_count)
            FROM japa_sessions js
            WHERE js.user_id = j.user_id
            AND (
              js.japa_goal_id = j.id
              OR (
                (j.personal_mantra_id IS NOT NULL AND js.personal_mantra_id = j.personal_mantra_id)
                OR (j.mantra_id IS NOT NULL AND js.mantra_id = j.mantra_id)
              )
            )
          ), 0) < 0 THEN 0
          ELSE j.target_count - COALESCE((
            SELECT SUM(js.session_count)
            FROM japa_sessions js
            WHERE js.user_id = j.user_id
            AND (
              js.japa_goal_id = j.id
              OR (
                (j.personal_mantra_id IS NOT NULL AND js.personal_mantra_id = j.personal_mantra_id)
                OR (j.mantra_id IS NOT NULL AND js.mantra_id = j.mantra_id)
              )
            )
          ), 0)
        END AS remainingCount,

        j.daily_target AS dailyTarget,

        j.start_date AS startDate,

        j.end_date AS endDate,

        j.status

      FROM japa_goals j

      LEFT JOIN mantras m
        ON m.id = j.mantra_id

      LEFT JOIN user_personal_mantras upm
        ON upm.id = j.personal_mantra_id

      WHERE j.user_id = ?

      ORDER BY j.created_at DESC
      `,
      [
        userId,
      ],
    );

  }



  async getGoalById(
    id: number,
    userId: number,
  ) {


    const rows =
      await mysql.query<any[]>(
        `
        SELECT *

        FROM japa_goals

        WHERE id = ?

        AND user_id = ?

        LIMIT 1
        `,
        [
          id,
          userId,
        ],
      );


    return rows.length
      ? rows[0]
      : null;

  }



  async updateStatus(
    id: number,
    userId: number,
    status: string,
  ): Promise<void> {


    await mysql.query(
      `
      UPDATE japa_goals

      SET status = ?

      WHERE id = ?

      AND user_id = ?
      `,
      [
        status,
        id,
        userId,
      ],
    );

  }



  async deleteGoal(
    id: number,
    userId: number,
  ): Promise<void> {


    await mysql.query(
      `
      UPDATE japa_goals

      SET status = 'CANCELLED'

      WHERE id = ?

      AND user_id = ?
      `,
      [
        id,
        userId,
      ],
    );

  }


}


export default new JapaGoalRepository();