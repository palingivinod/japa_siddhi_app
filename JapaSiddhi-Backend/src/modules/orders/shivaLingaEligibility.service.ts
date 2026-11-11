import mysql from '../../database/mysql';
import AppError from '../../utils/appError';
import orderRepository from './order.repository';

export const BAANALINGAM_LABEL = 'Baanalingam';
export const MARAKATA_SHIVLING_LABEL = 'Marakata Shivling';

const gharGharMessage = (item: string) =>
  `You have already ordered/received ${item}. The concept of Ghar Ghar Mahadev is only one Shiva Linga for each home, so you are not eligible to order this.`;

class ShivaLingaEligibilityService {
  async ensureColumn() {
    try {
      await mysql.query(
        'ALTER TABLE users ADD COLUMN allow_shiva_linga_reorder INTEGER NOT NULL DEFAULT 0',
      );
    } catch {
      // Column already exists.
    }
  }

  async isReorderAllowed(userId: number): Promise<boolean> {
    if (!userId) {
      return false;
    }
    await this.ensureColumn();
    try {
      const rows = await mysql.query<any[]>(
        `
        SELECT IFNULL(allow_shiva_linga_reorder, 0) AS allowReorder
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId],
      );
      return Number(rows?.[0]?.allowReorder || 0) === 1;
    } catch {
      return false;
    }
  }

  /** Any non-cancelled Baanalingam order (including delivered / shipped / review). */
  async hasLifetimeBaanalingam(userId: number): Promise<boolean> {
    if (!userId) {
      return false;
    }
    try {
      const rows = await mysql.query<any[]>(
        `
        SELECT id
        FROM orders
        WHERE user_id = ?
          AND COALESCE(deleted_by_user, 0) = 0
          AND UPPER(IFNULL(order_status, '')) <> 'CANCELLED'
          AND (
            order_type = 'BANA_LINGAM'
            OR lower(IFNULL(item_name, '')) LIKE '%baanalingam%'
            OR lower(IFNULL(item_name, '')) LIKE '%banalingam%'
            OR IFNULL(order_number, '') LIKE 'BL-%'
            OR IFNULL(order_number, '') LIKE '#BL-%'
          )
        ORDER BY id DESC
        LIMIT 1
        `,
        [userId],
      );
      return Boolean(rows?.length);
    } catch {
      return false;
    }
  }

  /** Any non-cancelled Marakata Shivling order / claim. */
  async hasLifetimeMarakata(userId: number): Promise<boolean> {
    if (!userId) {
      return false;
    }
    try {
      const orderRows = await mysql.query<any[]>(
        `
        SELECT id
        FROM orders
        WHERE user_id = ?
          AND COALESCE(deleted_by_user, 0) = 0
          AND UPPER(IFNULL(order_status, '')) <> 'CANCELLED'
          AND (
            lower(IFNULL(item_name, '')) LIKE '%marakata%shiv%'
            OR lower(IFNULL(item_name, '')) LIKE '%marakatha%shiv%'
            OR (
              lower(IFNULL(item_name, '')) LIKE '%aventurine%'
              AND lower(IFNULL(item_name, '')) LIKE '%shiv%'
            )
          )
        ORDER BY id DESC
        LIMIT 1
        `,
        [userId],
      );
      if (orderRows?.length) {
        return true;
      }
      const claimRows = await mysql.query<any[]>(
        `
        SELECT c.id
        FROM milestone_reward_claims c
        LEFT JOIN orders o ON o.id = c.order_id
        WHERE c.user_id = ?
          AND c.milestone_target = 900003
          AND c.order_id IS NOT NULL
          AND UPPER(IFNULL(o.order_status, '')) <> 'CANCELLED'
        LIMIT 1
        `,
        [userId],
      );
      return Boolean(claimRows?.length);
    } catch {
      return false;
    }
  }

  async assertCanOrderBaanalingam(userId: number) {
    const active = await orderRepository.findActiveOrderForKind(
      userId,
      'BANA_LINGAM',
    );
    if (active) {
      throw new AppError(
        `Already one Baanalingam order (${active.orderNumber}) is in progress. You can order another once your previous order is delivered.`,
        400,
      );
    }

    const allowReorder = await this.isReorderAllowed(userId);
    if (allowReorder) {
      return;
    }

    if (await this.hasLifetimeBaanalingam(userId)) {
      throw new AppError(gharGharMessage(BAANALINGAM_LABEL), 400);
    }
    if (await this.hasLifetimeMarakata(userId)) {
      throw new AppError(gharGharMessage(MARAKATA_SHIVLING_LABEL), 400);
    }
  }

  async assertCanOrderMarakata(userId: number) {
    const allowReorder = await this.isReorderAllowed(userId);
    if (allowReorder) {
      return {allowReorder: true};
    }

    if (await this.hasLifetimeBaanalingam(userId)) {
      throw new Error(gharGharMessage(BAANALINGAM_LABEL));
    }
    return {allowReorder: false};
  }
}

export default new ShivaLingaEligibilityService();
