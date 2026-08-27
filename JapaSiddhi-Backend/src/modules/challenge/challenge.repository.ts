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

    return mysql.query<any[]>(
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

      WHERE

        is_active = 1

      AND

        CURDATE() BETWEEN start_date AND end_date

      ORDER BY start_date ASC
      `,
    );

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

}

export default new ChallengeRepository();