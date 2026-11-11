import mysql from '../../database/mysql';
import authRepository from '../auth/auth.repository';
import challengeRepository from '../challenge/challenge.repository';
import orderService from '../orders/order.service';
import emailOtpService from '../../services/emailOtp.service';
import masterService from '../master/master.service';
import japaRepository from './japa.repository';
import {isRewardEligibleTarget, milestoneByTarget} from './japa.milestones';

export type MilestoneDelivery = {
  fullName: string;
  mobile: string;
  mobileCountryCode?: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
};

/** Distinct from Marakata Sree Chakra — relative present+3000 claim. */
export const isMarakataShivlingName = (rewardName: string): boolean => {
  const lower = String(rewardName || '').toLowerCase();
  if (!lower) {
    return false;
  }
  if (lower.includes('chakra') || lower.includes('chakram') || lower.includes('yantra')) {
    return false;
  }
  const isMarakata =
    lower.includes('marakata') ||
    lower.includes('marakatha') ||
    lower.includes('మరకత') ||
    lower.includes('मरकत');
  const isShivling =
    lower.includes('shivling') ||
    lower.includes('shivalinga') ||
    lower.includes('shiva ling') ||
    lower.includes('lingam') ||
    lower.includes('శివలింగ') ||
    lower.includes('शिवलिंग');
  const isGreenAventurineShivling = lower.includes('aventurine') && isShivling;
  return (isMarakata && isShivling) || isGreenAventurineShivling;
};

export const MARAKATA_SHIVLING_EXTRA_JAPAS = 3000;
/** Sentinel claim key — not a real japa milestone count. */
export const MARAKATA_SHIVLING_CLAIM_TARGET = 900003;
export const MARAKATA_SHIVLING_REWARD_NAME =
  'Marakata Shivling (Green Aventurine)';

const rewardJapaRequirement = (name: string) => {
  const lower = String(name || '').toLowerCase();
  if (
    lower.includes('spiritual reward') ||
    lower.includes('spiritual offering') ||
    lower.includes('spiritual product')
  ) {
    return 1000000;
  }
  // Marakata Shivling uses relative present+3000 (handled in claimMarakataShivling)
  if (isMarakataShivlingName(name)) {
    return 0;
  }
  if (
    lower.includes('marakatha') ||
    lower.includes('marakata') ||
    lower.includes('green jade') ||
    lower.includes('aventurine') ||
    lower.includes('sri chakram') ||
    lower.includes('sri chakra') ||
    lower.includes('sree chakra') ||
    lower.includes('sri yantra')
  ) {
    return 500000;
  }
  if (
    (lower.includes('yellow') || lower.includes('green')) &&
    (lower.includes('agate') || lower.includes('hakik'))
  ) {
    return 200000;
  }
  if (
    lower.includes('spatik') ||
    lower.includes('sphatik') ||
    lower.includes('crystal') ||
    lower.includes('quartz')
  ) {
    return 100000;
  }
  if (
    lower.includes('karungali') ||
    lower.includes('ebony') ||
    lower.includes('black wood') ||
    lower.includes('sacred japa mala')
  ) {
    return 50000;
  }
  if (lower.includes('sandal') || lower.includes('chandan')) {
    return 30000;
  }
  if (
    lower.includes('rudraksh') ||
    lower.includes('tulasi') ||
    lower.includes('tulsi') ||
    lower.includes('pasupu') ||
    lower.includes('turmeric') ||
    lower.includes('haldi')
  ) {
    return 5000;
  }
  return 0;
};

class MilestoneRewardService {
  private tableReady = false;

