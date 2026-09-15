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

  async create(
    data: CreateOrderRequest,
    orderNumber: string,
  ): Promise<number> {

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