import {
  CreateJapaSessionRequest,
  JapaValidationResult,
  JapaSummary,
} from './japa.types';

import japaRepository from './japa.repository';
import japaGoalRepository from '../japaGoal/japaGoal.repository';
import mysql from '../../database/mysql';
import AppError from '../../utils/appError';

class JapaService {

  async createSession(
    userId: number,
    data: CreateJapaSessionRequest,
  ) {

    let japaGoalId = data.japaGoalId;

    if (japaGoalId) {
      const ownedGoal = await japaGoalRepository.getGoalById(
        japaGoalId,
        userId,
      );
      if (!ownedGoal) {
        throw new AppError('Japa goal not found for this user', 403);
      }
    } else {
      japaGoalId = await japaGoalRepository.findOrCreateActiveGoal(
        userId,
        data.mantraId,
      );
    }

    const sessionId =
      await japaRepository.createSession({

        userId,

        japaGoalId,

        mantraType:
          data.mantraType,

        mantraId:
          data.mantraId,

        personalMantraId:
          data.personalMantraId,

        chantMode:
          data.chantMode,

        sessionCount:
          data.sessionCount,

        durationSeconds:
          data.durationSeconds ?? 0,

        remarks:
          data.remarks ?? null,

      });


    if (japaGoalId) {
      await japaRepository.updateJapaGoalProgress(
        japaGoalId,
        data.sessionCount,
        userId,
      );
    }


    // Updates database and emits Socket.IO event
    const [globalCount, userTotal] = await Promise.all([
      japaRepository.updateGlobalJapaCount(data.sessionCount),
      japaRepository.getUserTotalJapa(userId),
    ]);


    return {

      sessionId,

      count:
        data.sessionCount,

      globalCount,

      userTotal,

    };

  }



  validateTapChant(
    expectedSeconds: number,
    actualSeconds: number,
  ): JapaValidationResult {

    const isValid =
      actualSeconds >= expectedSeconds;

    return {

      isValid,

      mode: 'TAP',

      message:
        isValid
          ? 'Valid Japa'
          : 'Chant duration too short',

      sessionCount:
        isValid ? 1 : 0,

    };

  }



  validateVoiceChant(
    matchPercentage: number,
  ): JapaValidationResult {

    const isValid =
      matchPercentage >= 50;

    return {

      isValid,

      mode: 'VOICE',

      message:
        isValid
          ? 'Valid Japa'
          : 'Mantra not matched',

      sessionCount:
        isValid ? 1 : 0,

    };

  }



  async getSummary(
    userId: number,
  ): Promise<JapaSummary> {

    const [
      totalJapaCount,
      todayJapaCount,
      weeklyJapaCount,
      monthlyJapaCount,
      globalJapaCount,
    ] = await Promise.all([
      japaRepository.getUserTotalJapa(userId),
      japaRepository.getTodayJapa(userId),
      japaRepository.getWeekJapa(userId),
      japaRepository.getMonthJapa(userId),
      japaRepository.getGlobalJapaCount(),
    ]);

    return {
      totalJapaCount,
      todayJapaCount,
      weeklyJapaCount,
      monthlyJapaCount,
      globalJapaCount,
      streakDays: todayJapaCount > 0 ? 1 : 0,
    };

  }

  async getCommunity(userId: number) {
    const [mantras, totalChants, devotees, summary] = await Promise.all([
      mysql.query<any[]>(
        `
        SELECT
          id,
          mantra_name AS mantraName,
          deity_name AS deityName,
          transliteration
        FROM mantras
        WHERE is_active = 1
        ORDER BY display_order ASC
        `,
      ),
      japaRepository.getGlobalJapaCount(),
      japaRepository.getDevoteeCount(),
      this.getSummary(userId),
    ]);

    return {
      mantras,
      totalChants,
      devotees: Math.max(devotees, 1),
      todayCount: summary.todayJapaCount,
    };
  }

  async joinCommunity(userId: number, mantraId?: number) {
    const goal = await japaGoalRepository.findOrCreateActiveGoal(
      userId,
      mantraId,
    );
    return {
      joined: true,
      japaGoalId: goal,
      mode: 'community',
    };
  }

  async getProgress(userId: number) {
    const [summary, weekly, goals] = await Promise.all([
      this.getSummary(userId),
      japaRepository.getWeeklyBreakdown(userId),
      japaGoalRepository.getUserGoals(userId),
    ]);
    const goal = Number(goals?.[0]?.dailyTarget ?? goals?.[0]?.targetCount ?? 2000);
    const today = Number(summary.todayJapaCount ?? 0);
    return {
      todayCount: today,
      goal,
      progressPercent: Math.min(100, Math.round((today / Math.max(goal, 1)) * 100)),
      weekly,
      lifetime: summary.totalJapaCount,
    };
  }

  async saveReference(userId: number, mantraId: number | null, durationMs: number) {
    const id = await japaRepository.saveReference(
      userId,
      mantraId,
      Math.max(800, Number(durationMs) || 2500),
    );
    return {id, durationMs: Math.max(800, Number(durationMs) || 2500)};
  }

  async getReference(userId: number) {
    return (
      (await japaRepository.getReference(userId)) ?? {
        durationMs: 2500,
        mantraId: null,
      }
    );
  }

}

export default new JapaService();