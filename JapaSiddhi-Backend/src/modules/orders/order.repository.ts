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
  private orderTypesReady = false;

  /**
   * Free-seva types grow over time. Prefer VARCHAR so new kinds do not require
   * another ENUM ALTER; fall back to expanding ENUM if VARCHAR modify fails.
   */
  async ensureOrderTypeEnum(): Promise<void> {
    if (this.orderTypesReady) {
      return;
    }
    try {
      await mysql.query(
        `ALTER TABLE orders MODIFY COLUMN order_type VARCHAR(64) NOT NULL`,
      );
    } catch {
      try {
        await mysql.query(`
          ALTER TABLE orders
          MODIFY COLUMN order_type ENUM(
            'BANA_LINGAM',
            'RAMAKOTI_BOOKS',
            'HOMA_BHASMA',
            'BIRAVA_PENDANT',
            'SHIVAKOTI_BOOKS',
            'GOU_MAYA_BHASMA',
            'SPIRITUAL_PRODUCT',
            'ANNADANAM',
            'NITHYA_HOMAM'
          ) NOT NULL
        `);
      } catch {
        // Already widened, or non-MySQL engine.
      }
    }
    this.orderTypesReady = true;
  }

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
    const raw = String(prefix || '').toUpperCase().replace(/[^A-Z]/g, '');
    // Legacy Gou Maya used GM; new Pooja Bhasmam orders use PB.
    const code = raw === 'GM' ? 'PB' : raw;
    // Letter prefixes (RK, HB, PB, MSC, MS, admin-derived, …). BL uses BL-#### below.
    if (code && code !== 'BL' && /^[A-Z]{2,4}$/.test(code)) {
      try {
        // PB also counts legacy GM## rows so sequences stay unique.
        const likeParams =
          code === 'PB' ? [`${code}%`, 'GM%'] : [`${code}%`];
        const likeSql =
          code === 'PB'
            ? `upper(order_number) LIKE ? OR upper(order_number) LIKE ?`
            : `upper(order_number) LIKE ?`;
        const rows = await mysql.query<any[]>(
          `
          SELECT order_number FROM orders
          WHERE ${likeSql}
          ORDER BY id DESC
          LIMIT 200
          `,
          likeParams,
        );
        let maxSeq = 0;
        const pattern =
          code === 'PB'
            ? /^(?:PB|GM)(\d+)/i
            : new RegExp(`^${code}(\\d+)`, 'i');
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
    await this.ensureOrderTypeEnum();

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
        // Never restock when admin marked Out of Stock.
        await mysql.query(
          `
          UPDATE challenge_rewards
          SET stock = CASE
                WHEN IFNULL(admin_marked_oos, 0) = 1 THEN stock
                ELSE stock + 1
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
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

  /**
   * Latest non-cancelled Homa / Pooja Bhasmam order within the last `withinDays`.
   * Used for the 30-day reorder cooldown.
   */
  async findRecentBhasmamOrder(
    userId: number,
    orderType: 'HOMA_BHASMA' | 'GOU_MAYA_BHASMA',
    withinDays = 30,
  ): Promise<{
    id: number;
    orderNumber: string;
    orderType: string;
    itemName: string;
    createdAt: string;
  } | null> {
    if (!userId) {
      return null;
    }
    await this.ensureUserDeletedColumn();
    const days = Math.max(1, Number(withinDays) || 30);
    const type = String(orderType || '').toUpperCase();
    const isGou = type === 'GOU_MAYA_BHASMA';
    const typeMatch = isGou
      ? `(
          upper(IFNULL(order_type, '')) = 'GOU_MAYA_BHASMA'
          OR lower(IFNULL(item_name, '')) LIKE '%gou%maya%'
          OR lower(IFNULL(item_name, '')) LIKE '%goumaya%'
          OR lower(IFNULL(item_name, '')) LIKE '%pooja%bhasma%'
          OR IFNULL(order_number, '') LIKE 'PB%'
          OR IFNULL(order_number, '') LIKE '#PB%'
          OR IFNULL(order_number, '') LIKE 'GM%'
          OR IFNULL(order_number, '') LIKE '#GM%'
        )`
      : `(
          (
            upper(IFNULL(order_type, '')) = 'HOMA_BHASMA'
            OR (
              lower(IFNULL(item_name, '')) LIKE '%homa%'
              AND lower(IFNULL(item_name, '')) LIKE '%bhasma%'
            )
            OR IFNULL(order_number, '') LIKE 'HB%'
            OR IFNULL(order_number, '') LIKE '#HB%'
          )
          AND NOT (
            lower(IFNULL(item_name, '')) LIKE '%gou%maya%'
            OR lower(IFNULL(item_name, '')) LIKE '%goumaya%'
            OR lower(IFNULL(item_name, '')) LIKE '%pooja%bhasma%'
            OR IFNULL(order_number, '') LIKE 'PB%'
            OR IFNULL(order_number, '') LIKE '#PB%'
            OR IFNULL(order_number, '') LIKE 'GM%'
            OR IFNULL(order_number, '') LIKE '#GM%'
          )
        )`;

    const selectRecentSql = async (withDeletedFilter: boolean) => {
      const deletedSql = withDeletedFilter
        ? 'AND COALESCE(deleted_by_user, 0) = 0'
        : '';
      const engine = mysql.getEngineName();
      const sinceSql =
        engine === 'mysql'
          ? `created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${days} DAY)`
          : engine === 'postgres'
            ? `created_at::timestamptz >= (NOW() AT TIME ZONE 'UTC') - INTERVAL '${days} days'`
            : `created_at >= datetime('now', '-${days} days')`;
      return mysql.query<any[]>(
        `
        SELECT
          id,
          order_number AS orderNumber,
          order_type AS orderType,
          item_name AS itemName,
          created_at AS createdAt
        FROM orders
        WHERE user_id = ?
          AND ${typeMatch}
          ${deletedSql}
          AND upper(REPLACE(REPLACE(IFNULL(order_status, ''), '-', '_'), ' ', '_'))
              NOT IN ('CANCELLED', 'CANCELED')
          AND ${sinceSql}
        ORDER BY id DESC
        LIMIT 1
        `,
        [userId],
      );
    };

    let rows: any[] = [];
    try {
      rows = (await selectRecentSql(true)) || [];
    } catch {
      try {
        rows = (await selectRecentSql(false)) || [];
      } catch {
        return null;
      }
    }
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: Number(row.id),
      orderNumber: String(row.orderNumber || row.order_number || ''),
      orderType: String(row.orderType || row.order_type || ''),
      itemName: String(row.itemName || row.item_name || ''),
      createdAt: String(row.createdAt || row.created_at || ''),
    };
  }

  /**
   * Any undelivered product order (blocks new product orders globally).
   * Excludes Nithya Homam / Annadanam seva rows.
   */
  async findAnyActiveProductOrder(
    userId: number,
  ): Promise<{id: number; orderNumber: string; orderStatus: string; orderType?: string} | null> {
    if (!userId) {
      return null;
    }
    await this.ensureUserDeletedColumn();

    const selectActive = async (withDeletedFilter: boolean) => {
      const deletedSql = withDeletedFilter
        ? 'AND COALESCE(deleted_by_user, 0) = 0'
        : '';
      return mysql.query<any[]>(
        `
        SELECT
          id,
          order_number AS orderNumber,
          order_status AS orderStatus,
          order_type AS orderType
        FROM orders
        WHERE user_id = ?
          AND UPPER(IFNULL(order_type, '')) NOT IN ('NITHYA_HOMAM', 'ANNADANAM')
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
        orderType: rows[0].orderType,
      };
    }
    return null;
  }

  async findActiveOrderForKind(
    userId: number,
    kind: string,
  ): Promise<{id: number; orderNumber: string; orderStatus: string} | null> {
    if (!userId) return null;
    const k = String(kind || '').toUpperCase();
    let whereClause = '';

    if (k === 'BANA_LINGAM' || k.includes('BANA')) {
      whereClause = `((order_type = 'BANA_LINGAM' OR lower(item_name) LIKE '%baanalingam%' OR lower(item_name) LIKE '%banalingam%' OR order_number LIKE 'BL-%' OR order_number LIKE '#BL-%') AND upper(IFNULL(order_type,'')) NOT IN ('GOU_MAYA_BHASMA','HOMA_BHASMA','RAMAKOTI_BOOKS','SHIVAKOTI_BOOKS','BIRAVA_PENDANT') AND lower(IFNULL(item_name,'')) NOT LIKE '%pooja%bhasma%' AND lower(IFNULL(item_name,'')) NOT LIKE '%homa%bhasma%')`;
    } else if (k === 'RAMAKOTI_BOOKS' || k.includes('RAMAKOTI')) {
      whereClause = `(order_type = 'RAMAKOTI_BOOKS' OR lower(item_name) LIKE '%ramakoti%' OR order_number LIKE 'RK%' OR order_number LIKE '#RK%')`;
    } else if (
      k === 'SHIVAKOTI_BOOKS' ||
      k.includes('SHIVAKOTI') ||
      k.includes('SIVA_KOTI') ||
      k.includes('SIVAKOTI')
    ) {
      whereClause = `(order_type = 'SHIVAKOTI_BOOKS' OR lower(item_name) LIKE '%shivakoti%' OR lower(item_name) LIKE '%siva koti%' OR lower(item_name) LIKE '%sivakoti%' OR order_number LIKE 'SK%' OR order_number LIKE '#SK%')`;
    } else if (
      k === 'GOU_MAYA_BHASMA' ||
      k.includes('GOU_MAYA') ||
      k.includes('GOUMAYA')
    ) {
      whereClause = `(order_type = 'GOU_MAYA_BHASMA' OR lower(item_name) LIKE '%gou%maya%' OR lower(item_name) LIKE '%goumaya%' OR lower(item_name) LIKE '%pooja%bhasma%' OR order_number LIKE 'PB%' OR order_number LIKE '#PB%' OR order_number LIKE 'GM%' OR order_number LIKE '#GM%')`;
    } else if (
      k === 'HOMA_BHASMA' ||
      (k.includes('HOMA') && k.includes('BHASMA'))
    ) {
      whereClause = `((order_type = 'HOMA_BHASMA' OR (lower(item_name) LIKE '%homa%' AND lower(item_name) LIKE '%bhasma%') OR order_number LIKE 'HB%' OR order_number LIKE '#HB%') AND upper(IFNULL(order_type,'')) <> 'GOU_MAYA_BHASMA' AND lower(IFNULL(item_name,'')) NOT LIKE '%pooja%bhasma%' AND lower(IFNULL(item_name,'')) NOT LIKE '%gou%maya%')`;
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