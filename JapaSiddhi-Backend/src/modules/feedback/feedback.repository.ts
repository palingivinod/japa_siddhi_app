import {ResultSetHeader} from 'mysql2';

import mysql from '../../database/mysql';
import {CreateFeedbackRequest} from './feedback.types';

class FeedbackRepository {
  private columnsReady = false;

  private async ensureColumns() {
    if (this.columnsReady) {
      return;
    }
    this.columnsReady = true;
    try {
      await mysql.query(`ALTER TABLE feedback ADD COLUMN video_url TEXT NULL`);
    } catch {
      // Column already exists.
    }
  }

  async create(data: CreateFeedbackRequest): Promise<number> {
    await this.ensureColumns();
    const result = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO feedback
      (
        user_id,
        rating,
        title,
        message,
        video_url
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?
      )
      `,
      [
        data.userId,
        data.rating,
        data.title,
        data.message,
        data.videoUrl || null,
      ],
    );
    return result.insertId;
  }

  async getById(id: number) {
    await this.ensureColumns();
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        user_id AS userId,
        rating,
        title,
        message,
        video_url AS videoUrl,
        created_at AS createdAt
      FROM feedback
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    return rows[0] ?? null;
  }

  async getUserFeedback(userId: number) {
    await this.ensureColumns();
    return mysql.query<any[]>(
      `
      SELECT
        id,
        rating,
        title,
        message,
        video_url AS videoUrl,
        created_at AS createdAt
      FROM feedback
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId],
    );
  }

  /** Admin review needs the devotee behind each entry, not just their id. */
  async getAll() {
    await this.ensureColumns();
    return mysql.query<any[]>(
      `
      SELECT
        f.id,
        f.user_id AS userId,
        f.rating,
        f.title,
        f.message,
        f.video_url AS videoUrl,
        f.created_at AS createdAt,
        u.full_name AS userName,
        u.mobile_number AS userMobile,
        u.email AS userEmail
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      `,
    );
  }
}

export default new FeedbackRepository();
