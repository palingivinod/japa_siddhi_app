import { ResultSetHeader } from 'mysql2';

import mysql from '../../database/mysql';

const istToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());


class JapaGoalRepository {

  private planDateReady = false;

  private async ensurePlanDateColumn() {
    if (this.planDateReady) {
      return;
    }
    try {
      if (!mysql.getEngineName()) {
        await mysql.query('SELECT 1');
      }
      if (mysql.getEngineName() === 'mysql') {
        await mysql.query(
          `ALTER TABLE japa_goals ADD COLUMN daily_plan_date DATE NULL`,
        );
      } else {
        await mysql.query(
          `ALTER TABLE japa_goals ADD COLUMN daily_plan_date TEXT`,
        );
      }
    } catch {
      // The column is already present.
    }
    this.planDateReady = true;
  }

  private asIsoDate(value: unknown) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const month = String(value.getUTCMonth() + 1).padStart(2, '0');
      const day = String(value.getUTCDate()).padStart(2, '0');
      return `${value.getUTCFullYear()}-${month}-${day}`;
    }
    const text = String(value || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
  }

  private addIsoDays(iso: string, days: number) {
    const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days))
      .toISOString()
      .slice(0, 10);
  }

  private inclusiveDays(fromIso: string, toIso: string) {
    const [y1, m1, d1] = fromIso.slice(0, 10).split('-').map(Number);
    const [y2, m2, d2] = toIso.slice(0, 10).split('-').map(Number);
    return (
      Math.round(
        (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000,
      ) + 1
    );
  }

  /**
   * Lock each mantra's daily goal for the Indian day.
   * An exact previous day keeps the number. A short or extra day divides
   * what is still left by the days still left. A tap during the day does not
   * change it.
   */
  async syncDailyPlans(userId: number) {
    await this.ensurePlanDateColumn();
    const today = istToday();
    const goals = await mysql.query<any[]>(
      `
      SELECT
        id,
        target_count AS targetCount,
        daily_target AS dailyTarget,
        start_date AS startDate,
        end_date AS endDate,
        daily_plan_date AS dailyPlanDate,
        personal_mantra_id AS personalMantraId,
        mantra_id AS mantraId
      FROM japa_goals
      WHERE user_id = ?
      AND status = 'ACTIVE'
      `,
      [userId],
    );
    if (!goals?.length) {
      return;
    }
    const dayExpr =
      mysql.getEngineName() === 'mysql'
        ? `DATE_FORMAT(DATE_ADD(created_at, INTERVAL 330 MINUTE), '%Y-%m-%d')`
        : `DATE(created_at, '+5 hours', '30 minutes')`;
    const sessionRows = await mysql.query<any[]>(
      `
      SELECT
        japa_goal_id AS goalId,
        personal_mantra_id AS personalMantraId,
        mantra_id AS mantraId,
        ${dayExpr} AS day,
        SUM(session_count) AS count
      FROM japa_sessions
      WHERE user_id = ?
      GROUP BY japa_goal_id, personal_mantra_id, mantra_id, ${dayExpr}
      `,
      [userId],
    );

    const divided = (remaining: number, fromDay: string, endDay: string) => {
      if (remaining <= 0) {
        return 0;
      }
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(fromDay) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(endDay)
      ) {
        return remaining;
      }
      let days = this.inclusiveDays(fromDay, endDay);
      if (days < 1) {
        days = 1;
      }
      if (days <= 1) {
        return remaining;
      }
      const divisor = days >= 900 ? 30 : days;
      return Math.max(1, Math.ceil(remaining / divisor));
    };

    for (const goal of goals) {
      const counts = new Map<string, number>();
      for (const row of sessionRows || []) {
        const goalPersonal = Number(goal.personalMantraId || 0);
        const goalMantra = Number(goal.mantraId || 0);
        const rowPersonal = Number(row.personalMantraId || 0);
        const rowMantra = Number(row.mantraId || 0);
        const sameGoal = Number(row.goalId || 0) === Number(goal.id);
        const samePersonal = goalPersonal > 0 && rowPersonal === goalPersonal;
        const sameMantra =
          !goalPersonal && goalMantra > 0 && rowMantra === goalMantra;
        if (!sameGoal && !samePersonal && !sameMantra) {
          continue;
        }
        const day = this.asIsoDate(row.day);
        if (!day) {
          continue;
        }
        counts.set(day, (counts.get(day) || 0) + (Number(row.count) || 0));
      }
      const completedBefore = (day: string) => {
        let sum = 0;
        counts.forEach((count, key) => {
          if (key < day) {
            sum += count;
          }
        });
        return sum;
      };
      const end = this.asIsoDate(goal.endDate);
      const targetCount = Number(goal.targetCount) || 0;
      let target = Number(goal.dailyTarget) || 0;
      let planDate = this.asIsoDate(goal.dailyPlanDate);
      const atStartOf = (day: string) =>
        Math.max(0, targetCount - completedBefore(day));

      if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
        target = divided(atStartOf(today), today, end);
        planDate = today;
      } else if (planDate < today) {
        let cursor = planDate;
        while (cursor < today) {
          const done = counts.get(cursor) || 0;
          const next = this.addIsoDays(cursor, 1);
          if (done !== target) {
            target = divided(atStartOf(next), next, end);
          }
          cursor = next;
        }
        const atToday = atStartOf(today);
        if (target > atToday) {
          target = atToday;
        }
        planDate = today;
      } else {
        const atToday = atStartOf(today);
        if (target > atToday) {
          target = atToday;
        }
        planDate = today;
      }

      const storedDate = this.asIsoDate(goal.dailyPlanDate);
      if (target !== Number(goal.dailyTarget) || storedDate !== planDate) {
        await mysql.query(
          `
          UPDATE japa_goals
          SET daily_target = ?, daily_plan_date = ?
          WHERE id = ?
          AND user_id = ?
          `,
          [target, planDate, goal.id, userId],
        );
      }
    }
  }


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


    await this.ensurePlanDateColumn();
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
          daily_plan_date,
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
          data.startDate,
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
      startDate: istToday(),
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
      startDate: istToday(),
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
      await this.ensurePlanDateColumn();
      const isMysql = mysql.getEngineName() === 'mysql';
      const expiredBeforeToday = isMysql
        ? `end_date < DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE))`
        : `end_date < DATE('now', '+5 hours', '30 minutes')`;
      await mysql.query(
        `
        UPDATE japa_goals
        SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND status = 'ACTIVE'
          AND ${expiredBeforeToday}
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

    try {
      await this.syncDailyPlans(userId);
    } catch {
      // The saved daily goal is still returned.
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

        j.daily_plan_date AS dailyPlanDate,

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