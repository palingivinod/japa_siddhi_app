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

  async getUserGoals(
    userId: number,
  ) {


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
          WHERE js.japa_goal_id = j.id
        ), 0) AS completedCount,

        CASE
          WHEN j.target_count - COALESCE((
            SELECT SUM(js.session_count)
            FROM japa_sessions js
            WHERE js.japa_goal_id = j.id
          ), 0) < 0 THEN 0
          ELSE j.target_count - COALESCE((
            SELECT SUM(js.session_count)
            FROM japa_sessions js
            WHERE js.japa_goal_id = j.id
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