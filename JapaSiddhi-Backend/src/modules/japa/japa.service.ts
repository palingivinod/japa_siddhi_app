import {
  CreateJapaSessionRequest,
  JapaValidationResult,
  JapaSummary,
} from './japa.types';

import japaRepository from './japa.repository';
import japaGoalRepository from '../japaGoal/japaGoal.repository';
import challengeRepository from '../challenge/challenge.repository';
import notificationService from '../notification/notification.service';
import mysql from '../../database/mysql';
import AppError from '../../utils/appError';
import {
  buildMilestoneProgress,
  SPIRITUAL_MILESTONES,
} from './japa.milestones';

const MILESTONE_ACTION = 'JAPA_MILESTONE';

class JapaService {

  async createSession(
    userId: number,
    data: CreateJapaSessionRequest,
  ) {

    const previousTotal = await japaRepository.getUserMilestoneJapa(userId);

    let japaGoalId = data.japaGoalId;
    const challengeId = Number(data.challengeId || 0) || 0;
    const remarks = challengeId
      ? `Challenge:${challengeId}${data.remarks ? ` · ${data.remarks}` : ''}`
      : data.remarks ?? null;

    // Challenge japa stays separate from Antharanga / daily japa goals.
    if (challengeId) {
      japaGoalId = undefined;
    } else if (japaGoalId) {
      const ownedGoal = await japaGoalRepository.getGoalById(
        japaGoalId,
        userId,
      );
      if (!ownedGoal) {
        throw new AppError('Japa goal not found for this user', 403);
      }
    } else if (data.mantraType !== 'PERSONAL') {
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

        remarks,

      });


    if (japaGoalId && !challengeId) {
      await japaRepository.updateJapaGoalProgress(
        japaGoalId,
        data.sessionCount,
        userId,
      );
    }


    const [globalCount, userTotal, milestoneTotal, challengeUpdates] =
      await Promise.all([
        japaRepository.updateGlobalJapaCount(data.sessionCount),
        japaRepository.getUserTotalJapa(userId),
        japaRepository.getUserMilestoneJapa(userId),
        challengeId
          ? this.applySessionToChallenge(userId, challengeId, data.sessionCount)
          : Promise.resolve([]),
      ]);

    const milestonesReached = challengeId
      ? []
      : await this.notifyMilestonesReached(
          userId,
          previousTotal,
          milestoneTotal,
        );

