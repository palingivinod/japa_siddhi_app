import mysql from '../../database/mysql';
import notificationService from './notification.service';

const DEADLINE_WINDOWS = [3, 1, 0] as const;

const todayYmdIst = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const toYmd = (value: any): string | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return toYmd(parsed);
};

const daysUntil = (today: string, endDate: string) => {
  const start = Date.parse(`${today}T00:00:00`);
  const end = Date.parse(`${endDate}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return Math.round((end - start) / 86400000);
};

const deadlineActionId = (entityId: number, daysLeft: number) =>
  Number(entityId) * 1000 + Number(daysLeft);

const notificationsEnabled = async (userId: number) => {
  try {
    const rows = await mysql.query<any[]>(
      `
      SELECT notifications_on AS notificationsOn
      FROM user_settings
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId],
    );
    if (!rows?.[0]) {
      return true;
    }
    return Number(rows[0].notificationsOn) === 1;
  } catch {
    return true;
  }
};

const notifyOnce = async (input: {
  userId: number;
  title: string;
  message: string;
  notificationType:
    | 'JAPA_REMINDER'
    | 'GOAL_COMPLETED'
    | 'REWARD'
    | 'GENERAL'
    | 'SYSTEM';
  actionType: string;
  actionId: number;
  extraData?: Record<string, any>;
  expiresAt?: string | null;
}) => {
  const enabled = await notificationsEnabled(input.userId);
  if (!enabled) {
    return false;
  }
  const exists = await notificationService.existsByAction(
    input.userId,
    input.actionType,
    input.actionId,
  );
  if (exists) {
    return false;
  }
  await notificationService.create({
    userId: input.userId,
    title: input.title,
    message: input.message,
    notificationType: input.notificationType,
    actionType: input.actionType,
    actionId: input.actionId,
    extraData: input.extraData || null,
    expiresAt: input.expiresAt ?? null,
  });
  return true;
};

/** End of an IST calendar day — reminders leave the inbox after this. */
const endOfDayStamp = (ymd: string) => `${ymd} 23:59:59`;

const challengeDeadlineCopy = (
  title: string,
  daysLeft: number,
  current: number,
  target: number,
) => {
  const progress =
    target > 0
      ? ` You are at ${Number(current).toLocaleString('en-IN')} of ${Number(target).toLocaleString('en-IN')}.`
      : '';
  if (daysLeft <= 0) {
    return {
      title: 'Challenge ends today',
      message: `"${title}" ends today. Please complete it before the deadline.${progress}`,
    };
  }
  if (daysLeft === 1) {
    return {
      title: 'Challenge deadline tomorrow',
      message: `"${title}" ends tomorrow. Please complete your challenge soon.${progress}`,
    };
  }
  return {
    title: 'Challenge deadline is near',
    message: `"${title}" ends in ${daysLeft} days. Please complete it before the deadline.${progress}`,
  };
};

const goalDeadlineCopy = (
  name: string,
  daysLeft: number,
  completed: number,
  target: number,
) => {
  const progress = ` Progress: ${Number(completed).toLocaleString('en-IN')} / ${Number(target).toLocaleString('en-IN')}.`;
  if (daysLeft <= 0) {
    return {
      title: 'Japa goal ends today',
      message: `"${name}" ends today. Please finish your goal.${progress}`,
    };
  }
  if (daysLeft === 1) {
    return {
      title: 'Japa goal ends tomorrow',
      message: `"${name}" ends tomorrow. Keep chanting to complete it.${progress}`,
    };
  }
  return {
    title: 'Japa goal deadline is near',
    message: `"${name}" ends in ${daysLeft} days. Please complete your goal.${progress}`,
  };
};

export const notifyChallengeCompleted = async (input: {
  userId: number;
  challengeId: number;
  title?: string;
  currentValue?: number;
  targetValue?: number;
}) => {
  const title = String(input.title || 'Challenge').trim() || 'Challenge';
  return notifyOnce({
    userId: input.userId,
    title: 'Challenge completed!',
    message: `You completed "${title}". Claim your reward from Challenges.`,
    notificationType: 'REWARD',
    actionType: 'CHALLENGE_COMPLETED',
    actionId: Number(input.challengeId),
    extraData: {
      challengeId: input.challengeId,
      currentValue: input.currentValue,
      targetValue: input.targetValue,
    },
  });
};

