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
  private statusEventsReady = false;

  async ensureUserDeletedColumn(): Promise<void> {
    for (const sql of [
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_by_user INTEGER DEFAULT 0',
      'ALTER TABLE orders ADD COLUMN deleted_by_user INTEGER DEFAULT 0',
      'ALTER TABLE orders ADD COLUMN deleted_by_user INT DEFAULT 0',
    ]) {
      try {
        await mysql.query(sql);
        break;
      } catch {
        // Ignored if column already exists.
      }
    }
  }

  async ensureUserReceivedColumn(): Promise<void> {
    for (const sql of [
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_received INTEGER DEFAULT 0',
      'ALTER TABLE orders ADD COLUMN user_received INTEGER DEFAULT 0',
      'ALTER TABLE orders ADD COLUMN user_received INT DEFAULT 0',
    ]) {
      try {
        await mysql.query(sql);
        break;
      } catch {
        // Ignored if column already exists.
      }
    }
    for (const sql of [
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_received_at TEXT NULL',
      'ALTER TABLE orders ADD COLUMN user_received_at TIMESTAMP NULL',
      'ALTER TABLE orders ADD COLUMN user_received_at DATETIME NULL',
    ]) {
      try {
        await mysql.query(sql);
        break;
      } catch {
        // Ignored if column already exists.
      }
    }
  }

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

  /** Timeline dates for Track Order — one row per status change. */
  async ensureStatusEventsTable(): Promise<void> {
    if (this.statusEventsReady) {
      return;
    }
    const engine = mysql.getEngineName() || 'sqlite';
    if (engine === 'mysql') {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS order_status_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          status VARCHAR(40) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_order_status_events_order (order_id)
        )
      `);
    } else if (engine === 'postgres') {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS order_status_events (
          id SERIAL PRIMARY KEY,
          order_id INT NOT NULL,
          status VARCHAR(40) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      try {
        await mysql.query(
          `CREATE INDEX IF NOT EXISTS idx_order_status_events_order ON order_status_events (order_id)`,
        );
      } catch {
        // Index may already exist.
      }
    } else {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS order_status_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    this.statusEventsReady = true;
  }

  async recordStatusEvent(orderId: number, status: string): Promise<void> {
    const id = Number(orderId);
    const next = String(status || '')
      .trim()
      .toUpperCase();
    if (!id || !next) {
      return;
    }
    await this.ensureStatusEventsTable();

    // First status change on an older order: keep Order Placed on the real create day.
    try {
      const prior = await mysql.query<any[]>(
        `
        SELECT COUNT(*) AS total
        FROM order_status_events
        WHERE order_id = ?
        `,
        [id],
      );
      const total = Number(prior?.[0]?.total || 0);
      if (total === 0) {
        const orderRows = await mysql.query<any[]>(
          `
          SELECT created_at AS createdAt, order_status AS orderStatus
          FROM orders
          WHERE id = ?
          LIMIT 1
          `,
          [id],
        );
        const createdAt = orderRows?.[0]?.createdAt;
        const current = String(orderRows?.[0]?.orderStatus || '')
          .trim()
          .toUpperCase();
        if (
          createdAt &&
          next !== 'UNDER_REVIEW' &&
          next !== 'PENDING' &&
          current !== 'UNDER_REVIEW' &&
          current !== 'PENDING'
        ) {
          await mysql.query(
            `
            INSERT INTO order_status_events (order_id, status, created_at)
            VALUES (?, 'UNDER_REVIEW', ?)
            `,
            [id, createdAt],
          );
        }
      }
    } catch {
      // Continue with the new status event.
    }

    await mysql.query(
      `
      INSERT INTO order_status_events (order_id, status)
      VALUES (?, ?)
      `,
      [id, next],
    );
  }

  /**
   * Remove recorded timeline events that occurred after the undone status.
   * Ensures user order tracking steps are rolled back accurately.
   */
  async revertStatusEvents(orderId: number, targetStatus: string): Promise<void> {
    await this.ensureStatusEventsTable();
    const statusRanks: Record<string, number> = {
      UNDER_REVIEW: 1,
      PENDING: 1,
      CALLED_TALKED: 2,
      CALLED_DEVOTEE: 2,
      SANKALP_TAKEN: 3,
      CONFIRMED: 4,
      PROCESSING: 4,
      READY: 4,
      PACKING: 5,
      SHIPPED: 6,
      DELIVERED: 7,
    };
    const targetRank = statusRanks[String(targetStatus || '').toUpperCase()] || 1;
    const higherStatuses = Object.keys(statusRanks).filter(
      k => statusRanks[k] > targetRank,
    );
    if (higherStatuses.length > 0) {
      const placeholders = higherStatuses.map(() => '?').join(',');
      await mysql.query(
        `DELETE FROM order_status_events WHERE order_id = ? AND status IN (${placeholders})`,
        [orderId, ...higherStatuses],
      );
    }
  }

  /**
   * First time each status was reached (IST timestamps from DB).
   * Keys are uppercase status codes.
   */
  async getStatusEventMap(orderId: number): Promise<Record<string, Date>> {
    await this.ensureStatusEventsTable();
    const rows = await mysql.query<any[]>(
      `
      SELECT status, created_at AS createdAt
      FROM order_status_events
      WHERE order_id = ?
      ORDER BY id ASC
      `,
      [orderId],
    );
    const map: Record<string, Date> = {};
    for (const row of rows || []) {
      const key = String(row.status || '')
        .trim()
        .toUpperCase();
      if (!key || map[key]) {
        continue;
      }
      const at = new Date(row.createdAt);
      if (!Number.isNaN(at.getTime())) {
        map[key] = at;
      }
    }
    return map;
  }

  async getNextOrderNumber(prefix?: string): Promise<string> {
    const code = String(prefix || '').toUpperCase();
    if (code === 'RK' || code === 'HB' || code === 'BP') {
      try {
        const rows = await mysql.query<any[]>(
          `
          SELECT order_number FROM orders
          WHERE upper(order_number) LIKE ?
          ORDER BY id DESC
          LIMIT 200
          `,
          [`${code}%`],
        );
        let maxSeq = 0;
        const pattern = new RegExp(`^${code}(\\d+)`, 'i');
        for (const row of rows || []) {
          const match = String(row.order_number || '').match(pattern);
          if (match) {
            const parsed = parseInt(match[1], 10);
            if (parsed > maxSeq) {
              maxSeq = parsed;
            }
          }
        }
        return `${code}${String(maxSeq + 1).padStart(2, '0')}`;
      } catch {
        return `${code}01`;
      }
    }
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

    const insertId = result.insertId;
    try {
      await this.recordStatusEvent(insertId, initialStatus);
    } catch {
      // Timeline table may be unavailable on first boot; tracking still works.
    }
    return insertId;

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

          COALESCE(user_received, 0) AS userReceived,

          user_received_at AS userReceivedAt,

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
    await this.ensureUserDeletedColumn();
    await this.ensureUserReceivedColumn();
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

        COALESCE(user_received, 0) AS userReceived,

        user_received_at AS userReceivedAt,

        created_at AS createdAt

      FROM orders

      WHERE user_id = ?
        AND order_type <> 'NITHYA_HOMAM'
        AND COALESCE(deleted_by_user, 0) = 0
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

        order_status = ?,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = ?
      `,
      [
        status,
        id,
      ],
    );
    try {
      await this.recordStatusEvent(id, status);
    } catch {
      // Non-fatal for status update.
    }

  }

  async markReceivedByUser(
    id: number,
    userId: number,
  ): Promise<'ok' | 'missing' | 'already_received' | 'not_eligible' | 'cancelled'> {
    await this.ensureUserReceivedColumn();
    const rows = await mysql.query<any[]>(
      `
      SELECT order_status AS orderStatus, COALESCE(user_received, 0) AS userReceived
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
    if (rows[0].userReceived) {
      return 'already_received';
    }
    if (status === 'CANCELLED') {
      return 'cancelled';
    }
    // Allow delivery confirmation if order status is DELIVERED or SHIPPED
    if (!status.includes('DELIVER') && !status.includes('SHIP')) {
      return 'not_eligible';
    }
    await mysql.query(
      `
      UPDATE orders
      SET
        order_status = 'DELIVERED',
        user_received = 1,
        user_received_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
      `,
      [id, userId],
    );
    try {
      await this.recordStatusEvent(id, 'DELIVERED');
    } catch {
      // Non-fatal.
    }
    return 'ok';
  }

  async cancelForUser(
    id: number,
    userId: number,
    reason: string,
  ): Promise<'ok' | 'missing' | 'delivered' | 'cancelled'> {
    await this.ensureCancelColumns();
    await this.ensureUserDeletedColumn();
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
    try {
      await this.recordStatusEvent(id, 'CANCELLED');
    } catch {
      // Non-fatal.
    }
    try {
      const claimRows = await mysql.query<any[]>(
        'SELECT reward_id AS rewardId FROM milestone_reward_claims WHERE order_id = ?',
        [id],
      );
      if (claimRows?.length && claimRows[0].rewardId) {
        await mysql.query(
          'UPDATE challenge_rewards SET stock = stock + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [claimRows[0].rewardId],
        );
      }
    } catch {
      // Non-fatal.
    }
    return 'ok';
  }

  async deleteForUser(
    id: number,
    userId: number,
  ): Promise<'ok' | 'missing' | 'not_allowed'> {
    await this.ensureUserDeletedColumn();
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
    if (!status.includes('DELIVER') && !status.includes('CANCEL')) {
      return 'not_allowed';
    }
    await mysql.query(
      `
      UPDATE orders
      SET deleted_by_user = 1
      WHERE id = ? AND user_id = ?
      `,
      [id, userId],
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

  async findActiveOrderForKind(
    userId: number,
    kind: string,
  ): Promise<{id: number; orderNumber: string; orderStatus: string} | null> {
    if (!userId) return null;
    const k = String(kind || '').toUpperCase();
    let whereClause = '';

    if (k === 'BANA_LINGAM' || k.includes('BANA')) {
      whereClause = `(order_type = 'BANA_LINGAM' OR lower(item_name) LIKE '%baanalingam%' OR lower(item_name) LIKE '%banalingam%' OR order_number LIKE 'BL-%' OR order_number LIKE '#BL-%')`;
    } else if (k === 'RAMAKOTI_BOOKS' || k.includes('RAMAKOTI')) {
      whereClause = `(order_type = 'RAMAKOTI_BOOKS' OR lower(item_name) LIKE '%ramakoti%' OR order_number LIKE 'RK%' OR order_number LIKE '#RK%')`;
    } else if (k === 'HOMA_BHASMA' || k.includes('BHASMA')) {
      whereClause = `(order_type = 'HOMA_BHASMA' OR lower(item_name) LIKE '%homa%bhasma%' OR lower(item_name) LIKE '%bhasmam%' OR order_number LIKE 'HB%' OR order_number LIKE '#HB%')`;
    } else if (
      k === 'BIRAVA_PENDANT' ||
      k.includes('PENDANT') ||
      k.includes('PENDENT') ||
      k.includes('BIRAVA') ||
      k.includes('BHIRAVA')
    ) {
      whereClause = `(order_type = 'BIRAVA_PENDANT' OR lower(item_name) LIKE '%birava%' OR lower(item_name) LIKE '%bhirava%' OR lower(item_name) LIKE '%pendant%' OR lower(item_name) LIKE '%pendent%' OR order_number LIKE 'BP%' OR order_number LIKE '#BP%')`;
    } else {
      return null;
    }

    // Ensure column exists first — never fail-open (old catch→null allowed reorders).
    await this.ensureUserDeletedColumn();

    const selectActive = async (withDeletedFilter: boolean) => {
      const deletedSql = withDeletedFilter
        ? 'AND COALESCE(deleted_by_user, 0) = 0'
        : '';
      return mysql.query<any[]>(
        `
        SELECT id, order_number AS orderNumber, order_status AS orderStatus
        FROM orders
        WHERE user_id = ?
          AND ${whereClause}
          ${deletedSql}
          AND upper(REPLACE(REPLACE(IFNULL(order_status, ''), '-', '_'), ' ', '_'))
              NOT IN ('DELIVERED', 'CANCELLED', 'CANCELED')
        ORDER BY id DESC
        LIMIT 1
        `,
        [userId],
      );
    };

    let rows: any[] = [];
    try {
      rows = (await selectActive(true)) || [];
    } catch {
      // Column/SQL edge case: still check without deleted filter (fail closed on total failure).
      try {
        rows = (await selectActive(false)) || [];
      } catch (error: any) {
        throw new Error(
          error?.message ||
            'Unable to verify existing orders. Please try again.',
        );
      }
    }

    if (rows && rows.length > 0) {
      return {
        id: rows[0].id,
        orderNumber: rows[0].orderNumber || `#${rows[0].id}`,
        orderStatus: rows[0].orderStatus,
      };
    }

    return null;
  }
}

export default new OrderRepository();