  private async ensureTable() {
    if (this.tableReady) {
      return;
    }
    await mysql.query('SELECT 1');
    const engine = mysql.getEngineName();
    if (engine === 'mysql') {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS milestone_reward_claims (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          milestone_target INT NOT NULL,
          reward_id INT NOT NULL,
          reward_name VARCHAR(255) NOT NULL,
          full_name TEXT NULL,
          mobile VARCHAR(32) NULL,
          address TEXT NULL,
          city VARCHAR(120) NULL,
          state VARCHAR(120) NULL,
          pin_code VARCHAR(16) NULL,
          order_id INT NULL,
          order_number VARCHAR(64) NULL,
          retry_count INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_milestone_reward (user_id, milestone_target)
        )
      `);
      try {
        const cols = await mysql.query<any[]>(
          "SHOW COLUMNS FROM milestone_reward_claims LIKE 'retry_count'",
        );
        if (!cols?.length) {
          await mysql.query(
            'ALTER TABLE milestone_reward_claims ADD COLUMN retry_count INT NOT NULL DEFAULT 0',
          );
        }
      } catch {
        // Ignored if column exists
      }
    } else {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS milestone_reward_claims (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          milestone_target INTEGER NOT NULL,
          reward_id INTEGER NOT NULL,
          reward_name TEXT NOT NULL,
          full_name TEXT,
          mobile TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          pin_code TEXT,
          order_id INTEGER,
          order_number TEXT,
          retry_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, milestone_target)
        )
      `);
      try {
        const tableInfo = await mysql.query<any[]>(
          'PRAGMA table_info(milestone_reward_claims)',
        ).catch(() => []);
        const hasCol = (tableInfo || []).some((col: any) => col.name === 'retry_count');
        if (!hasCol) {
          await mysql.query(
            'ALTER TABLE milestone_reward_claims ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0',
          ).catch(() => undefined);
        }
      } catch {
        // Ignored
      }
    }
    this.tableReady = true;
  }

  async claimedTargets(userId: number): Promise<number[]> {
    try {
      await this.ensureTable();
      const rows = await mysql.query<any[]>(
        `
        SELECT
          c.milestone_target AS milestoneTarget,
          COALESCE(c.retry_count, 0) AS retryCount,
          o.order_status AS orderStatus
        FROM milestone_reward_claims c
        LEFT JOIN orders o ON o.id = c.order_id
        WHERE c.user_id = ?
        AND c.order_id IS NOT NULL
        `,
        [userId],
      );
      return (rows || [])
        .filter(row => {
          const target = Number(row.milestoneTarget);
          if (!target || target <= 0) {
            return false;
          }
          const status = String(row.orderStatus || '').toUpperCase();
          const retryCount = Number(row.retryCount || 0);

          // If the order was cancelled AND user has not used their 1 retry yet (retryCount == 0),
          // allow them to grab the reward again! (do not mark as claimed)
          if (status === 'CANCELLED' && retryCount === 0) {
            return false;
          }

          // Otherwise (order active, delivered, or retry already used and cancelled), it is claimed.
          return true;
        })
        .map(row => Number(row.milestoneTarget));
    } catch {
      return [];
    }
  }

  async listRewards(userId: number, target: number) {
    await this.ensureTable();
    const milestone = milestoneByTarget(target);
    if (!milestone) {
      throw new Error('Milestone not found');
    }
    if (!isRewardEligibleTarget(milestone.target)) {
      throw new Error('Milestone ' + milestone.target.toLocaleString('en-IN') + ' does not include a physical reward.');
    }
    const [rewards, total, claimed, claimRows] = await Promise.all([
      challengeRepository.listRewards(),
      japaRepository.getUserMilestoneJapa(userId),
      this.claimedTargets(userId),
      mysql.query<any[]>(
        `
        SELECT
          COALESCE(c.retry_count, 0) AS retryCount,
          o.order_status AS orderStatus
        FROM milestone_reward_claims c
        LEFT JOIN orders o ON o.id = c.order_id
        WHERE c.user_id = ? AND c.milestone_target = ?
        LIMIT 1
        `,
        [userId, target],
      ),
    ]);
    const isRetry = Boolean(
      claimRows?.length &&
      String(claimRows[0].orderStatus || '').toUpperCase() === 'CANCELLED' &&
      Number(claimRows[0].retryCount || 0) === 0
    );
    return {
      target: milestone.target,
      title: milestone.title,
      total,
      reached: total >= milestone.target,
      claimed: claimed.includes(milestone.target),
      isRetry,
      rewards: (rewards || [])
        .filter((row: any) => !isMarakataShivlingName(String(row.name || '')))
        .map((row: any) => ({
          id: Number(row.id),
          name: String(row.name || ''),
          stock: Number(row.stock || 0),
          inStock: Number(row.stock || 0) > 0,
        })),
    };
  }

  private async ensureRelativeBaselineTable() {
    await mysql.query('SELECT 1');
    const engine = mysql.getEngineName();
    if (engine === 'mysql') {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS relative_reward_baselines (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          reward_key VARCHAR(64) NOT NULL,
          baseline INT NOT NULL,
          unlock_target INT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_relative_reward (user_id, reward_key)
        )
      `);
    } else {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS relative_reward_baselines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          reward_key TEXT NOT NULL,
          baseline INTEGER NOT NULL,
          unlock_target INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, reward_key)
        )
      `);
    }
  }

  private async ensureMarakataRewardRow(): Promise<{
    id: number;
    name: string;
    stock: number;
  }> {
    // Prefer raw rows so we never re-insert over an admin OOS / existing Marakata.
    try {
      await mysql.query(
        'ALTER TABLE challenge_rewards ADD COLUMN admin_marked_oos INTEGER NOT NULL DEFAULT 0',
      );
    } catch {
      // Column already exists.
    }
    const rawRows = await mysql.query<any[]>(
      `
      SELECT
        id,
        name,
        CASE
          WHEN IFNULL(admin_marked_oos, 0) = 1 THEN 0
          ELSE stock
        END AS stock
      FROM challenge_rewards
      `,
    );
    const found = (rawRows || []).find((row: any) =>
      isMarakataShivlingName(String(row.name || '')),
    );
    if (found) {
      return {
        id: Number(found.id),
        name: String(found.name),
        stock: Number(found.stock || 0),
      };
    }
    // First-time only — never recreate after admin marks OOS.
    await mysql.query(
      `INSERT INTO challenge_rewards (name, stock, is_active, display_order, admin_marked_oos) VALUES (?, ?, 1, ?, 0)`,
      [MARAKATA_SHIVLING_REWARD_NAME, 50, 9],
    );
    const again = await mysql.query<any[]>(
      `
      SELECT
        id,
        name,
        CASE
          WHEN IFNULL(admin_marked_oos, 0) = 1 THEN 0
          ELSE stock
        END AS stock
      FROM challenge_rewards
      `,
    );
    const created = (again || []).find((row: any) =>
      isMarakataShivlingName(String(row.name || '')),
    );
    if (!created) {
      throw new Error('Could not create Marakata Shivling reward');
    }
    return {
      id: Number(created.id),
      name: String(created.name),
      stock: Number(created.stock || 0),
    };
  }

  async getMarakataShivlingStatus(userId: number) {
    await this.ensureTable();
    await this.ensureRelativeBaselineTable();
    const reward = await this.ensureMarakataRewardRow();
    const total = await japaRepository.getUserMilestoneJapa(userId);
    const existingBaseline = await mysql.query<any[]>(
      `
      SELECT baseline, unlock_target AS unlockTarget
      FROM relative_reward_baselines
      WHERE user_id = ? AND reward_key = 'marakata_shivling'
      LIMIT 1
      `,
      [userId],
    );
    let baseline = Number(existingBaseline?.[0]?.baseline);
    let unlockTarget = Number(existingBaseline?.[0]?.unlockTarget);
    if (!(baseline >= 0) || !(unlockTarget > 0)) {
      baseline = Math.max(0, Number(total) || 0);
      unlockTarget = baseline + MARAKATA_SHIVLING_EXTRA_JAPAS;
      try {
        await mysql.query(
          `
          INSERT INTO relative_reward_baselines (user_id, reward_key, baseline, unlock_target)
          VALUES (?, 'marakata_shivling', ?, ?)
          `,
          [userId, baseline, unlockTarget],
        );
      } catch {
        const again = await mysql.query<any[]>(
          `
          SELECT baseline, unlock_target AS unlockTarget
          FROM relative_reward_baselines
          WHERE user_id = ? AND reward_key = 'marakata_shivling'
          LIMIT 1
          `,
          [userId],
        );
        baseline = Number(again?.[0]?.baseline ?? baseline);
        unlockTarget = Number(again?.[0]?.unlockTarget ?? unlockTarget);
      }
    }

    const claimedRows = await mysql.query<any[]>(
      `
      SELECT
        c.id,
        c.order_id AS orderId,
        c.order_number AS orderNumber,
        COALESCE(c.retry_count, 0) AS retryCount,
        o.order_status AS orderStatus
      FROM milestone_reward_claims c
      LEFT JOIN orders o ON o.id = c.order_id
      WHERE c.user_id = ? AND c.milestone_target = ?
      LIMIT 1
      `,
      [userId, MARAKATA_SHIVLING_CLAIM_TARGET],
    );
    const claim = claimedRows?.[0];
    // Same as other rewards: 1 grab; if order cancelled (user or admin) and retry unused → 1 more chance.
    let claimed = false;
    let isRetryAvailable = false;
    if (claim?.orderId) {
      const status = String(claim.orderStatus || '').toUpperCase();
      const retryCount = Number(claim.retryCount || 0);
      if (status === 'CANCELLED' && retryCount === 0) {
        claimed = false;
        isRetryAvailable = true;
      } else {
        claimed = true;
      }
    }
    const stock = Number(reward.stock || 0);

    return {
      rewardId: reward.id,
      rewardName: reward.name,
      total,
      baseline,
      unlockTarget,
      target: unlockTarget,
      extraJapas: MARAKATA_SHIVLING_EXTRA_JAPAS,
      eligible: total >= unlockTarget,
      remaining: Math.max(0, unlockTarget - total),
      claimed,
      isRetry: isRetryAvailable,
      stock,
      inStock: stock > 0,
      orderId: claim?.orderId ? Number(claim.orderId) : null,
      orderNumber: claim?.orderNumber ? String(claim.orderNumber) : null,
    };
  }

  async claimMarakataShivling(userId: number, rewardId: number, delivery: MilestoneDelivery) {
    await this.ensureTable();
    await this.ensureRelativeBaselineTable();
    const {
      default: shivaLingaEligibilityService,
    } = await import('../orders/shivaLingaEligibility.service');
    const {allowReorder} =
      await shivaLingaEligibilityService.assertCanOrderMarakata(userId);

    const status = await this.getMarakataShivlingStatus(userId);
    if (status.claimed && !allowReorder) {
      return {
        alreadySubmitted: true,
        target: MARAKATA_SHIVLING_CLAIM_TARGET,
        title: 'Marakata Shivling',
        rewardName: status.rewardName,
        orderId: status.orderId,
        orderNumber: status.orderNumber,
      };
    }

    const reward = await challengeRepository.getRewardById(rewardId);
    if (!reward || !isMarakataShivlingName(String(reward.name || ''))) {
      throw new Error('Select Marakata Shivling reward');
    }
    if (Number(rewardId) !== Number(status.rewardId)) {
      throw new Error('Invalid Marakata Shivling reward');
    }
    if (Number(reward.stock || 0) <= 0) {
      throw new Error('This reward item is currently out of stock.');
    }

    const total = Number(status.total) || 0;
    const unlockTarget = Number(status.unlockTarget) || 0;
    if (total < unlockTarget) {
      const remaining = unlockTarget - total;
      throw new Error(
        `This reward unlocks at ${unlockTarget.toLocaleString()} Japas (present + ${MARAKATA_SHIVLING_EXTRA_JAPAS}). You need ${remaining.toLocaleString()} more Japas.`,
      );
    }

    // Same cancel-retry rules as other milestone rewards (user or admin cancel).
    // Admin "allow shiva linga reorder" grants another chance after the usual 2.
    return this.claimRelativeWithTarget(
      userId,
      MARAKATA_SHIVLING_CLAIM_TARGET,
      'Marakata Shivling (present + 3000)',
      rewardId,
      String(reward.name || MARAKATA_SHIVLING_REWARD_NAME),
      delivery,
      {adminReorderAllowed: allowReorder},
    );
  }

  private async claimRelativeWithTarget(
    userId: number,
    claimTarget: number,
    title: string,
    rewardId: number,
    rewardName: string,
    delivery: MilestoneDelivery,
    options?: {adminReorderAllowed?: boolean},
  ) {
    const existing = await mysql.query<any[]>(
      `
      SELECT
        c.id,
        c.reward_name AS rewardName,
        c.order_id AS orderId,
        c.order_number AS orderNumber,
        COALESCE(c.retry_count, 0) AS retryCount,
        o.order_status AS orderStatus
      FROM milestone_reward_claims c
      LEFT JOIN orders o ON o.id = c.order_id
      WHERE c.user_id = ?
      AND c.milestone_target = ?
      LIMIT 1
      `,
      [userId, claimTarget],
    );

    const existingClaim = existing?.[0];
    let isRetry = false;
    const adminReorder = Boolean(options?.adminReorderAllowed);

    if (existingClaim?.orderId) {
      const orderStatus = String(existingClaim.orderStatus || '').toUpperCase();
      const retryCount = Number(existingClaim.retryCount || 0);
      // Active (not cancelled / not delivered) → always blocked.
      if (
        orderStatus !== 'CANCELLED' &&
        orderStatus !== 'DELIVERED' &&
        orderStatus !== ''
      ) {
        return {
          alreadySubmitted: true,
          target: claimTarget,
          title,
          rewardName: String(existingClaim.rewardName || ''),
          orderId: Number(existingClaim.orderId),
          orderNumber: String(existingClaim.orderNumber || ''),
        };
      }
      // Delivered → blocked unless admin toggle allows another order.
      if (orderStatus === 'DELIVERED' && !adminReorder) {
        return {
          alreadySubmitted: true,
          target: claimTarget,
          title,
          rewardName: String(existingClaim.rewardName || ''),
          orderId: Number(existingClaim.orderId),
          orderNumber: String(existingClaim.orderNumber || ''),
        };
      }
      // Cancelled: default 1 retry (2 chances). Admin toggle unlocks further retries.
      if (orderStatus === 'CANCELLED' && retryCount >= 1 && !adminReorder) {
        return {
          alreadySubmitted: true,
          target: claimTarget,
          title,
          rewardName: String(existingClaim.rewardName || ''),
          orderId: Number(existingClaim.orderId),
          orderNumber: String(existingClaim.orderNumber || ''),
        };
      }
      if (orderStatus === 'DELIVERED' && adminReorder) {
        isRetry = true;
      } else if (orderStatus === 'CANCELLED') {
        isRetry = true;
      } else if (adminReorder) {
        isRetry = true;
      }
    }

    const stockRows = await mysql.query<any[]>(
      `SELECT stock FROM challenge_rewards WHERE id = ? LIMIT 1`,
      [rewardId],
    );
    if (Number(stockRows?.[0]?.stock || 0) <= 0) {
      throw new Error('This reward item is currently out of stock.');
    }

    const fullName = String(delivery.fullName || '').trim();
    const mobileCountryCode =
      String(delivery.mobileCountryCode || '91').replace(/\D/g, '') || '91';
    const mobileDigits = String(delivery.mobile || '').replace(/\D/g, '');
    const mobile =
      mobileCountryCode === '91'
        ? mobileDigits.slice(-10)
        : mobileDigits.slice(0, 15);
    const address = String(delivery.address || '').trim();
    const pinCode = String(delivery.pinCode || '').replace(/\D/g, '').slice(0, 6);
    if (!fullName || !address) {
      throw new Error('Enter all delivery details');
    }
    if (
      (mobileCountryCode === '91' && !/^[0-9]{10}$/.test(mobile)) ||
      (mobileCountryCode !== '91' &&
        (mobile.length < 6 || mobile.length > 15))
    ) {
      throw new Error(
        mobileCountryCode === '91'
          ? 'Enter a valid 10-digit mobile number'
          : 'Enter a valid mobile number',
      );
    }
    if (!/^[0-9]{6}$/.test(pinCode)) {
      throw new Error('PIN code is mandatory (6 digits)');
    }
    let city = '';
    let state = '';
    try {
      const lookedUp = await masterService.lookupPincode(pinCode);
      city = String(lookedUp.cityName || '').trim();
      state = String(lookedUp.stateName || '').trim();
    } catch {
      throw new Error('Could not find that PIN code. Enter a valid 6-digit PIN.');
    }
    if (!city || !state) {
      throw new Error('Could not find that PIN code. Enter a valid 6-digit PIN.');
    }

    const remarks = [
      'Relative reward',
      `Reward track: ${title}`,
      `Reward: ${rewardName}`,
      `Name: ${fullName}`,
      `Mobile: +${mobileCountryCode}${mobile}`,
      `Address: ${address}`,
      `City: ${city}`,
      `State: ${state}`,
      `PIN: ${pinCode}`,
    ].join('\n');

    const created = await orderService.create({
      userId,
      orderType: 'SPIRITUAL_PRODUCT',
      orderSource: 'MILESTONE',
      itemName: rewardName,
      quantity: 1,
      paymentId: null,
      orderStatus: 'UNDER_REVIEW',
      remarks,
    });
    const orderNumber = `RW${String(10000 + Number(created.id)).padStart(5, '0')}`;

    if (existingClaim?.id) {
      await mysql.query(
        `
        UPDATE milestone_reward_claims
        SET
          reward_id = ?,
          reward_name = ?,
          full_name = ?,
          mobile = ?,
          address = ?,
          city = ?,
          state = ?,
          pin_code = ?,
          order_id = ?,
          order_number = ?,
          retry_count = ${isRetry ? 'COALESCE(retry_count, 0) + 1' : '0'},
          created_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          rewardId,
          rewardName,
          fullName,
          mobile,
          address,
          city,
          state,
          pinCode,
          created.id,
          orderNumber,
          existingClaim.id,
        ],
      );
    } else {
      try {
        await mysql.query(
          `
          INSERT INTO milestone_reward_claims (
            user_id,
            milestone_target,
            reward_id,
            reward_name,
            full_name,
            mobile,
            address,
            city,
            state,
            pin_code,
            order_id,
            order_number,
            retry_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          `,
          [
            userId,
            claimTarget,
            rewardId,
            rewardName,
            fullName,
            mobile,
            address,
            city,
            state,
            pinCode,
            created.id,
            orderNumber,
          ],
        );
      } catch (error) {
        await mysql.query('DELETE FROM orders WHERE id = ?', [created.id]);
        const again = await mysql.query<any[]>(
          `
          SELECT order_id AS orderId, order_number AS orderNumber, reward_name AS rewardName
          FROM milestone_reward_claims
          WHERE user_id = ? AND milestone_target = ?
          LIMIT 1
          `,
          [userId, claimTarget],
        );
        if (again[0]?.orderId) {
          return {
            alreadySubmitted: true,
            target: claimTarget,
            title,
            rewardName: String(again[0].rewardName || rewardName),
            orderId: Number(again[0].orderId),
            orderNumber: String(again[0].orderNumber || ''),
          };
        }
        throw error;
      }
    }

    await mysql.query(
      `
      UPDATE orders
      SET order_number = ?, payment_status = 'SUCCESS'
      WHERE id = ?
      `,
      [orderNumber, created.id],
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

    let devotee = {name: fullName, email: '-', mobile};
    try {
      const user = await authRepository.findUserById(userId);
      if (user) {
        devotee = {
          name: user.fullName || fullName,
          email: user.email || '-',
          mobile:
            `${user.mobileCountryCode || ''}${user.mobileNumber || mobile}`.trim() ||
            mobile,
        };
      }
    } catch {
      // Delivery details are already on the order.
    }

    await emailOtpService.notifyAdmin(
      `Marakata Shivling reward order - ${orderNumber}`,
      [
        'A devotee submitted a Marakata Shivling reward order.',
        `Reward: ${rewardName}`,
        `Order: ${orderNumber}`,
        `Name: ${devotee.name}`,
        `Email: ${devotee.email}`,
        `Mobile: +${mobileCountryCode}${mobile}`,
        `Address: ${address}`,
        `City: ${city}`,
        `State: ${state}`,
        `PIN: ${pinCode}`,
        `User ID: ${userId}`,
      ].join('\n'),
    );

    return {
      alreadySubmitted: false,
      target: claimTarget,
      title,
      rewardName,
      orderId: Number(created.id),
      orderNumber,
    };
  }

  async claim(userId: number, target: number, rewardId: number, delivery: MilestoneDelivery) {
    await this.ensureTable();
    const milestone = milestoneByTarget(target);
    if (!milestone) {
      throw new Error('Milestone not found');
    }
    const total = await japaRepository.getUserMilestoneJapa(userId);
    if (total < milestone.target) {
      throw new Error('Reach this milestone before grabbing a reward');
    }
    if (!isRewardEligibleTarget(milestone.target)) {
      throw new Error(
        'Rewards are only available at 5,000, 50,000, and 1,00,000+ Japa milestones. Milestone ' + milestone.target.toLocaleString('en-IN') + ' is a spiritual title only.',
      );
    }
    if (milestone.target < 5000) {
      const remaining = Math.max(0, 5000 - total);
      throw new Error(
        `Rewards are available after 5,000 Japas. You need ${remaining.toLocaleString()} more Japas.`,
      );
    }
    const existing = await mysql.query<any[]>(
      `
      SELECT
        c.id,
        c.reward_name AS rewardName,
        c.order_id AS orderId,
        c.order_number AS orderNumber,
        COALESCE(c.retry_count, 0) AS retryCount,
        o.order_status AS orderStatus
      FROM milestone_reward_claims c
      LEFT JOIN orders o ON o.id = c.order_id
      WHERE c.user_id = ?
      AND c.milestone_target = ?
      LIMIT 1
      `,
      [userId, milestone.target],
    );

    const existingClaim = existing?.[0];
    let isRetry = false;

    if (existingClaim?.orderId) {
      const orderStatus = String(existingClaim.orderStatus || '').toUpperCase();
      const retryCount = Number(existingClaim.retryCount || 0);

      // If active / delivered / not cancelled, cannot grab again
      if (orderStatus !== 'CANCELLED') {
        return {
          alreadySubmitted: true,
          target: milestone.target,
          title: milestone.title,
          rewardName: String(existingClaim.rewardName || ''),
          orderId: Number(existingClaim.orderId),
          orderNumber: String(existingClaim.orderNumber || ''),
        };
      }

      // Order was CANCELLED. If retryCount >= 1, user already used their 1 retry chance!
      if (retryCount >= 1) {
        return {
          alreadySubmitted: true,
          target: milestone.target,
          title: milestone.title,
          rewardName: String(existingClaim.rewardName || ''),
          orderId: Number(existingClaim.orderId),
          orderNumber: String(existingClaim.orderNumber || ''),
        };
      }

      // retryCount == 0 and order is CANCELLED: user is granted their one-time retry!
      isRetry = true;
    }

    const reward = await challengeRepository.getRewardById(rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }
    if (isMarakataShivlingName(String(reward.name || ''))) {
      throw new Error(
        'Marakata Shivling is claimed from Available Rewards after present japas + 3000.',
      );
    }
    if (Number(reward.stock || 0) <= 0) {
      throw new Error('This reward item is currently out of stock.');
    }
    const required = rewardJapaRequirement(String(reward.name || ''));
    if (required > 0 && total < required) {
      const remaining = required - total;
      throw new Error(
        `This reward is available after ${required.toLocaleString()} Japas. You need ${remaining.toLocaleString()} more Japas.`,
      );
    }

    const fullName = String(delivery.fullName || '').trim();
    const mobileCountryCode =
      String(delivery.mobileCountryCode || '91').replace(/\D/g, '') || '91';
    const mobileDigits = String(delivery.mobile || '').replace(/\D/g, '');
    const mobile =
      mobileCountryCode === '91'
        ? mobileDigits.slice(-10)
        : mobileDigits.slice(0, 15);
    const address = String(delivery.address || '').trim();
    const pinCode = String(delivery.pinCode || '').replace(/\D/g, '').slice(0, 6);
    if (!fullName || !address) {
      throw new Error('Enter all delivery details');
    }
    if (
      (mobileCountryCode === '91' && !/^[0-9]{10}$/.test(mobile)) ||
      (mobileCountryCode !== '91' &&
        (mobile.length < 6 || mobile.length > 15))
    ) {
      throw new Error(
        mobileCountryCode === '91'
          ? 'Enter a valid 10-digit mobile number'
          : 'Enter a valid mobile number',
      );
    }
    if (!/^[0-9]{6}$/.test(pinCode)) {
      throw new Error('PIN code is mandatory (6 digits)');
    }
    let city = '';
    let state = '';
    try {
      const lookedUp = await masterService.lookupPincode(pinCode);
      city = String(lookedUp.cityName || '').trim();
      state = String(lookedUp.stateName || '').trim();
    } catch {
      throw new Error('Could not find that PIN code. Enter a valid 6-digit PIN.');
    }
    if (!city || !state) {
      throw new Error('Could not find that PIN code. Enter a valid 6-digit PIN.');
    }

    const rewardName = String(reward.name || 'Milestone reward');
    const remarks = [
      'Milestone reward',
      `Milestone: ${milestone.title} (${milestone.target})`,
      `Reward: ${rewardName}`,
      `Name: ${fullName}`,
      `Mobile: +${mobileCountryCode}${mobile}`,
      `Address: ${address}`,
      `City: ${city}`,
      `State: ${state}`,
      `PIN: ${pinCode}`,
    ].join('\n');

    const created = await orderService.create({
      userId,
      orderType: 'SPIRITUAL_PRODUCT',
      orderSource: 'MILESTONE',
      itemName: rewardName,
      quantity: 1,
      paymentId: null,
      orderStatus: 'UNDER_REVIEW',
      remarks,
    });
    const orderNumber = `RW${String(10000 + Number(created.id)).padStart(5, '0')}`;

    if (existingClaim?.id) {
      await mysql.query(
        `
        UPDATE milestone_reward_claims
        SET
          reward_id = ?,
          reward_name = ?,
          full_name = ?,
          mobile = ?,
          address = ?,
          city = ?,
          state = ?,
          pin_code = ?,
          order_id = ?,
          order_number = ?,
          retry_count = ${isRetry ? 'COALESCE(retry_count, 0) + 1' : '0'},
          created_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          rewardId,
          rewardName,
          fullName,
          mobile,
          address,
          city,
          state,
          pinCode,
          created.id,
          orderNumber,
          existingClaim.id,
        ],
      );
    } else {
      try {
        await mysql.query(
          `
          INSERT INTO milestone_reward_claims (
            user_id,
            milestone_target,
            reward_id,
            reward_name,
            full_name,
            mobile,
            address,
            city,
            state,
            pin_code,
            order_id,
            order_number,
            retry_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          `,
          [
            userId,
            milestone.target,
            rewardId,
            rewardName,
            fullName,
            mobile,
            address,
            city,
            state,
            pinCode,
            created.id,
            orderNumber,
          ],
        );
      } catch (error) {
        await mysql.query('DELETE FROM orders WHERE id = ?', [created.id]);
        const again = await mysql.query<any[]>(
          `
          SELECT order_id AS orderId, order_number AS orderNumber, reward_name AS rewardName
          FROM milestone_reward_claims
          WHERE user_id = ? AND milestone_target = ?
          LIMIT 1
          `,
          [userId, milestone.target],
        );
        if (again[0]?.orderId) {
          return {
            alreadySubmitted: true,
            target: milestone.target,
            title: milestone.title,
            rewardName: String(again[0].rewardName || rewardName),
            orderId: Number(again[0].orderId),
            orderNumber: String(again[0].orderNumber || ''),
          };
        }
        throw error;
      }
    }

    await mysql.query(
      `
      UPDATE orders
      SET order_number = ?, payment_status = 'SUCCESS'
      WHERE id = ?
      `,
      [orderNumber, created.id],
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

    let devotee = {name: fullName, email: '-', mobile};
    try {
      const user = await authRepository.findUserById(userId);
      if (user) {
        devotee = {
          name: user.fullName || fullName,
          email: user.email || '-',
          mobile: `${user.mobileCountryCode || ''}${user.mobileNumber || mobile}`.trim() || mobile,
        };
      }
    } catch {
      // Delivery details are already on the order.
    }

    await emailOtpService.notifyAdmin(
      `Milestone reward order - ${orderNumber}`,
      [
        'A devotee submitted a milestone reward order.',
        `Milestone: ${milestone.title} (${milestone.target})`,
        `Reward: ${rewardName}`,
        `Order: ${orderNumber}`,
        `Name: ${devotee.name}`,
        `Email: ${devotee.email}`,
        `Mobile: +${mobileCountryCode}${mobile}`,
        `Address: ${address}`,
        `City: ${city}`,
        `State: ${state}`,
        `PIN: ${pinCode}`,
        `User ID: ${userId}`,
      ].join('\n'),
    );

    return {
      alreadySubmitted: false,
      target: milestone.target,
      title: milestone.title,
      rewardName,
      orderId: Number(created.id),
      orderNumber,
    };
  }
}

export default new MilestoneRewardService();