export const flushDeadlineReminders = async () => {
  const today = todayYmdIst();
  let created = 0;

  try {
    const challengeRows = await mysql.query<any[]>(`
      SELECT
        cp.user_id AS userId,
        c.id AS challengeId,
        c.title AS title,
        c.end_date AS endDate,
        c.target_value AS targetValue,
        IFNULL(cp.current_value, 0) AS currentValue
      FROM challenge_participants cp
      INNER JOIN challenges c ON c.id = cp.challenge_id
      WHERE IFNULL(c.is_active, 0) = 1
        AND IFNULL(cp.is_completed, 0) = 0
    `);

    for (const row of challengeRows || []) {
      const endDate = toYmd(row.endDate);
      if (!endDate) {
        continue;
      }
      const left = daysUntil(today, endDate);
      if (left == null || !DEADLINE_WINDOWS.includes(left as any)) {
        continue;
      }
      const copy = challengeDeadlineCopy(
        String(row.title || 'Challenge'),
        left,
        Number(row.currentValue || 0),
        Number(row.targetValue || 0),
      );
      const ok = await notifyOnce({
        userId: Number(row.userId),
        title: copy.title,
        message: copy.message,
        notificationType: 'JAPA_REMINDER',
        actionType: 'CHALLENGE_DEADLINE',
        actionId: deadlineActionId(Number(row.challengeId), left),
        extraData: {
          challengeId: Number(row.challengeId),
          daysLeft: left,
          endDate,
        },
        expiresAt: endOfDayStamp(endDate),
      });
      if (ok) {
        created += 1;
      }
    }
  } catch (error) {
    console.warn('Challenge deadline reminders failed:', error);
  }

  try {
    const goalRows = await mysql.query<any[]>(`
      SELECT
        id AS goalId,
        user_id AS userId,
        goal_name AS goalName,
        end_date AS endDate,
        IFNULL(target_count, 0) AS targetCount,
        IFNULL(completed_count, 0) AS completedCount
      FROM japa_goals
      WHERE status = 'ACTIVE'
        AND IFNULL(completed_count, 0) < IFNULL(target_count, 0)
    `);

    for (const row of goalRows || []) {
      const endDate = toYmd(row.endDate);
      if (!endDate) {
        continue;
      }
      const left = daysUntil(today, endDate);
      if (left == null || !DEADLINE_WINDOWS.includes(left as any)) {
        continue;
      }
      const copy = goalDeadlineCopy(
        String(row.goalName || 'Japa goal'),
        left,
        Number(row.completedCount || 0),
        Number(row.targetCount || 0),
      );
      const ok = await notifyOnce({
        userId: Number(row.userId),
        title: copy.title,
        message: copy.message,
        notificationType: 'JAPA_REMINDER',
        actionType: 'GOAL_DEADLINE',
        actionId: deadlineActionId(Number(row.goalId), left),
        extraData: {
          goalId: Number(row.goalId),
          daysLeft: left,
          endDate,
        },
        expiresAt: endOfDayStamp(endDate),
      });
      if (ok) {
        created += 1;
      }
    }
  } catch (error) {
    console.warn('Goal deadline reminders failed:', error);
  }

  try {
    const rewardRows = await mysql.query<any[]>(`
      SELECT
        cp.user_id AS userId,
        c.id AS challengeId,
        c.title AS title
      FROM challenge_participants cp
      INNER JOIN challenges c ON c.id = cp.challenge_id
      WHERE IFNULL(cp.is_completed, 0) = 1
        AND IFNULL(cp.reward_given, 0) = 0
    `);

    for (const row of rewardRows || []) {
      const title = String(row.title || 'Challenge');
      const ok = await notifyOnce({
        userId: Number(row.userId),
        title: 'Reward ready to claim',
        message: `You finished "${title}". Open Challenges to claim your reward.`,
        notificationType: 'REWARD',
        actionType: 'CHALLENGE_REWARD_READY',
        actionId: Number(row.challengeId),
        extraData: {challengeId: Number(row.challengeId)},
      });
      if (ok) {
        created += 1;
      }
    }
  } catch (error) {
    console.warn('Challenge reward reminders failed:', error);
  }

  try {
    // Active devotees who chanted in the last 14 days but not today.
    const since = new Date(`${today}T00:00:00`);
    since.setDate(since.getDate() - 14);
    const sinceYmd = toYmd(since) || today;
    const idleRows = await mysql.query<any[]>(
      `
      SELECT
        u.id AS userId
      FROM users u
      LEFT JOIN user_settings us ON us.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND IFNULL(us.notifications_on, 1) = 1
        AND EXISTS (
          SELECT 1
          FROM japa_sessions js
          WHERE js.user_id = u.id
            AND date(js.created_at) >= date(?)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM japa_sessions js2
          WHERE js2.user_id = u.id
            AND date(js2.created_at) = date(?)
        )
      LIMIT 300
      `,
      [sinceYmd, today],
    );

    const dayKey = Number(today.replace(/-/g, ''));
    for (const row of idleRows || []) {
      const ok = await notifyOnce({
        userId: Number(row.userId),
        title: 'Daily japa reminder',
        message:
          'You have not chanted today. Take a few minutes for your japa practice.',
        notificationType: 'JAPA_REMINDER',
        actionType: 'DAILY_JAPA_REMINDER',
        actionId: dayKey,
        extraData: {date: today},
        expiresAt: endOfDayStamp(today),
      });
      if (ok) {
        created += 1;
      }
    }
  } catch (error) {
    console.warn('Daily japa reminders failed:', error);
  }

  return {created, date: today};
};

let reminderTimer: NodeJS.Timeout | null = null;
let reminderRunning = false;

export const runReminderSweep = async () => {
  if (reminderRunning) {
    return;
  }
  reminderRunning = true;
  try {
    const {flushDueAdminNotifications} = await import(
      '../admin/adminNotification.service'
    );
    await flushDueAdminNotifications().catch(() => undefined);
    await notificationService.purgeExpiredReminders().catch(() => undefined);
    await flushDeadlineReminders();
  } catch (error) {
    console.warn('Notification reminder sweep failed:', error);
  } finally {
    reminderRunning = false;
  }
};

export const startNotificationReminderScheduler = () => {
  if (reminderTimer) {
    return;
  }
  // First sweep shortly after boot, then every 30 minutes.
  setTimeout(() => {
    runReminderSweep().catch(() => undefined);
  }, 15_000);
  reminderTimer = setInterval(() => {
    runReminderSweep().catch(() => undefined);
  }, 30 * 60 * 1000);
  if (typeof reminderTimer.unref === 'function') {
    reminderTimer.unref();
  }
};
