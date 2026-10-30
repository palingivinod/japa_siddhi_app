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

    const istDay = (value?: string | Date | null) => {
      const text = String(value || '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
      }
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(value instanceof Date ? value : new Date());
    };
    const addDays = (day: string, offset: number) => {
      const [year, month, date] = day.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, date + offset))
        .toISOString()
        .slice(0, 10);
    };
    let startDateStr = istDay(data.startDate);
    let endDateStr = data.endDate ? istDay(data.endDate) : '';
    if (!endDateStr) {
      endDateStr = addDays(startDateStr, days - 1);
    }
    const today = istDay(new Date());
    if (startDateStr === addDays(today, -1)) {
      startDateStr = today;
      endDateStr = addDays(endDateStr, 1);
    }

    const goalId =
      await japaGoalRepository.createGoal({

        userId,

        mantraType:
          data.mantraType === 'PERSONAL' || data.personalMantraId
            ? 'PERSONAL'
            : data.mantraType,

        // Personal goals must not keep a catalog mantra_id (shows Om Namah Shivaya).
        mantraId:
          data.mantraType === 'PERSONAL' || data.personalMantraId
            ? null
            : data.mantraId ?? null,

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
          startDateStr,

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