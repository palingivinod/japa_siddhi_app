import {
  ResultSetHeader,
} from 'mysql2';

import mysql from '../../database/mysql';

import {
  CreateOrderRequest,
  OrderStatus,
  PaymentStatus,
} from './order.types';

class OrderRepository {

  async ensureCancelColumns(): Promise<void> {
    for (const sql of [
      'ALTER TABLE orders ADD COLUMN cancel_reason TEXT NULL',
      'ALTER TABLE orders ADD COLUMN cancelled_by TEXT NULL',
    ]) {
      try {
        await mysql.query(sql);
      } catch {
        // Column already exists.
      }
    }
  }

  async getNextOrderNumber(): Promise<string> {
    try {
      const rows = await mysql.query<any[]>(`
        SELECT order_number FROM orders WHERE order_number LIKE 'BL-%' ORDER BY id DESC LIMIT 50
      `);
      let maxSeq = 0;
      for (const row of rows || []) {
        const match = String(row.order_number || '').match(/^BL-(\d+)/i);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }
      if (maxSeq === 0) {
        const totalRows = await mysql.query<any[]>(`SELECT COUNT(*) AS total FROM orders`);
        maxSeq = Number(totalRows?.[0]?.total || 0);
      }
      const nextSeq = maxSeq + 1;
      return `BL-${String(nextSeq).padStart(4, '0')}`;
    } catch {
      return `BL-${String(Date.now()).slice(-4)}`;
    }
  }

  async create(
    data: CreateOrderRequest,
    orderNumber: string,
  ): Promise<number> {

    const initialStatus: OrderStatus = data.orderStatus || 'UNDER_REVIEW';

    const result =
      await mysql.query<ResultSetHeader>(
        `
        INSERT INTO orders
        (
          user_id,
          order_number,
          order_type,
          order_source,
          item_name,
          quantity,
          payment_id,
          order_status,
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
          ?
        )
        `,
        [
          data.userId,
          orderNumber,
          data.orderType,
          data.orderSource,
          data.itemName,
          data.quantity,
          data.paymentId ?? null,
          initialStatus,
          data.remarks ?? null,
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

          user_id AS userId,

          order_number AS orderNumber,

          order_type AS orderType,

          order_source AS orderSource,

          item_name AS itemName,

          quantity,

          payment_id AS paymentId,

          payment_status AS paymentStatus,

          order_status AS orderStatus,

          remarks,

          created_at AS createdAt,

          updated_at AS updatedAt

        FROM orders

        WHERE id = ?

        LIMIT 1
        `,
        [
          id,
        ],
      );

    return rows[0] ?? null;

  }

  async getUserOrders(
    userId: number,
  ) {

    await this.ensureCancelColumns();
    return mysql.query<any[]>(
      `
      SELECT

        id,

        order_number AS orderNumber,

        order_type AS orderType,

        order_source AS orderSource,

        item_name AS itemName,

        quantity,

        payment_status AS paymentStatus,

        order_status AS orderStatus,

        remarks,

        cancel_reason AS cancelReason,

        cancelled_by AS cancelledBy,

        created_at AS createdAt

      FROM orders

      WHERE user_id = ?
        AND order_type <> 'NITHYA_HOMAM'
      ORDER BY created_at DESC
      `,
      [
        userId,
      ],
    );

  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus,
  ): Promise<void> {

    await mysql.query(
      `
      UPDATE orders

      SET

        order_status = ?

      WHERE id = ?
      `,
      [
        status,
        id,
      ],
    );

  }

  async cancelForUser(
    id: number,
    userId: number,
    reason: string,
  ): Promise<'ok' | 'missing' | 'delivered' | 'cancelled'> {
    await this.ensureCancelColumns();
    const rows = await mysql.query<any[]>(
      `
      SELECT order_status AS orderStatus
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [id, userId],
    );
    if (!rows?.length) {
      return 'missing';
    }
    const status = String(rows[0].orderStatus || '').toUpperCase();
    if (status === 'DELIVERED') {
      return 'delivered';
    }
    if (status === 'CANCELLED') {
      return 'cancelled';
    }
    await mysql.query(
      `
      UPDATE orders
      SET
        order_status = 'CANCELLED',
        cancel_reason = ?,
        cancelled_by = 'USER',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
      `,
      [reason, id, userId],
    );
    return 'ok';
  }

  async updatePaymentStatus(
    id: number,
    status: PaymentStatus,
  ): Promise<void> {

    await mysql.query(
      `
      UPDATE orders

      SET

        payment_status = ?

      WHERE id = ?
      `,
      [
        status,
        id,
      ],
    );

  }

}

export default new OrderRepository();