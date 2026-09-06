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
      streakDays: (await this.getStreakStats(userId)).current,
    };

  }

  private istDay(value: Date | string) {
    const instant =
      value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(instant.getTime())) {
      return String(value).slice(0, 10);
    }
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  }

  private shiftIsoDay(day: string, offset: number) {
    const [year, month, date] = day.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, date + offset));
    return next.toISOString().slice(0, 10);
  }

  private weekdayLabel(day: string) {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString(
      'en-IN',
      {weekday: 'short', timeZone: 'UTC'},
    );
  }

  private monthLabel(monthKey: string) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', {
      month: 'short',
      timeZone: 'UTC',
    });
  }

  private fillCurrentMonthWeeks(counts: Record<string, number>) {
    const today = this.istDay(new Date());
    const [year, month] = today.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const points: Array<{label: string; value: number}> = [];
    for (let start = 1; start <= lastDay; start += 7) {
      const end = Math.min(start + 6, lastDay);
      let value = 0;
      for (let day = start; day <= end; day += 1) {
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        value += Number(counts[key] ?? 0);
      }
      points.push({label: `${start}-${end}`, value});
    }
    return points;
  }

  private dailyCounts(rows: {createdAt: string; sessionCount: number}[]) {
    const counts: Record<string, number> = {};
    rows.forEach(item => {
      const day = this.istDay(item.createdAt);
      if (!day) {
        return;
      }
      counts[day] = (counts[day] || 0) + Number(item.sessionCount || 0);
    });
    return counts;
  }

  private fillDays(
    days: number,
    counts: Record<string, number>,
    withLabels = false,
  ) {
    const today = this.istDay(new Date());
    const points: Array<{label: string; value: number}> = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const day = this.shiftIsoDay(today, -i);
      points.push({
        label: this.weekdayLabel(day),
        value: Number(counts[day] ?? 0),
      });
    }
    return withLabels ? points : points.map(item => item.value);
  }

  private fillMonths(months: number, counts: Record<string, number>) {
    const today = this.istDay(new Date());
    const [year, month] = today.split('-').map(Number);
    const points: Array<{label: string; value: number}> = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const date = new Date(Date.UTC(year, month - 1 - i, 1));
      const key = date.toISOString().slice(0, 7);
      const value = Object.entries(counts).reduce((sum, [day, count]) => {
        return day.startsWith(key) ? sum + count : sum;
      }, 0);
      points.push({label: this.monthLabel(key), value});
    }
    return points;
  }

  private insightFor(total: number, streak: number, today: number) {
    if (total <= 0) {
      return 'Begin your daily Japa and save a session. Streaks and graphs will grow from your saved counts.';
    }
    if (today <= 0) {
      return 'You have saved Japa before. Chant today to keep your streak alive.';
    }
    if (streak >= 7) {
      return `A ${streak}-day streak is forming. Protect your daily rhythm.`;
    }
    return `Today's saved Japa is updating your charts. Current streak: ${streak} day${streak === 1 ? '' : 's'}.`;
  }

  async getStreakStats(userId: number) {
    const rows = await japaRepository.getSessionRows(userId);
    const counts = this.dailyCounts(rows);
    const days = Object.keys(counts).sort();
    const daySet = new Set(days);
    const today = this.istDay(new Date());
    let current = 0;
    for (let i = 0; i < 400; i += 1) {
      const day = this.shiftIsoDay(today, -i);
      if (daySet.has(day)) {
        current += 1;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }
    let best = 0;
    let run = 0;
    let previous = '';
    days.forEach(day => {
      if (!previous) {
        run = 1;
      } else {
        run = this.shiftIsoDay(previous, 1) === day ? run + 1 : 1;
      }
      best = Math.max(best, run);
      previous = day;
    });
    const year = today.slice(0, 4);
    return {
      current,
      best,
      thisYear: days.filter(day => day.startsWith(year)).length,
      activeDays: days.length,
    };
  }

  async getAnalytics(userId: number) {
    const [summary, weekly, goals, sessionRows, streak] = await Promise.all([
      this.getSummary(userId),
      japaRepository.getWeeklyBreakdown(userId),
      japaGoalRepository.getUserGoals(userId),
      japaRepository.getSessionRows(userId),
      this.getStreakStats(userId),
    ]);

    const counts = this.dailyCounts(sessionRows);
    const weekTrend = this.fillDays(7, counts, true) as Array<{
      label: string;
      value: number;
    }>;
    const monthTrend = this.fillCurrentMonthWeeks(counts);
    const lifeTrend = this.fillMonths(12, counts);
    const weekValues = weekTrend.map(item => item.value);
    const monthValues = monthTrend.map(item => item.value);
    const weekTotal = weekValues.reduce((sum, value) => sum + value, 0);
    const monthTotal = monthValues.reduce((sum, value) => sum + value, 0);
    const goalList = goals || [];
    const completedGoals = goalList.filter((item: any) =>
      ['COMPLETED', 'completed', 1, '1'].includes(item.status),
    ).length;
    const insight = this.insightFor(
      summary.totalJapaCount,
      streak.current,
      summary.todayJapaCount,
    );
    const milestones = [108, 1008, 10000, 21000, 108000].filter(
      value => summary.totalJapaCount >= value,
    ).length;
    return {
      overview: {
        stats: [
          {label: 'TOTAL JAPAS', value: summary.totalJapaCount.toLocaleString()},
          {label: 'ACTIVE DAYS', value: String(streak.activeDays)},
          {label: 'STREAK', value: String(streak.current)},
        ],
        trend: lifeTrend,
        insight,
      },
      daily: {
        stats: [
          {label: 'TODAY', value: summary.todayJapaCount.toLocaleString()},
          {
            label: 'AVG / DAY',
            value: String(Math.round(weekTotal / 7) || 0),
          },
          {label: 'BEST', value: String(Math.max(...weekValues, 0))},
        ],
        trend: weekTrend,
        insight,
      },
      weekly: {
        stats: [
          {
            label: 'THIS WEEK',
            value: (summary.weeklyJapaCount || weekTotal).toLocaleString(),
          },
          {
            label: 'AVG / DAY',
            value: String(
              Math.round((summary.weeklyJapaCount || weekTotal) / 7) || 0,
            ),
          },
          {label: 'BEST DAY', value: String(Math.max(...weekValues, 0))},
        ],
        trend: weekTrend,
        insight,
      },
      monthly: {
        stats: [
          {
            label: 'THIS MONTH',
            value: (summary.monthlyJapaCount || monthTotal).toLocaleString(),
          },
          {
            label: 'AVG / DAY',
            value: String(
              Math.round((summary.monthlyJapaCount || monthTotal) / 30) || 0,
            ),
          },
          {
            label: 'GOAL RATE',
            value: `${Math.min(
              100,
              Math.round(
                ((summary.monthlyJapaCount || monthTotal) / 10800) * 100,
              ),
            )}%`,
          },
        ],
        trend: monthTrend,
        insight,
      },
      lifetime: {
        stats: [
          {label: 'TOTAL JAPAS', value: summary.totalJapaCount.toLocaleString()},
          {label: 'ACTIVE DAYS', value: String(streak.activeDays)},
          {label: 'MILESTONES', value: String(milestones)},
        ],
        trend: lifeTrend,
        insight,
      },
      goals: {
        stats: [
          {label: 'GOALS SET', value: String(goalList.length)},
          {label: 'COMPLETED', value: String(completedGoals)},
          {
            label: 'SUCCESS',
            value: `${
              goalList.length
                ? Math.round((completedGoals / goalList.length) * 100)
                : 0
            }%`,
          },
        ],
        trend: weekTrend,
        insight,
      },
      streak: {
        stats: [
          {label: 'CURRENT', value: `${streak.current} days`},
          {label: 'BEST', value: `${streak.best} days`},
          {label: 'THIS YEAR', value: String(streak.thisYear)},
        ],
        trend: weekTrend,
        insight,
      },
      weeklyRaw: weekly,
    };
  }

  async getMilestones(userId: number) {
    const summary = await this.getSummary(userId);
    const total = Number(summary.totalJapaCount || 0);
    const levels = [500, 1000, 2000, 10000];
    const reached = levels.filter(level => total >= level);
    const next = levels.find(level => total < level) || 108000;
    return {
      total,
      latest: reached[reached.length - 1] || 0,
      upcoming: levels.filter(level => total < level).map(level => ({
        target: level,
        title: `${level.toLocaleString()} Japas`,
        subtitle:
          level === 500
            ? 'Keep going — you are halfway there.'
            : 'A new spiritual milestone awaits you.',
      })),
      eligibleForAnnadanam: total >= 1000,
      next,
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