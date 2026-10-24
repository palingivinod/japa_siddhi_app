import mysql from '../../database/mysql';
import authRepository from '../auth/auth.repository';
import challengeRepository from '../challenge/challenge.repository';
import orderService from '../orders/order.service';
import emailOtpService from '../../services/emailOtp.service';
import japaRepository from './japa.repository';
import {milestoneByTarget} from './japa.milestones';

export type MilestoneDelivery = {
  fullName: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
};

const rewardJapaRequirement = (name: string) => {
  const lower = String(name || '').toLowerCase();
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
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_milestone_reward (user_id, milestone_target)
        )
      `);
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
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, milestone_target)
        )
      `);
    }
    this.tableReady = true;
  }

  async claimedTargets(userId: number): Promise<number[]> {
    try {
      await this.ensureTable();
      const rows = await mysql.query<any[]>(
        `
        SELECT milestone_target AS milestoneTarget
        FROM milestone_reward_claims
        WHERE user_id = ?
        AND order_id IS NOT NULL
        `,
        [userId],
      );
      return (rows || [])
        .map(row => Number(row.milestoneTarget))
        .filter(target => target > 0);
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
    const [rewards, total, claimed] = await Promise.all([
      challengeRepository.listRewards(),
      japaRepository.getUserMilestoneJapa(userId),
      this.claimedTargets(userId),
    ]);
    return {
      target: milestone.target,
      title: milestone.title,
      total,
      reached: total >= milestone.target,
      claimed: claimed.includes(milestone.target),
      rewards: (rewards || []).map((row: any) => ({
        id: Number(row.id),
        name: String(row.name || ''),
        stock: Number(row.stock || 0),
        inStock: Number(row.stock || 0) > 0,
      })),
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
    const existing = await mysql.query<any[]>(
      `
      SELECT
        id,
        reward_name AS rewardName,
        order_id AS orderId,
        order_number AS orderNumber
      FROM milestone_reward_claims
      WHERE user_id = ?
      AND milestone_target = ?
      LIMIT 1
      `,
      [userId, milestone.target],
    );
    if (existing[0]?.orderId) {
      return {
        alreadySubmitted: true,
        target: milestone.target,
        title: milestone.title,
        rewardName: String(existing[0].rewardName || ''),
        orderId: Number(existing[0].orderId),
        orderNumber: String(existing[0].orderNumber || ''),
      };
    }

    const reward = await challengeRepository.getRewardById(rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }
    const required = rewardJapaRequirement(String(reward.name || ''));
    if (required > 0 && total < required) {
      const remaining = required - total;
      throw new Error(
        `This reward is available after ${required.toLocaleString()} Japas. You need ${remaining.toLocaleString()} more Japas.`,
      );
    }

    const fullName = String(delivery.fullName || '').trim();
    const mobile = String(delivery.mobile || '').replace(/\D/g, '').slice(-10);
    const address = String(delivery.address || '').trim();
    const city = String(delivery.city || '').trim();
    const state = String(delivery.state || '').trim();
    const pinCode = String(delivery.pinCode || '').replace(/\D/g, '').slice(0, 6);
    if (!fullName || !address || !city || !state) {
      throw new Error('Enter all delivery details');
    }
    if (!/^[0-9]{10}$/.test(mobile)) {
      throw new Error('Enter a valid 10-digit mobile number');
    }
    if (!/^[0-9]{6}$/.test(pinCode)) {
      throw new Error('Enter a valid 6-digit PIN code');
    }

    const rewardName = String(reward.name || 'Milestone reward');
    const remarks = [
      'Milestone reward',
      `Milestone: ${milestone.title} (${milestone.target})`,
      `Reward: ${rewardName}`,
      `Name: ${fullName}`,
      `Mobile: ${mobile}`,
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
          order_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        `Mobile: ${mobile}`,
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
