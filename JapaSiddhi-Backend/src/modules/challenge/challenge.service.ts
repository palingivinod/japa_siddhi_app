import {
  CreateChallengeRequest,
} from './challenge.types';

import challengeRepository from './challenge.repository';
import orderService from '../orders/order.service';
import mysql from '../../database/mysql';

class ChallengeService {

  async create(
    data: CreateChallengeRequest,
  ) {

    const id =
      await challengeRepository.create(
        data,
      );

    return {

      id,

    };

  }

  async getById(
    id: number,
    userId?: number,
  ) {
    await this.ensureRewardClaimDeliveryColumns();

    const challenge =
      await challengeRepository.getById(
        id,
      );

    if (!challenge) {

      throw new Error(
        'Challenge not found',
      );

    }

    const participant = userId
      ? await challengeRepository.getParticipant(id, userId)
      : null;
    const claim = userId
      ? await challengeRepository.getRewardClaim(id, userId)
      : null;
    const currentValue = Number(participant?.current_value ?? participant?.currentValue ?? 0);
    const target = Number(challenge.targetValue || 1);
    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);
    const durationDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86400000),
    );
    const rewardName = String(challenge.rewardName || '');
    const mantra =
      rewardName.replace(/\s*Certificate$/i, '').trim() ||
      'Community mantra';
    const completed =
      Number(participant?.is_completed ?? participant?.isCompleted ?? 0) === 1 ||
      (target > 0 && currentValue >= target);
    const rewardClaimed = Boolean(claim) ||
      Number(participant?.reward_given ?? participant?.rewardGiven ?? 0) === 1;
    const rewardDeliverySubmitted = Boolean(claim?.orderId);

    return {
      ...challenge,
      mantra: mantra.toLowerCase() === 'certificate' ? 'Community mantra' : mantra,
      durationDays: durationDays > 400 ? 30 : durationDays,
      typeLabel: challenge.challengeType === 'SPECIAL' ? 'Festival' : 'Community',
      dailyMinimum: Math.ceil(target / 30),
      joined: Boolean(participant),
      currentValue,
      progressPercent: Math.min(100, Math.round((currentValue / Math.max(target, 1)) * 100)),
      completed,
      rewardClaimed,
      rewardDeliverySubmitted,
      claimedRewardName: claim?.rewardName || null,
      rewardOrderId: claim?.orderId || null,
      rewardOrderNumber: claim?.orderNumber || null,
      rules: [
        `Daily minimum: ${Math.ceil(target / 30)} Japas`,
        'Keep your streak active',
        'Leaderboard updates daily',
      ],
    };

  }

  async getActiveChallenges() {

    return challengeRepository.getActiveChallenges();

  }

  async join(
    challengeId: number,
    userId: number,
  ) {

    const challenge =
      await challengeRepository.getById(
        challengeId,
      );

    if (!challenge) {

      throw new Error(
        'Challenge not found',
      );

    }

    const participant =
      await challengeRepository.getParticipant(
        challengeId,
        userId,
      );

    if (participant) {

      throw new Error(
        'You have already joined this challenge',
      );

    }

    const id =
      await challengeRepository.join(
        challengeId,
        userId,
      );

    return {

      id,

    };

  }

  async updateProgress(
    challengeId: number,
    userId: number,
    currentValue: number,
  ) {

    const challenge =
      await challengeRepository.getById(
        challengeId,
      );

    if (!challenge) {

      throw new Error(
        'Challenge not found',
      );

    }

    const participant =
      await challengeRepository.getParticipant(
        challengeId,
        userId,
      );

    if (!participant) {

      throw new Error(
        'Challenge participant not found',
      );

    }

    const completed =
      currentValue >= challenge.targetValue;

    await challengeRepository.updateProgress(
      challengeId,
      userId,
      currentValue,
      completed,
    );

    return {

      success: true,

      completed,

    };

  }

  async leaderboard(
    challengeId: number,
    userId?: number,
  ) {
    const rows = await challengeRepository.leaderboard(challengeId);
    return (rows || []).map((row: any, index: number) => ({
      ...row,
      rank: index + 1,
      isYou: userId ? Number(row.userId) === Number(userId) : false,
      displayName:
        userId && Number(row.userId) === Number(userId)
          ? 'You'
          : row.fullName || 'Devotee',
    }));
  }

  async getProgress(challengeId: number, userId: number) {
    const [challenge, board, sessionStats] = await Promise.all([
      this.getById(challengeId, userId),
      this.leaderboard(challengeId, userId),
      challengeRepository.getUserChallengeSessionStats(challengeId, userId),
    ]);
    const you = board.find((item: any) => item.isYou);
    const current = Number(challenge.currentValue || 0);
    const target = Number(challenge.targetValue || 0);
    return {
      ...challenge,
      rank: you?.rank || board.length + 1,
      streakDays: challenge.joined ? 1 : 0,
      todayCount: sessionStats.todayCount,
      weekCount: sessionStats.weekCount,
      remaining: Math.max(0, target - current),
      dailyActivity: sessionStats.dailyActivity,
    };
  }

  async rate(
    challengeId: number,
    userId: number,
    rating: number,
    feedback?: string,
  ) {
    const challenge = await challengeRepository.getById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    const id = await challengeRepository.saveRating(
      challengeId,
      userId,
      Math.min(5, Math.max(1, Number(rating) || 5)),
      feedback,
    );
    return {id, rating, feedback: feedback || ''};
  }


  async listRewards(challengeId: number, userId: number) {
    await this.ensureRewardClaimDeliveryColumns();
    const challenge = await challengeRepository.getById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    const [rewards, claim] = await Promise.all([
      challengeRepository.listRewards(),
      challengeRepository.getRewardClaim(challengeId, userId),
    ]);
    return {
      challengeId,
      claimed: Boolean(claim),
      deliverySubmitted: Boolean(claim?.orderId),
      claimedReward: claim
        ? {
            id: claim.rewardId,
            name: claim.rewardName,
            orderId: claim.orderId || null,
            orderNumber: claim.orderNumber || null,
          }
        : null,
      rewards: (rewards || []).map((row: any) => ({
        id: Number(row.id),
        name: String(row.name || ''),
        stock: Number(row.stock || 0),
        inStock: Number(row.stock || 0) > 0,
      })),
    };
  }

  async claimReward(challengeId: number, userId: number, rewardId: number) {
    await this.ensureRewardClaimDeliveryColumns();
    const challenge = await challengeRepository.getById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    const participant = await challengeRepository.getParticipant(
      challengeId,
      userId,
    );
    if (!participant) {
      throw new Error(
        'Join and complete the challenge before choosing a reward',
      );
    }
    const current = Number(
      participant.current_value ?? participant.currentValue ?? 0,
    );
    const target = Number(challenge.targetValue || 0);
    const completed =
      Number(participant.is_completed ?? participant.isCompleted ?? 0) === 1 ||
      (target > 0 && current >= target);
    if (!completed) {
      throw new Error('Complete the challenge before choosing a reward');
    }
    const existing = await challengeRepository.getRewardClaim(
      challengeId,
      userId,
    );
    if (existing) {
      throw new Error('Reward already selected for this challenge');
    }
    const reward = await challengeRepository.getRewardById(rewardId);
    if (!reward || Number(reward.isActive ?? reward.is_active ?? 1) !== 1) {
      throw new Error('Reward not found');
    }
    if (Number(reward.stock || 0) < 1) {
      throw new Error('Selected reward is out of stock');
    }
    await challengeRepository.claimReward(
      challengeId,
      userId,
      rewardId,
      String(reward.name || ''),
    );
    const claim = await challengeRepository.getRewardClaim(challengeId, userId);
    return {
      challengeId,
      rewardId,
      rewardName: String(reward.name || ''),
      claimId: claim?.id || null,
      deliverySubmitted: false,
    };
  }

  private async ensureRewardClaimDeliveryColumns() {
    const alters = [
      'ALTER TABLE challenge_reward_claims ADD COLUMN full_name TEXT NULL',
      'ALTER TABLE challenge_reward_claims ADD COLUMN mobile TEXT NULL',
      'ALTER TABLE challenge_reward_claims ADD COLUMN address TEXT NULL',
      'ALTER TABLE challenge_reward_claims ADD COLUMN city TEXT NULL',
      'ALTER TABLE challenge_reward_claims ADD COLUMN state TEXT NULL',
      'ALTER TABLE challenge_reward_claims ADD COLUMN pin_code TEXT NULL',
      'ALTER TABLE challenge_reward_claims ADD COLUMN order_id INT NULL',
      'ALTER TABLE challenge_reward_claims ADD COLUMN order_number VARCHAR(64) NULL',
    ];
    for (const sql of alters) {
      try {
        await mysql.query(sql);
      } catch {
        // Column already exists (MySQL/SQLite).
      }
    }
  }

  async submitRewardDelivery(
    challengeId: number,
    userId: number,
    delivery: {
      fullName: string;
      mobile: string;
      address: string;
      city: string;
      state: string;
      pinCode: string;
    },
  ) {
    await this.ensureRewardClaimDeliveryColumns();
    const claim = await challengeRepository.getRewardClaim(challengeId, userId);
    if (!claim) {
      throw new Error('Confirm a reward before submitting delivery details');
    }
    if (claim.orderId) {
      return {
        challengeId,
        rewardName: String(claim.rewardName || ''),
        orderId: Number(claim.orderId),
        orderNumber: String(claim.orderNumber || ''),
        alreadySubmitted: true,
      };
    }

    const fullName = String(delivery.fullName || '').trim();
    const mobile = String(delivery.mobile || '').trim();
    const address = String(delivery.address || '').trim();
    const city = String(delivery.city || '').trim();
    const state = String(delivery.state || '').trim();
    const pinCode = String(delivery.pinCode || '').trim();
    if (!fullName || !mobile || !address || !city || !state || !pinCode) {
      throw new Error('Enter all delivery details');
    }

    const remarks = [
      'Challenge reward delivery',
      `Name: ${fullName}`,
      `Mobile: ${mobile}`,
      `Address: ${address}`,
      `City: ${city}`,
      `State: ${state}`,
      `PIN: ${pinCode}`,
      `ChallengeId: ${challengeId}`,
      `Reward: ${claim.rewardName}`,
    ].join('\n');

    const created = await orderService.create({
      userId,
      orderType: 'SPIRITUAL_PRODUCT',
      orderSource: 'CHALLENGE',
      itemName: String(claim.rewardName || 'Challenge reward'),
      quantity: 1,
      paymentId: null,
      remarks,
    });

    const orderNumber = `RW${String(10000 + Number(created.id)).padStart(5, '0')}`;
    await mysql.query(
      `
      UPDATE orders
      SET
        order_number = ?,
        payment_status = 'SUCCESS',
        order_status = 'PROCESSING'
      WHERE id = ?
      `,
      [orderNumber, created.id],
    );

    await challengeRepository.saveRewardDelivery(Number(claim.id), {
      fullName,
      mobile,
      address,
      city,
      state,
      pinCode,
      orderId: Number(created.id),
      orderNumber,
    });

    return {
      challengeId,
      rewardName: String(claim.rewardName || ''),
      orderId: Number(created.id),
      orderNumber,
      alreadySubmitted: false,
    };
  }

}

export default new ChallengeService();