    return {
      sessionId,
      count: data.sessionCount,
      globalCount,
      userTotal,
      milestoneTotal,
      challengeUpdates,
      milestonesReached,
    };

  }

  private async applySessionToChallenge(
    userId: number,
    challengeId: number,
    sessionCount: number,
  ) {
    const amount = Number(sessionCount || 0);
    if (amount <= 0 || !challengeId) {
      return [];
    }
    const rows = await challengeRepository.getOpenParticipations(userId);
    const row = (rows || []).find(
      item => Number(item.challengeId || item.challenge_id) === challengeId,
    );
    if (!row) {
      return [];
    }
    const next = Number(row.currentValue ?? row.current_value ?? 0) + amount;
    const target = Number(row.targetValue ?? row.target_value ?? 0);
    const completed = target > 0 && next >= target;
    await challengeRepository.updateProgress(
      challengeId,
      userId,
      next,
      completed,
    );
    return [{challengeId, currentValue: next, completed}];
  }

  private async applySessionToChallenges(userId: number, sessionCount: number) {
    const amount = Number(sessionCount || 0);
    if (amount <= 0) {
      return [];
    }
    const rows = await challengeRepository.getOpenParticipations(userId);
    const updates: Array<{
      challengeId: number;
      currentValue: number;
      completed: boolean;
    }> = [];
    for (const row of rows || []) {
      const challengeId = Number(row.challengeId || row.challenge_id);
      const next = Number(row.currentValue ?? row.current_value ?? 0) + amount;
      const target = Number(row.targetValue ?? row.target_value ?? 0);
      const completed = target > 0 && next >= target;
      await challengeRepository.updateProgress(
        challengeId,
        userId,
        next,
        completed,
      );
      updates.push({challengeId, currentValue: next, completed});
    }
    return updates;
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
      byMantra,
      milestoneTotal,
    ] = await Promise.all([
      japaRepository.getUserTotalJapa(userId),
      japaRepository.getTodayJapa(userId),
      japaRepository.getWeekJapa(userId),
      japaRepository.getMonthJapa(userId),
      japaRepository.getGlobalJapaCount(),
      japaRepository.getMantraTotals(userId),
      japaRepository.getUserMilestoneJapa(userId),
    ]);

    return {
      totalJapaCount,
      todayJapaCount,
      weeklyJapaCount,
      monthlyJapaCount,
      globalJapaCount,
      streakDays: (await this.getStreakStats(userId)).current,
      byMantra,
      milestoneTotal,
      milestone: buildMilestoneProgress(milestoneTotal),
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
    const [summary, weekly, goals, sessionRows, streak, byMantra] =
      await Promise.all([
        this.getSummary(userId),
        japaRepository.getWeeklyBreakdown(userId),
        japaGoalRepository.getUserGoals(userId),
        japaRepository.getSessionRows(userId),
        this.getStreakStats(userId),
        Promise.all([
          japaRepository.getMantraTotals(userId, 'all'),
          japaRepository.getMantraTotals(userId, 'today'),
          japaRepository.getMantraTotals(userId, 'week'),
          japaRepository.getMantraTotals(userId, 'month'),
          japaRepository.getMantraTotals(userId, 'year'),
        ]),
      ]);

    const [
      byMantraAll,
      byMantraToday,
      byMantraWeek,
      byMantraMonth,
      byMantraYear,
    ] = byMantra;

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
    const milestones = SPIRITUAL_MILESTONES.filter(
      item => Number(summary.milestoneTotal || 0) >= item.target,
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
        byMantra: byMantraAll,
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
        byMantra: byMantraToday,
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
        byMantra: byMantraWeek,
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
        byMantra: byMantraMonth,
      },
      lifetime: {
        stats: [
          {label: 'TOTAL JAPAS', value: summary.totalJapaCount.toLocaleString()},
          {label: 'ACTIVE DAYS', value: String(streak.activeDays)},
          {label: 'MILESTONES', value: String(milestones)},
        ],
        trend: lifeTrend,
        insight,
        byMantra: byMantraAll,
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
        byMantra: byMantraWeek,
      },
      streak: {
        stats: [
          {label: 'CURRENT', value: `${streak.current} days`},
          {label: 'BEST', value: `${streak.best} days`},
          {label: 'THIS YEAR', value: String(streak.thisYear)},
        ],
        trend: weekTrend,
        insight,
        byMantra: byMantraYear,
      },
      byMantra: byMantraAll,
      weeklyRaw: weekly,
      milestone: summary.milestone || buildMilestoneProgress(summary.milestoneTotal || 0),
    };
  }

  private milestoneItem(level: number) {
    const match = SPIRITUAL_MILESTONES.find(item => item.target === level);
    return {
      target: level,
      title: match?.title || `${level.toLocaleString()} Japas`,
      key: match?.key || `milestone_${level}`,
      subtitle: match
        ? `Reach ${level.toLocaleString()} Japas`
        : 'A new spiritual milestone awaits you.',
    };
  }

  private async notifyMilestonesReached(
    userId: number,
    previousTotal: number,
    userTotal: number,
  ) {
    const newlyReached = SPIRITUAL_MILESTONES.filter(
      item => previousTotal < item.target && userTotal >= item.target,
    );
    if (!newlyReached.length) {
      return [];
    }
    const settings = await japaRepository.getSettings(userId);
    if (Number(settings.notificationsOn) !== 1) {
      return newlyReached.map(item => item.target);
    }
    for (const item of newlyReached) {
      const exists = await notificationService.existsByAction(
        userId,
        MILESTONE_ACTION,
        item.target,
      );
      if (exists) {
        continue;
      }
      await notificationService.create({
        userId,
        title: `${item.title} Achieved!`,
        message: `You have reached ${item.target.toLocaleString()} Japas and unlocked ${item.title}.`,
        notificationType: 'GOAL_COMPLETED',
        actionType: MILESTONE_ACTION,
        actionId: item.target,
        extraData: {
          milestone: item.target,
          title: item.title,
          total: userTotal,
        },
      });
    }
    return newlyReached.map(item => item.target);
  }

  async getMilestones(userId: number) {
    const [milestoneTotal, settings, unreadCount, latestNote] =
      await Promise.all([
        japaRepository.getUserMilestoneJapa(userId),
        japaRepository.getSettings(userId),
        notificationService.getUnreadCountByAction(userId, MILESTONE_ACTION),
        notificationService.getLatestByAction(userId, MILESTONE_ACTION),
      ]);
    const progress = buildMilestoneProgress(milestoneTotal);
    return {
      ...progress,
      eligibleForAnnadanam: milestoneTotal >= 1000,
      notificationsOn: Number(settings.notificationsOn) === 1,
      unreadCount,
      latestAt: latestNote?.sentAt || null,
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