import {
  ResultSetHeader,
} from 'mysql2';

import mysql from '../../database/mysql';

import {
  ChallengeType,
  CreateChallengeRequest,
  RewardType,
} from './challenge.types';

class ChallengeRepository {

  async create(
    data: CreateChallengeRequest,
  ): Promise<number> {

    const result =
      await mysql.query<ResultSetHeader>(
        `
        INSERT INTO challenges
        (
          title,
          description,
          challenge_type,
          target_value,
          reward_type,
          reward_name,
          reward_quantity,
          start_date,
          end_date
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
          data.title,
          data.description ?? null,
          data.challengeType,
          data.targetValue,
          data.rewardType,
          data.rewardName,
          data.rewardQuantity,
          data.startDate,
          data.endDate,
        ],
      );

    return result.insertId;

  }

  async getById(
    id: number,
  ) {

    const rows =
      await mysql.query<any[]>(
        `
        SELECT

          id,

          title,

          description,

          challenge_type AS challengeType,

          target_value AS targetValue,

          reward_type AS rewardType,

          reward_name AS rewardName,

          reward_quantity AS rewardQuantity,

          start_date AS startDate,

          end_date AS endDate,

          is_active AS isActive,

          created_at AS createdAt,

          updated_at AS updatedAt

        FROM challenges

        WHERE id = ?

        LIMIT 1
        `,
        [
          id,
        ],
      );

    return rows[0] ?? null;

  }

  async getActiveChallenges() {
    // Normalize slash dates (DD/MM/YYYY) so they compare with CURDATE()/date('now').
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        title,
        description,
        challenge_type AS challengeType,
        target_value AS targetValue,
        reward_type AS rewardType,
        reward_name AS rewardName,
        reward_quantity AS rewardQuantity,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive
      FROM challenges
      WHERE is_active = 1
      ORDER BY id DESC
      `,
    );

    const toIso = (raw: unknown) => {
      const value = String(raw || '').trim();
      if (!value) {
        return '';
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      const parts = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
      if (parts) {
        const day = Number(parts[1]);
        const month = Number(parts[2]);
        const year = parts[3];
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
      return value;
    };

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Show all active challenges that have not ended yet (including upcoming).
    return (rows || [])
      .map(row => {
        const startDate = toIso(row.startDate);
        const endDate = toIso(row.endDate);
        const rewardName = String(row.rewardName || '');
        const mantra = rewardName.replace(/\s*Certificate$/i, '').trim();
        return {
          ...row,
          startDate,
          endDate,
          mantra:
            mantra && mantra.toLowerCase() !== 'certificate'
              ? mantra
              : 'Community mantra',
        };
      })
      .filter(row => {
        if (!row.endDate) {
          return true;
        }
        return todayIso <= row.endDate;
      })
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  }

  async join(
    challengeId: number,
    userId: number,
  ): Promise<number> {

    const result =
      await mysql.query<ResultSetHeader>(
        `
        INSERT INTO challenge_participants
        (
          challenge_id,
          user_id
        )
        VALUES
        (
          ?,
          ?
        )
        `,
        [
          challengeId,
          userId,
        ],
      );

    return result.insertId;

  }

  async getParticipant(
    challengeId: number,
    userId: number,
  ) {

    const rows =
      await mysql.query<any[]>(
        `
        SELECT *

        FROM challenge_participants

        WHERE challenge_id = ?

        AND user_id = ?

        LIMIT 1
        `,
        [
          challengeId,
          userId,
        ],
      );

    return rows[0] ?? null;

  }

  async getOpenParticipations(userId: number) {
    return mysql.query<any[]>(
      `
      SELECT
        cp.challenge_id AS challengeId,
        cp.current_value AS currentValue,
        c.target_value AS targetValue
      FROM challenge_participants cp
      INNER JOIN challenges c
        ON c.id = cp.challenge_id
      WHERE cp.user_id = ?
      AND COALESCE(cp.is_completed, 0) = 0
      AND c.is_active = 1
      `,
      [userId],
    );
  }

  async updateProgress(
    challengeId: number,
    userId: number,
    currentValue: number,
    isCompleted: boolean,
  ): Promise<void> {

    await mysql.query(
      `
      UPDATE challenge_participants

      SET

        current_value = ?,

        is_completed = ?,

        completed_at =
        CASE
          WHEN ? = 1
          THEN NOW()
          ELSE completed_at
        END

      WHERE challenge_id = ?

      AND user_id = ?
      `,
      [
        currentValue,
        isCompleted,
        isCompleted,
        challengeId,
        userId,
      ],
    );

  }

  async saveRating(
    challengeId: number,
    userId: number,
    rating: number,
    feedback?: string,
  ) {
    const result = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO challenge_ratings (challenge_id, user_id, rating, feedback)
      VALUES (?, ?, ?, ?)
      `,
      [challengeId, userId, rating, feedback ?? null],
    );
    return result.insertId;
  }

  async leaderboard(
    challengeId: number,
  ) {

    return mysql.query<any[]>(
      `
      SELECT

        cp.user_id AS userId,

        u.full_name AS fullName,

        cp.current_value AS currentValue,

        cp.is_completed AS isCompleted

      FROM challenge_participants cp

      INNER JOIN users u

      ON u.id = cp.user_id

      WHERE cp.challenge_id = ?

      ORDER BY

        cp.current_value DESC,

        cp.completed_at ASC
      `,
      [
        challengeId,
      ],
    );

  }

  /**
   * Challenge-only session analytics from japa_sessions marked Challenge:{id}.
   * These counts stay out of Antharanga / normal japa analytics.
   */
  async getUserChallengeSessionStats(challengeId: number, userId: number) {
    const exact = `Challenge:${challengeId}`;
    const withExtra = `Challenge:${challengeId} ·%`;
    const todayRows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS total
      FROM japa_sessions
      WHERE user_id = ?
      AND (remarks = ? OR remarks LIKE ?)
      AND DATE(created_at, '+5 hours', '30 minutes') =
          DATE('now', '+5 hours', '30 minutes')
      `,
      [userId, exact, withExtra],
    );
    const weekRows = await mysql.query<any[]>(
      `
      SELECT COALESCE(SUM(session_count), 0) AS total
      FROM japa_sessions
      WHERE user_id = ?
      AND (remarks = ? OR remarks LIKE ?)
      AND DATE(created_at, '+5 hours', '30 minutes') >=
          DATE('now', '+5 hours', '30 minutes', '-6 days')
      `,
      [userId, exact, withExtra],
    );
    const dailyRows = await mysql.query<any[]>(
      `
      SELECT
        DATE(created_at, '+5 hours', '30 minutes') AS day,
        COALESCE(SUM(session_count), 0) AS count
      FROM japa_sessions
      WHERE user_id = ?
      AND (remarks = ? OR remarks LIKE ?)
      AND DATE(created_at, '+5 hours', '30 minutes') >=
          DATE('now', '+5 hours', '30 minutes', '-6 days')
      GROUP BY DATE(created_at, '+5 hours', '30 minutes')
      ORDER BY DATE(created_at, '+5 hours', '30 minutes') ASC
      `,
      [userId, exact, withExtra],
    );

    const byDay: Record<string, number> = {};
    (dailyRows || []).forEach((row: any) => {
      const key = String(row.day || '').slice(0, 10);
      byDay[key] = Number(row.count || 0) || 0;
    });

    const dailyActivity: Array<{day: string; label: string; count: number}> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const now = new Date();
      const istMs = now.getTime() + (5 * 60 + 30) * 60 * 1000;
      const ist = new Date(istMs);
      ist.setUTCDate(ist.getUTCDate() - i);
      const key = ist.toISOString().slice(0, 10);
      const label = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][ist.getUTCDay()];
      dailyActivity.push({
        day: key,
        label,
        count: byDay[key] || 0,
      });
    }

