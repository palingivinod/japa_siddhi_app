import {ResultSetHeader} from 'mysql2';

import mysql from '../../database/mysql';
import {CreateTicketRequest, TicketStatus} from './customerCare.types';

class CustomerCareRepository {
  private columnsReady = false;

  private async ensureColumns() {
    if (this.columnsReady) {
      return;
    }
    this.columnsReady = true;
    try {
      await mysql.query(
        `ALTER TABLE customer_care ADD COLUMN screenshot_url TEXT NULL`,
      );
    } catch {
      // Column already exists.
    }
  }

  async create(data: CreateTicketRequest): Promise<number> {
    await this.ensureColumns();
    const result = await mysql.query<ResultSetHeader>(
      `
      INSERT INTO customer_care
      (
        user_id,
        subject,
        message,
        screenshot_url
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?
      )
      `,
      [
        data.userId,
        data.subject,
        data.message,
        data.screenshotUrl || null,
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
        subject,
        message,
        screenshot_url AS screenshotUrl,
        admin_reply AS adminReply,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM customer_care
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    return rows[0] ?? null;
  }

  async getUserTickets(userId: number) {
    await this.ensureColumns();
    return mysql.query<any[]>(
      `
      SELECT
        id,
        subject,
        message,
        screenshot_url AS screenshotUrl,
        status,
        created_at AS createdAt
      FROM customer_care
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId],
    );
  }

  async getAll() {
    await this.ensureColumns();
    return mysql.query<any[]>(
      `
      SELECT
        id,
        user_id AS userId,
        subject,
        message,
        screenshot_url AS screenshotUrl,
        admin_reply AS adminReply,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM customer_care
      ORDER BY created_at DESC
      `,
    );
  }

  async reply(id: number, reply: string, status: TicketStatus): Promise<void> {
    await mysql.query(
      `
      UPDATE customer_care
      SET
        admin_reply = ?,
        status = ?
      WHERE id = ?
      `,
      [reply, status, id],
    );
  }
}

export default new CustomerCareRepository();
