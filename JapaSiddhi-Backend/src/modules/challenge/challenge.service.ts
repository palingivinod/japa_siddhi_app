import {
  CreateChallengeRequest,
} from './challenge.types';

import challengeRepository from './challenge.repository';

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
    const currentValue = Number(participant?.current_value ?? participant?.currentValue ?? 0);
    const target = Number(challenge.targetValue || 1);
    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);
    const durationDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86400000),
    );

    return {
      ...challenge,
      durationDays: durationDays > 400 ? 30 : durationDays,
      typeLabel: challenge.challengeType === 'SPECIAL' ? 'Festival' : 'Community',
      dailyMinimum: Math.ceil(target / 30),
      joined: Boolean(participant),
      currentValue,
      progressPercent: Math.min(100, Math.round((currentValue / target) * 100)),
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
  ) {

    return challengeRepository.leaderboard(
      challengeId,
    );

  }

}

export default new ChallengeService();