    return {
      todayCount: Number(todayRows?.[0]?.total || 0) || 0,
      weekCount: Number(weekRows?.[0]?.total || 0) || 0,
      dailyActivity,
    };
  }

  async listRewards() {
    return mysql.query<any[]>(
      `
      SELECT
        id,
        name,
        stock,
        is_active AS isActive,
        display_order AS displayOrder
      FROM challenge_rewards
      WHERE is_active = 1
      ORDER BY display_order ASC, id ASC
      `,
    );
  }

  async getRewardById(id: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        name,
        stock,
        is_active AS isActive
      FROM challenge_rewards
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    return rows[0] ?? null;
  }

  async getRewardClaim(challengeId: number, userId: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        challenge_id AS challengeId,
        user_id AS userId,
        reward_id AS rewardId,
        reward_name AS rewardName,
        full_name AS fullName,
        mobile,
        address,
        city,
        state,
        pin_code AS pinCode,
        order_id AS orderId,
        order_number AS orderNumber,
        created_at AS createdAt
      FROM challenge_reward_claims
      WHERE challenge_id = ?
      AND user_id = ?
      LIMIT 1
      `,
      [challengeId, userId],
    );
    return rows[0] ?? null;
  }

  async claimReward(
    challengeId: number,
    userId: number,
    rewardId: number,
    rewardName: string,
  ) {
    await mysql.query(
      `
      INSERT INTO challenge_reward_claims
        (challenge_id, user_id, reward_id, reward_name)
      VALUES (?, ?, ?, ?)
      `,
      [challengeId, userId, rewardId, rewardName],
    );
    await mysql.query(
      `
      UPDATE challenge_rewards
      SET stock = CASE WHEN stock > 0 THEN stock - 1 ELSE 0 END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [rewardId],
    );
    await mysql.query(
      `
      UPDATE challenge_participants
      SET reward_given = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE challenge_id = ?
      AND user_id = ?
      `,
      [challengeId, userId],
    );
  }

  async saveRewardDelivery(
    claimId: number,
    delivery: {
      fullName: string;
      mobile: string;
      address: string;
      city: string;
      state: string;
      pinCode: string;
      orderId: number;
      orderNumber: string;
    },
  ) {
    await mysql.query(
      `
      UPDATE challenge_reward_claims
      SET
        full_name = ?,
        mobile = ?,
        address = ?,
        city = ?,
        state = ?,
        pin_code = ?,
        order_id = ?,
        order_number = ?
      WHERE id = ?
      `,
      [
        delivery.fullName,
        delivery.mobile,
        delivery.address,
        delivery.city,
        delivery.state,
        delivery.pinCode,
        delivery.orderId,
        delivery.orderNumber,
        claimId,
      ],
    );
  }

}

export default new ChallengeRepository();
