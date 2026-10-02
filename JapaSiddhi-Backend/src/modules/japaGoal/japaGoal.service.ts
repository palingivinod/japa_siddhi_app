import {
  CreateJapaGoalRequest,
} from './japaGoal.types';

import japaGoalRepository from './japaGoal.repository';


class JapaGoalService {


  async createGoal(
    userId: number,
    data: CreateJapaGoalRequest,
  ) {


    const days = Math.max(1, Number(data.days) || 1);
    const minDividedDailyTarget = Math.max(
      1,
      Math.ceil(Number(data.targetCount) / days),
    );
    const customDaily = Number(data.dailyTarget);
    const dailyTarget =
      customDaily >= minDividedDailyTarget
        ? customDaily
        : minDividedDailyTarget;

    const startDate = new Date(data.startDate || new Date().toISOString().slice(0, 10));
    let endDateStr = data.endDate ? String(data.endDate).slice(0, 10) : '';
    if (!endDateStr) {
      const end = new Date(startDate);
      end.setDate(end.getDate() + (days - 1));
      endDateStr = end.toISOString().split('T')[0];
    }

    const goalId =
      await japaGoalRepository.createGoal({

        userId,

        mantraType:
          data.mantraType,

        mantraId:
          data.mantraId ?? null,

        personalMantraId:
          data.personalMantraId ?? null,

        goalName:
          data.goalName,

        targetCount:
          data.targetCount,

        remainingCount:
          data.targetCount,

        dailyTarget,

        startDate:
          startDate
            .toISOString()
            .split('T')[0],

        endDate:
          endDateStr,

        notes:
          data.notes ?? null,

      });


    return {

      goalId,

      dailyTarget,

    };

  }



  async getGoals(
    userId: number,
  ) {


    return japaGoalRepository.getUserGoals(
      userId,
    );

  }



  async getGoal(
    id: number,
    userId: number,
  ) {


    return japaGoalRepository.getGoalById(
      id,
      userId,
    );

  }



  async updateStatus(
    id: number,
    userId: number,
    status: string,
  ) {


    await japaGoalRepository.updateStatus(
      id,
      userId,
      status,
    );


    return {
      success: true,
    };

  }



  async cancelGoal(
    id: number,
    userId: number,
  ) {


    await japaGoalRepository.deleteGoal(
      id,
      userId,
    );


    return {
      success: true,
    };

  }


}


export default new JapaGoalService();