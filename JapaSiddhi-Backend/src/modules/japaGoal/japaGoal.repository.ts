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
  private utcDateRepairReady = false;

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

  /**
   * Goals saved before the Indian-date fix stored the phone's local midnight
   * as the previous UTC day. That is exactly one day before the Indian day
   * the goal was created. Move those dates forward once. Later saves already
   * match the creation day, so they are left alone.
   */
  private async repairUtcGoalDates() {
    if (this.utcDateRepairReady) {
      return;
    }
    await this.ensurePlanDateColumn();
    const isMysql = mysql.getEngineName() === 'mysql';
    if (isMysql) {
      await mysql.query(
        `
        UPDATE japa_goals
        SET
          start_date = DATE_ADD(start_date, INTERVAL 1 DAY),
          end_date = DATE_ADD(end_date, INTERVAL 1 DAY),
          daily_plan_date = NULL
        WHERE start_date = DATE_SUB(
          DATE(DATE_ADD(created_at, INTERVAL 330 MINUTE)),
          INTERVAL 1 DAY
        )
        `,
      );
      await mysql.query(
        `
        UPDATE japa_goals
        SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'EXPIRED'
          AND end_date >= DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE))
          AND COALESCE(completed_count, 0) < COALESCE(target_count, 0)
        `,
      );
    } else {
      await mysql.query(
        `
        UPDATE japa_goals
        SET
          start_date = date(start_date, '+1 day'),
          end_date = date(end_date, '+1 day'),
          daily_plan_date = NULL
        WHERE date(start_date) = date(created_at, '+5 hours', '30 minutes', '-1 day')
        `,
      );
      await mysql.query(
        `
        UPDATE japa_goals
        SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'EXPIRED'
          AND date(end_date) >= date('now', '+5 hours', '30 minutes')
          AND COALESCE(completed_count, 0) < COALESCE(target_count, 0)
        `,
      );
    }
    this.utcDateRepairReady = true;
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

  /**
   * A goal whose deadline is MORE than 2 days behind is expired for good
   * (deadline D → expired from D+2). `end_date < graceCutoff(today)` means
   * the deadline is that far back. Date-based, so it does not depend on the
   * devotee opening the app.
   */
  private graceCutoff(todayIso: string) {
    return this.addIsoDays(todayIso, -1);
  }

  private isPastGrace(endIso: string, todayIso: string) {
    return Boolean(endIso) && endIso.slice(0, 10) < this.graceCutoff(todayIso);
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
      // Real remaining calendar days (long Antharanga goals must not use ÷30).
      return Math.max(1, Math.ceil(remaining / days));
    };

    for (const goal of goals) {
      const counts = new Map<string, number>();
      for (const row of sessionRows || []) {
        const sameGoal = Number(row.goalId || 0) === Number(goal.id);
        if (!sameGoal) {
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


  /**
   * Personal / typed goals must not keep a catalog mantra_id. That id made
   * Home / Your Japas show Om Namah Shivaya over the devotee's typed name.
   */
  async repairPersonalGoalCatalogIds(userId?: number): Promise<void> {
    // Clear catalog mantra_id on Antharanga rows only — never touch Samuhika/Daily DEFAULT.
    const personalClause = `
      mantra_id IS NOT NULL
      AND (
        UPPER(IFNULL(mantra_type, '')) = 'PERSONAL'
        OR personal_mantra_id IS NOT NULL
      )
    `;
    try {
      if (userId) {
        await mysql.query(
          `
          UPDATE japa_goals
          SET mantra_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
            AND ${personalClause}
          `,
          [userId],
        );
        return;
      }
      await mysql.query(
        `
        UPDATE japa_goals
        SET mantra_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE ${personalClause}
        `,
      );
    } catch {
      // Older schemas without columns — ignore.
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
    await this.repairPersonalGoalCatalogIds(data.userId);
    const isPersonal =
      data.mantraType === 'PERSONAL' || Boolean(data.personalMantraId);
    const catalogMantraId = isPersonal ? null : data.mantraId ?? null;
    const sameMantra = await mysql.query<any[]>(
      `
      SELECT id, created_at AS createdAt
      FROM japa_goals
      WHERE user_id = ?
        AND status = 'ACTIVE'
        AND (
          (? IS NOT NULL AND personal_mantra_id = ?)
          OR (
            ? IS NULL
            AND ? IS NOT NULL
            AND mantra_id = ?
            AND personal_mantra_id IS NULL
          )
        )
      ORDER BY id DESC
      `,
      [
        data.userId,
        data.personalMantraId ?? null,
        data.personalMantraId ?? null,
        data.personalMantraId ?? null,
        data.mantraId ?? null,
        data.mantraId ?? null,
      ],
    );
    const recentCutoff = Date.now() - 20000;
    let recentId = 0;
    for (const row of sameMantra || []) {
      const created = new Date(row.createdAt).getTime();
      if (!recentId && Number.isFinite(created) && created >= recentCutoff) {
        recentId = Number(row.id);
        continue;
      }
      await mysql.query(
        `
        UPDATE japa_goals
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        AND user_id = ?
        AND status = 'ACTIVE'
        `,
        [row.id, data.userId],
      );
    }
    if (recentId) {
      await mysql.query(
        `
        UPDATE japa_goals
        SET
          mantra_type = ?,
          mantra_id = ?,
          personal_mantra_id = ?,
          goal_name = ?,
          target_count = ?,
          completed_count = 0,
          remaining_count = ?,
          start_date = ?,
          end_date = ?,
          daily_target = ?,
          daily_plan_date = ?,
          notes = ?,
          status = 'ACTIVE',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        AND user_id = ?
        `,
        [
          isPersonal ? 'PERSONAL' : data.mantraType,
          catalogMantraId,
          data.personalMantraId ?? null,
          data.goalName,
          data.targetCount,
          data.remainingCount,
          data.startDate,
          data.endDate,
          data.dailyTarget,
          data.startDate,
          data.notes ?? null,
          recentId,
          data.userId,
        ],
      );
      return recentId;
    }
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
          isPersonal ? 'PERSONAL' : data.mantraType,
          catalogMantraId,
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



  /**
   * Reuse an existing DEFAULT catalog goal. Does NOT invent Om Namah Shivaya
   * when mantraId is missing (that caused empty / wrong Namah Shivaya goals).
   */
  async findOrCreateActiveGoal(
    userId: number,
    mantraId?: number | null,
  ): Promise<number | undefined> {
    const catalogId = Number(mantraId || 0) || 0;
    if (catalogId > 0) {
      const forMantra = await mysql.query<any[]>(
        `
        SELECT id
        FROM japa_goals
        WHERE user_id = ?
          AND status = 'ACTIVE'
          AND mantra_type = 'DEFAULT'
          AND mantra_id = ?
          AND personal_mantra_id IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId, catalogId],
      );
      if (forMantra?.length) {
        return Number(forMantra[0].id);
      }
      return this.createGoal({
        userId,
        mantraType: 'DEFAULT',
        mantraId: catalogId,
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

    const rows = await mysql.query<any[]>(
      `
      SELECT id
      FROM japa_goals
      WHERE user_id = ?
      AND status = 'ACTIVE'
      AND mantra_type = 'DEFAULT'
      AND personal_mantra_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId],
    );

    if (rows.length) {
      return Number(rows[0].id);
    }

    // No catalog id → do not auto-create Om Namah Shivaya (mantra id 1).
    return undefined;
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

  /**
   * Link a chant to the devotee's existing ACTIVE goal for this catalog mantra.
   * Never creates a goal — auto "Samuhika Japa" / "Daily Japa" defaults were
   * being minted on first chant and mislabelled devotees as Samuhika.
   */
  async findActiveGoalForMantra(
    userId: number,
    mantraId: number,
  ): Promise<number | undefined> {
    const rows = await mysql.query<any[]>(
      `
      SELECT id
      FROM japa_goals
      WHERE user_id = ?
      AND status = 'ACTIVE'
      AND mantra_type = 'DEFAULT'
      AND mantra_id = ?
      AND personal_mantra_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId, mantraId],
    );
    return rows?.length ? Number(rows[0].id) : undefined;
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
      await this.repairUtcGoalDates();
      await this.repairPersonalGoalCatalogIds(userId);
      await this.ensureDeadlinePromptColumn();
      const todayIst = istToday();
      // Deadline D: on D+1 the devotee is asked once whether to extend.
      // From D+2 the goal is expired for good (no extend / change deadline).
      const cutoff = this.graceCutoff(todayIst);
      // Step 1: deadline passed (yesterday) and goal not finished → ask once.
      const newlyPassed = await mysql.query<any[]>(
        `
        SELECT
          id,
          goal_name AS goalName,
          target_count AS targetCount,
          completed_count AS completedCount,
          daily_target AS dailyTarget,
          mantra_type AS mantraType,
          mantra_id AS mantraId,
          personal_mantra_id AS personalMantraId
        FROM japa_goals
        WHERE user_id = ?
          AND status = 'ACTIVE'
          AND end_date < ?
          AND end_date >= ?
          AND COALESCE(completed_count, 0) < COALESCE(target_count, 0)
          AND deadline_prompt_at IS NULL
        `,
        [userId, todayIst, cutoff],
      );
      for (const goal of newlyPassed || []) {
        await mysql.query(
          `UPDATE japa_goals SET deadline_prompt_at = ? WHERE id = ? AND user_id = ?`,
          [todayIst, goal.id, userId],
        );
        await this.notifyDeadlinePassed(userId, goal);
      }
      // Step 2: deadline is more than 2 days behind and goal unfinished →
      // expire. Only the status changes; sessions and counts are untouched.
      await mysql.query(
        `
        UPDATE japa_goals
        SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND status = 'ACTIVE'
          AND end_date < ?
          AND COALESCE(completed_count, 0) < COALESCE(target_count, 0)
        `,
        [userId, cutoff],
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

        CASE
          -- Personal/typed: never fall back to catalog (Om Namah Shivaya).
          WHEN UPPER(IFNULL(j.mantra_type, '')) = 'PERSONAL'
            OR j.personal_mantra_id IS NOT NULL
          THEN COALESCE(
            NULLIF(upm.mantra_name, ''),
            NULLIF(j.goal_name, ''),
            'My Japa'
          )
          ELSE COALESCE(
            NULLIF(m.mantra_name, ''),
            NULLIF(upm.mantra_name, ''),
            NULLIF(j.goal_name, '')
          )
        END AS mantraName,

        j.target_count AS targetCount,

        COALESCE((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.user_id = j.user_id
          AND js.japa_goal_id = j.id
        ), 0) AS completedCount,

        COALESCE((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.user_id = j.user_id
          AND js.japa_goal_id = j.id
          AND ${todayCondition}
        ), 0) AS todayCompletedCount,

        CASE
          WHEN j.target_count - COALESCE((
            SELECT SUM(js.session_count)
            FROM japa_sessions js
            WHERE js.user_id = j.user_id
            AND js.japa_goal_id = j.id
          ), 0) < 0 THEN 0
          ELSE j.target_count - COALESCE((
            SELECT SUM(js.session_count)
            FROM japa_sessions js
            WHERE js.user_id = j.user_id
            AND js.japa_goal_id = j.id
          ), 0)
        END AS remainingCount,

        j.daily_target AS dailyTarget,

        j.daily_plan_date AS dailyPlanDate,

        j.start_date AS startDate,

        j.end_date AS endDate,

        j.notes AS notes,

        j.status,

        m.starts_at AS mantraStartsAt,

        m.deadline_at AS mantraDeadlineAt

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

  private deadlinePromptReady = false;

  /**
   * In-app + push: deadline reached, devotee can extend or change it.
   * `today` = sent on the deadline date itself; `passed` = fallback sent the
   * day after (e.g. the morning send was missed).
   */
  async notifyDeadlinePassed(
    userId: number,
    goal: any,
    when: 'today' | 'passed' = 'passed',
  ) {
    const goalId = Number(goal.id);
    const name = String(goal.goalName || 'your japa').trim().slice(0, 60);
    const title =
      when === 'today' ? 'Japa deadline today' : 'Japa deadline passed';
    const message =
      when === 'today'
        ? `Today is the last day for "${name}". Want more time? Tap here to extend your deadline. If you ignore it, the goal will expire.`
        : `The deadline for "${name}" has passed. Want more time? Tap here to extend your deadline. If you ignore it, the goal will expire.`;
    try {
      const notificationService = (
        await import('../notification/notification.service')
      ).default;
      await notificationService.create({
        userId,
        title,
        message,
        notificationType: 'SYSTEM',
        actionType: 'GOAL_DEADLINE_EXTEND',
        actionId: goalId,
        extraData: {
          goalId,
          mantraName: name,
          mantraType: goal.mantraType,
          mantraId: goal.mantraId,
          personalMantraId: goal.personalMantraId,
          targetCount: goal.targetCount,
          completedCount: goal.completedCount,
          dailyTarget: goal.dailyTarget,
        },
      });
    } catch (err) {
      console.warn('Deadline in-app notification failed:', err);
    }
    try {
      const tokenRows = await mysql.query<any[]>(
        `SELECT fcm_token AS fcmToken FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
        [userId],
      );
      const token = String(tokenRows?.[0]?.fcmToken || '').trim();
      if (token) {
        const {sendPushToTokens} = await import(
          '../admin/adminNotification.service'
        );
        await sendPushToTokens([token], title, message, 'GOAL_DEADLINE_EXTEND');
      }
    } catch (err) {
      console.warn('Deadline push failed:', err);
    }
  }

  async ensureDeadlinePromptColumn() {
    if (this.deadlinePromptReady) {
      return;
    }
    try {
      await mysql.query(
        `ALTER TABLE japa_goals ADD COLUMN deadline_prompt_at TEXT NULL`,
      );
    } catch {
      // Column already present.
    }
    this.deadlinePromptReady = true;
  }

  /**
   * Deadline rule: devotee's picked date (today or later) → existing deadline
   * (today or later) → today. Daily goal is then extra ÷ days from today.
   */
  private resolveDeadline(
    picked: string | null | undefined,
    existing: string,
    today: string,
  ): string {
    const isIso = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
    const pickedDay = String(picked || '').slice(0, 10);
    if (isIso(pickedDay) && pickedDay >= today) {
      return pickedDay;
    }
    if (isIso(existing) && existing >= today) {
      return existing;
    }
    return today;
  }

  /** Devotee picks a new deadline for a goal whose deadline has passed. */
  async changeDeadline(
    id: number,
    userId: number,
    endDate: string,
  ): Promise<{
    goalId: number;
    endDate: string;
    dailyTarget: number;
    remainingCount: number;
    status: string;
  }> {
    await this.ensurePlanDateColumn();
    await this.ensureDeadlinePromptColumn();
    const goal = await this.getGoalById(id, userId);
    if (!goal) {
      throw Object.assign(new Error('Japa goal not found'), {statusCode: 404});
    }
    const status = String(goal.status || '').toUpperCase();
    if (status !== 'ACTIVE') {
      throw Object.assign(
        new Error(
          status === 'EXPIRED'
            ? 'This goal has expired and cannot be extended'
            : 'Only active goals can change deadline',
        ),
        {statusCode: 400},
      );
    }
    const today = istToday();
    // Deadline more than 2 days behind: expired for good, no change allowed.
    if (this.isPastGrace(this.asIsoDate(goal.end_date ?? goal.endDate), today)) {
      throw Object.assign(
        new Error('This goal has expired and cannot be extended'),
        {statusCode: 400},
      );
    }
    const day = String(endDate || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < today) {
      throw Object.assign(
        new Error('Choose a deadline today or later'),
        {statusCode: 400},
      );
    }
    const sumRows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS total
      FROM japa_sessions
      WHERE user_id = ?
        AND japa_goal_id = ?
      `,
      [userId, id],
    );
    const completedCount = Number(sumRows?.[0]?.total || 0);
    const targetCount = Number(goal.target_count ?? goal.targetCount ?? 0);
    const remainingCount = Math.max(0, targetCount - completedCount);
    if (remainingCount <= 0) {
      throw Object.assign(
        new Error('This goal is already completed'),
        {statusCode: 400},
      );
    }
    const days = Math.max(1, this.inclusiveDays(today, day));
    const dailyTarget = Math.max(1, Math.ceil(remainingCount / days));

    await mysql.query(
      `
      UPDATE japa_goals
      SET
        end_date = ?,
        completed_count = ?,
        remaining_count = ?,
        daily_target = ?,
        daily_plan_date = ?,
        deadline_prompt_at = NULL,
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?
      `,
      [day, completedCount, remainingCount, dailyTarget, today, id, userId],
    );

    return {
      goalId: id,
      endDate: day,
      dailyTarget,
      remainingCount,
      status: 'ACTIVE',
    };
  }

  /**
   * Extend an existing goal in place: higher target, keep sessions + completed.
   * Reactivates COMPLETED/EXPIRED. Never cancels the row or siblings.
   */
  async extendGoal(
    id: number,
    userId: number,
    newTargetCount: number,
    options?: {endDate?: string | null; notes?: string | null},
  ): Promise<{
    goalId: number;
    targetCount: number;
    completedCount: number;
    remainingCount: number;
    status: string;
    endDate: string;
    dailyTarget: number;
    days: number;
  }> {
    await this.ensurePlanDateColumn();
    await this.ensureDeadlinePromptColumn();
    const goal = await this.getGoalById(id, userId);
    if (!goal) {
      throw Object.assign(new Error('Japa goal not found'), {statusCode: 404});
    }

    const sumRows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS total
      FROM japa_sessions
      WHERE user_id = ?
        AND japa_goal_id = ?
      `,
      [userId, id],
    );
    const completedCount = Number(sumRows?.[0]?.total || 0);
    const currentTarget = Number(goal.target_count ?? goal.targetCount ?? 0);
    // An unfinished goal that is expired (or more than 2 days past its
    // deadline) cannot be extended. A goal that reached its target can.
    if (completedCount < currentTarget) {
      const prevStatus = String(goal.status || '').toUpperCase();
      const prevEnd = this.asIsoDate(goal.end_date ?? goal.endDate);
      if (prevStatus === 'EXPIRED' || this.isPastGrace(prevEnd, istToday())) {
        throw Object.assign(
          new Error('This goal has expired and cannot be extended'),
          {statusCode: 400},
        );
      }
    }
    const requested = Math.floor(Number(newTargetCount) || 0);
    const targetCount = Math.max(
      currentTarget,
      requested,
      completedCount + 1,
    );
    const remainingCount = Math.max(0, targetCount - completedCount);
    const status = completedCount >= targetCount ? 'COMPLETED' : 'ACTIVE';

    const today = istToday();
    const existingEnd = this.asIsoDate(goal.end_date ?? goal.endDate);
    const endDate = this.resolveDeadline(
      options?.endDate,
      existingEnd,
      today,
    );
    const days = Math.max(1, this.inclusiveDays(today, endDate));
    // Daily goal = the extra count only, spread from the extension day.
    const extra = Math.max(1, targetCount - completedCount);
    const dailyTarget = Math.max(1, Math.ceil(extra / days));

    const prevNotes = String(goal.notes || '').trim();
    const extraNote = String(options?.notes || '').trim();
    const notes = extraNote
      ? prevNotes
        ? `${prevNotes}\n${extraNote}`
        : extraNote
      : prevNotes || null;

    await mysql.query(
      `
      UPDATE japa_goals
      SET
        target_count = ?,
        completed_count = ?,
        remaining_count = ?,
        end_date = ?,
        daily_target = ?,
        daily_plan_date = ?,
        deadline_prompt_at = NULL,
        status = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?
      `,
      [
        targetCount,
        completedCount,
        remainingCount,
        endDate,
        dailyTarget,
        today,
        status,
        notes,
        id,
        userId,
      ],
    );

    return {
      goalId: id,
      targetCount,
      completedCount,
      remainingCount,
      endDate,
      dailyTarget,
      days,
      status,
    };
  }



  /**
   * Hide a goal from Your Japas without deleting rows or session counts.
   * Sets status = CANCELLED (list UI only shows ACTIVE).
   */
  async deleteGoal(
    id: number,
    userId: number,
  ): Promise<void> {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        mantra_type AS mantraType,
        mantra_id AS mantraId,
        personal_mantra_id AS personalMantraId,
        target_count AS targetCount,
        end_date AS endDate
      FROM japa_goals
      WHERE id = ?
      AND user_id = ?
      LIMIT 1
      `,
      [id, userId],
    );
    const goal = rows?.[0];
    if (!goal) {
      return;
    }
    const twins = await mysql.query<any[]>(
      `
      SELECT id
      FROM japa_goals
      WHERE user_id = ?
        AND status = 'ACTIVE'
        AND mantra_type = ?
        AND target_count = ?
        AND end_date = ?
        AND (
          (? IS NOT NULL AND personal_mantra_id = ?)
          OR (
            ? IS NULL
            AND ? IS NOT NULL
            AND mantra_id = ?
            AND personal_mantra_id IS NULL
          )
        )
      `,
      [
        userId,
        goal.mantraType,
        goal.targetCount,
        goal.endDate,
        goal.personalMantraId ?? null,
        goal.personalMantraId ?? null,
        goal.personalMantraId ?? null,
        goal.mantraId ?? null,
        goal.mantraId ?? null,
      ],
    );
    const ids = (twins?.length ? twins : [{id}]).map(row => Number(row.id));
    for (const goalId of ids) {
      await mysql.query(
        `
        UPDATE japa_goals
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
          AND status = 'ACTIVE'
        `,
        [goalId, userId],
      );
    }
  }


}


export default new JapaGoalRepository();