import mysql from '../../database/mysql';
import notificationService from './notification.service';

const DEADLINE_WINDOWS = [3, 1, 0] as const;

/** Fixed tray / inbox heading for all japa-related alerts. */
const BRAND_HEADING = 'Japasiddhi - Bilva Patra Trust';

type JapaNotifyCategory =
  | 'Antharanga Japa'
  | 'Samuhika'
  | 'Challenge'
  | 'Daily reminder';

const resolveJapaCategory = (input: {
  isSamuhika?: boolean;
  isPersonal?: boolean;
  isChallenge?: boolean;
  kind?: 'idle';
}): JapaNotifyCategory => {
  if (input.isChallenge) {
    return 'Challenge';
  }
  if (input.isSamuhika) {
    return 'Samuhika';
  }
  if (input.kind === 'idle') {
    return 'Daily reminder';
  }
  // Normal + Private → Antharanga Japa
  return 'Antharanga Japa';
};

/** Tray title line: "Mantra name — expires today" (counts in shortLine when relevant). */
const deadlineShortLine = (daysLeft: number) => {
  if (daysLeft <= 0) {
    return 'expires today';
  }
  if (daysLeft === 1) {
    return 'expires tomorrow';
  }
  return `ends in ${daysLeft} days`;
};

/**
 * WhatsApp-style shape:
 * - Header (OS): app name "Japasiddhi - Bilva Patra Trust" + time
 * - Tray title: mantra — shortLine
 * - Tray body: Category — detail
 */
const brandJapaNotification = (
  mantraOrSubject: string,
  category: JapaNotifyCategory,
  shortLine: string,
  detail: string,
) => {
  const subject = String(mantraOrSubject || 'Japa').trim() || 'Japa';
  const cleanShort = String(shortLine || '').trim();
  const cleanDetail = String(detail || '').trim();
  const pushTitle = cleanShort ? `${subject} — ${cleanShort}` : subject;
  const pushBody = `${category} — ${cleanDetail}`;
  return {
    title: BRAND_HEADING,
    message: pushBody,
    pushTitle,
    pushBody,
    mantraName: subject,
    category,
    shortLine: cleanShort,
    detail: cleanDetail,
  };
};

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

  // Inbox row may already exist from an earlier sweep where FCM failed / old APK
  // ignored data-only. Still retry tray push until pushSent is marked.
  const existing = await notificationService.findByAction(
    input.userId,
    input.actionType,
    input.actionId,
  );
  if (existing?.extraData?.pushSent === true) {
    return false;
  }

  let notificationId = existing?.id || 0;
  if (!existing) {
    const created = await notificationService.create({
      userId: input.userId,
      title: input.title,
      message: input.message,
      notificationType: input.notificationType,
      actionType: input.actionType,
      actionId: input.actionId,
      extraData: input.extraData || null,
      expiresAt: input.expiresAt ?? null,
    });
    notificationId = Number(created?.id || 0);
  }

  // Same WhatsApp-style tray popup as admin broadcasts (needs fcm_token).
  try {
    const tokenRows = await mysql.query<any[]>(
      `
      SELECT fcm_token AS fcmToken
      FROM users
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [input.userId],
    );
    const token = String(tokenRows?.[0]?.fcmToken || '').trim();
    if (token) {
      const {sendPushToTokens} = await import(
        '../admin/adminNotification.service'
      );
      const pushTitle =
        String(input.extraData?.pushTitle || existing?.extraData?.pushTitle || '')
          .trim() ||
        String(existing?.title || input.title).trim();
      const pushBody =
        String(input.extraData?.pushBody || existing?.extraData?.pushBody || '')
          .trim() ||
        String(existing?.message || input.message).trim();
      const pushResult = await sendPushToTokens(
        [token],
        pushTitle,
        pushBody,
        input.actionType,
        {
          notificationId: String(notificationId || ''),
          actionType: input.actionType,
          actionId: String(input.actionId ?? ''),
          ...(input.extraData?.mantraName || existing?.extraData?.mantraName
            ? {
                mantraName: String(
                  input.extraData?.mantraName ||
                    existing?.extraData?.mantraName,
                ),
              }
            : {}),
          ...(input.extraData?.category || existing?.extraData?.category
            ? {
                category: String(
                  input.extraData?.category || existing?.extraData?.category,
                ),
              }
            : {}),
        },
      );
      if (notificationId && Number(pushResult?.pushSent || 0) > 0) {
        await notificationService.mergeExtraData(
          notificationId,
          input.userId,
          {pushSent: true, pushSentAt: new Date().toISOString()},
        );
      }
    }
  } catch (error) {
    console.warn('Reminder FCM push failed:', error);
  }

  return !existing;
};

/** End of an IST calendar day — reminders leave the inbox after this. */
const endOfDayStamp = (ymd: string) => `${ymd} 23:59:59`;

/** About one day from now — used after read / for completion notices. */
const plusOneDayStamp = () => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

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
    return `Ends today. Please complete it before the deadline.${progress}`;
  }
  if (daysLeft === 1) {
    return `Ends tomorrow. Please complete your challenge soon.${progress}`;
  }
  return `Ends in ${daysLeft} days. Please complete it before the deadline.${progress}`;
};

const goalDeadlineCopy = (
  _name: string,
  daysLeft: number,
  completed: number,
  target: number,
) => {
  const progress = ` Progress: ${Number(completed).toLocaleString('en-IN')} / ${Number(target).toLocaleString('en-IN')}.`;
  if (daysLeft <= 0) {
    return `Goal ends today. Please finish your goal.${progress}`;
  }
  if (daysLeft === 1) {
    return `Ends tomorrow. Keep chanting to complete it.${progress}`;
  }
  return `Ends in ${daysLeft} days. Please complete your goal.${progress}`;
};

export const notifyDailyGoalCompleted = async (input: {
  userId: number;
  todayCount: number;
  dailyTarget: number;
  goalName?: string;
  goalId?: number;
  mantraId?: number | null;
  personalMantraId?: number | null;
  isSamuhika?: boolean;
}) => {
  const today = todayYmdIst();
  const dayKey = Number(today.replace(/-/g, ''));
  const target = Number(input.dailyTarget || 0);
  const count = Number(input.todayCount || target);
  const name = String(input.goalName || 'Japa').trim() || 'Japa';
  const category = resolveJapaCategory({
    isSamuhika: input.isSamuhika,
    isPersonal: Boolean(input.personalMantraId),
  });
  const copy = brandJapaNotification(
    name,
    category,
    'daily goal completed',
    `Daily goal completed — ${count.toLocaleString('en-IN')} Japas today. Keep up your sadhana!`,
  );
  return notifyOnce({
    userId: input.userId,
    title: copy.title,
    message: copy.message,
    notificationType: 'REWARD',
    actionType: 'DAILY_GOAL_COMPLETED',
    actionId: dayKey,
    extraData: {
      date: today,
      todayCount: count,
      dailyTarget: target,
      goalName: name,
      mantraName: copy.mantraName,
      category: copy.category,
      shortLine: copy.shortLine,
      detail: copy.detail,
      pushTitle: copy.pushTitle,
      pushBody: copy.pushBody,
      goalId: input.goalId || null,
      mantraId: input.mantraId || null,
      personalMantraId: input.personalMantraId || null,
    },
    expiresAt: plusOneDayStamp(),
  });
};

export const notifyGoalCompleted = async (input: {
  userId: number;
  goalId: number;
  goalName?: string;
  completedCount?: number;
  targetCount?: number;
  mantraId?: number | null;
  personalMantraId?: number | null;
  isSamuhika?: boolean;
}) => {
  const name = String(input.goalName || 'Japa').trim() || 'Japa';
  const target = Number(input.targetCount || 0);
  const completed = Number(input.completedCount || target);
  const category = resolveJapaCategory({
    isSamuhika: input.isSamuhika,
    isPersonal: Boolean(input.personalMantraId),
  });
  const copy = brandJapaNotification(
    name,
    category,
    'goal completed',
    `Goal completed. Progress: ${completed.toLocaleString('en-IN')} / ${target.toLocaleString('en-IN')}. Congratulations on your sadhana!`,
  );
  return notifyOnce({
    userId: input.userId,
    title: copy.title,
    message: copy.message,
    notificationType: 'REWARD',
    actionType: 'GOAL_COMPLETED',
    actionId: Number(input.goalId),
    extraData: {
      goalId: input.goalId,
      completedCount: completed,
      targetCount: target,
      mantraId: input.mantraId || null,
      personalMantraId: input.personalMantraId || null,
      mantraName: copy.mantraName,
      category: copy.category,
      shortLine: copy.shortLine,
      detail: copy.detail,
      pushTitle: copy.pushTitle,
      pushBody: copy.pushBody,
    },
    expiresAt: plusOneDayStamp(),
  });
};

export const notifyGoalExpired = async (input: {
  userId: number;
  goalId: number;
  goalName?: string;
  completedCount?: number;
  targetCount?: number;
  mantraId?: number | null;
  personalMantraId?: number | null;
  isSamuhika?: boolean;
}) => {
  const name = String(input.goalName || 'Japa').trim() || 'Japa';
  const completed = Number(input.completedCount || 0);
  const target = Number(input.targetCount || 0);
  const category = resolveJapaCategory({
    isSamuhika: input.isSamuhika,
    isPersonal: Boolean(input.personalMantraId),
  });
  const copy = brandJapaNotification(
    name,
    category,
    'goal expired',
    `Goal expired. Progress: ${completed.toLocaleString('en-IN')} / ${target.toLocaleString('en-IN')}. Set a new goal to continue your sadhana.`,
  );
  return notifyOnce({
    userId: input.userId,
    title: copy.title,
    message: copy.message,
    notificationType: 'JAPA_REMINDER',
    actionType: 'GOAL_EXPIRED',
    actionId: Number(input.goalId),
    extraData: {
      goalId: input.goalId,
      completedCount: completed,
      targetCount: target,
      mantraId: input.mantraId || null,
      personalMantraId: input.personalMantraId || null,
      mantraName: copy.mantraName,
      category: copy.category,
      shortLine: copy.shortLine,
      detail: copy.detail,
      pushTitle: copy.pushTitle,
      pushBody: copy.pushBody,
    },
  });
};

export const notifyChallengeCompleted = async (input: {
  userId: number;
  challengeId: number;
  title?: string;
  currentValue?: number;
  targetValue?: number;
}) => {
  const subject = String(input.title || 'Challenge').trim() || 'Challenge';
  const copy = brandJapaNotification(
    subject,
    'Challenge',
    'challenge completed',
    'Challenge completed. Claim your reward from Challenges.',
  );
  return notifyOnce({
    userId: input.userId,
    title: copy.title,
    message: copy.message,
    notificationType: 'REWARD',
    actionType: 'CHALLENGE_COMPLETED',
    actionId: Number(input.challengeId),
    extraData: {
      challengeId: input.challengeId,
      currentValue: input.currentValue,
      targetValue: input.targetValue,
      mantraName: copy.mantraName,
      category: copy.category,
      shortLine: copy.shortLine,
      detail: copy.detail,
      pushTitle: copy.pushTitle,
      pushBody: copy.pushBody,
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
      const detail = challengeDeadlineCopy(
        String(row.title || 'Challenge'),
        left,
        Number(row.currentValue || 0),
        Number(row.targetValue || 0),
      );
      const subject = String(row.title || 'Challenge').trim() || 'Challenge';
      const branded = brandJapaNotification(
        subject,
        'Challenge',
        deadlineShortLine(left),
        detail,
      );
      const ok = await notifyOnce({
        userId: Number(row.userId),
        title: branded.title,
        message: branded.message,
        notificationType: 'JAPA_REMINDER',
        actionType: 'CHALLENGE_DEADLINE',
        actionId: deadlineActionId(Number(row.challengeId), left),
        extraData: {
          challengeId: Number(row.challengeId),
          daysLeft: left,
          endDate,
          mantraName: branded.mantraName,
          category: branded.category,
          shortLine: branded.shortLine,
          detail: branded.detail,
          pushTitle: branded.pushTitle,
          pushBody: branded.pushBody,
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
        jg.id AS goalId,
        jg.user_id AS userId,
        jg.goal_name AS goalName,
        jg.end_date AS endDate,
        jg.mantra_id AS mantraId,
        jg.personal_mantra_id AS personalMantraId,
        COALESCE(m.mantra_name, upm.mantra_name, jg.goal_name) AS mantraName,
        IFNULL(jg.target_count, 0) AS targetCount,
        IFNULL(jg.completed_count, 0) AS completedCount
      FROM japa_goals jg
      LEFT JOIN mantras m ON m.id = jg.mantra_id
      LEFT JOIN user_personal_mantras upm ON upm.id = jg.personal_mantra_id
      WHERE jg.status = 'ACTIVE'
    `);

    for (const row of goalRows || []) {
      const goalId = Number(row.goalId);
      const userId = Number(row.userId);
      const completed = Number(row.completedCount || 0);
      const target = Number(row.targetCount || 0);
      const goalName = String(row.goalName || 'Japa goal');
      const mantraId = Number(row.mantraId || 0) || null;
      const personalMantraId = Number(row.personalMantraId || 0) || null;
      const mantraName = String(row.mantraName || goalName).trim();
      const mode = personalMantraId ? 'private' : 'community';
      const isSamuhika = String(goalName || '').toLowerCase().includes('samuhika');

      // 1. Completed check
      if (target > 0 && completed >= target) {
        await mysql.query(
          `UPDATE japa_goals SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [goalId],
        );
        const ok = await notifyGoalCompleted({
          userId,
          goalId,
          goalName: mantraName || goalName,
          completedCount: completed,
          targetCount: target,
          mantraId,
          personalMantraId,
          isSamuhika,
        });
        if (ok) {
          created += 1;
        }
        continue;
      }

      // 2. Expired check
      const endDate = toYmd(row.endDate);
      if (!endDate) {
        continue;
      }
      const left = daysUntil(today, endDate);
      if (left != null && left < 0) {
        await mysql.query(
          `UPDATE japa_goals SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [goalId],
        );
        const ok = await notifyGoalExpired({
          userId,
          goalId,
          goalName: mantraName || goalName,
          completedCount: completed,
          targetCount: target,
          mantraId,
          personalMantraId,
          isSamuhika,
        });
        if (ok) {
          created += 1;
        }
        continue;
      }

      // 3. Approaching deadline
      if (left != null && DEADLINE_WINDOWS.includes(left as any)) {
        const detail = goalDeadlineCopy(goalName, left, completed, target);
        const category = resolveJapaCategory({
          isSamuhika,
          isPersonal: Boolean(personalMantraId),
        });
        const branded = brandJapaNotification(
          mantraName || goalName,
          category,
          deadlineShortLine(left),
          detail,
        );
        const ok = await notifyOnce({
          userId,
          title: branded.title,
          message: branded.message,
          notificationType: 'JAPA_REMINDER',
          actionType: 'GOAL_DEADLINE',
          actionId: deadlineActionId(goalId, left),
          extraData: {
            goalId,
            daysLeft: left,
            endDate,
            mantraId,
            personalMantraId,
            mantraName: branded.mantraName,
            category: branded.category,
            shortLine: branded.shortLine,
            detail: branded.detail,
            pushTitle: branded.pushTitle,
            pushBody: branded.pushBody,
            targetCount: target,
            completedCount: completed,
            mode,
          },
          expiresAt: endOfDayStamp(endDate),
        });
        if (ok) {
          created += 1;
        }
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
      const subject = String(row.title || 'Challenge').trim() || 'Challenge';
      const branded = brandJapaNotification(
        subject,
        'Challenge',
        'reward ready to claim',
        'Reward ready to claim. Open Challenges to claim your reward.',
      );
      const ok = await notifyOnce({
        userId: Number(row.userId),
        title: branded.title,
        message: branded.message,
        notificationType: 'REWARD',
        actionType: 'CHALLENGE_REWARD_READY',
        actionId: Number(row.challengeId),
        extraData: {
          challengeId: Number(row.challengeId),
          mantraName: branded.mantraName,
          shortLine: branded.shortLine,
          pushTitle: branded.pushTitle,
          pushBody: branded.pushBody,
          category: branded.category,
          detail: branded.detail,
        },
      });
      if (ok) {
        created += 1;
      }
    }
  } catch (error) {
    console.warn('Challenge reward reminders failed:', error);
  }

  try {
    const isMysql = mysql.getEngineName() === 'mysql';
    const todayCondition = isMysql
      ? `DATE(DATE_ADD(js.created_at, INTERVAL 330 MINUTE)) = DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE))`
      : `DATE(js.created_at, '+5 hours', '30 minutes') = DATE('now', '+5 hours', '30 minutes')`;

    // Check pending daily goal for users with active goals
    const activeGoalUsers = await mysql.query<any[]>(
      `
      SELECT
        jg.id AS goalId,
        jg.user_id AS userId,
        jg.goal_name AS goalName,
        jg.mantra_id AS mantraId,
        jg.personal_mantra_id AS personalMantraId,
        COALESCE(m.mantra_name, upm.mantra_name, jg.goal_name) AS mantraName,
        jg.end_date AS endDate,
        IFNULL(jg.target_count, 0) AS targetCount,
        IFNULL(jg.completed_count, 0) AS completedCount,
        IFNULL(
          (
            SELECT SUM(js.session_count)
            FROM japa_sessions js
            WHERE js.user_id = jg.user_id
              AND (
                js.japa_goal_id = jg.id
                OR (jg.personal_mantra_id IS NOT NULL AND js.personal_mantra_id = jg.personal_mantra_id)
                OR (jg.mantra_id IS NOT NULL AND js.mantra_id = jg.mantra_id)
              )
              AND ${todayCondition}
          ),
          0
        ) AS todayCount
      FROM japa_goals jg
      LEFT JOIN mantras m ON m.id = jg.mantra_id
      LEFT JOIN user_personal_mantras upm ON upm.id = jg.personal_mantra_id
      WHERE jg.status = 'ACTIVE'
      `,
    );

    const dayKey = Number(today.replace(/-/g, ''));
    for (const row of activeGoalUsers || []) {
      const target = Number(row.targetCount || 0);
      const completed = Number(row.completedCount || 0);
      const todayCount = Number(row.todayCount || 0);
      const remainingTotal = Math.max(0, target - completed);
      if (remainingTotal <= 0) {
        continue;
      }

      const endDate = toYmd(row.endDate);
      const remDays = endDate ? Math.max(1, (daysUntil(today, endDate) ?? 0) + 1) : 1;
      const dailyTarget = Math.max(1, Math.ceil(remainingTotal / remDays));

      if (todayCount < dailyTarget) {
        const pending = dailyTarget - todayCount;
        const mantraName = String(row.mantraName || row.goalName || 'Japa').trim();
        const mantraId = Number(row.mantraId || 0) || null;
        const personalMantraId = Number(row.personalMantraId || 0) || null;
        const goalId = Number(row.goalId || 0);
        // One pending reminder per mantra per calendar day (not per goal row).
        const mantraKey =
          personalMantraId && personalMantraId > 0
            ? 100000 + personalMantraId
            : mantraId && mantraId > 0
              ? mantraId
              : goalId;
        const isSamuhika = String(row.goalName || '').toLowerCase().includes('samuhika');
        const isPersonal = Boolean(personalMantraId);
        const category = resolveJapaCategory({isSamuhika, isPersonal});
        const branded = brandJapaNotification(
          mantraName,
          category,
          `${pending.toLocaleString('en-IN')} japas pending today`,
          `You have ${pending.toLocaleString('en-IN')} Japas left for today's goal. Tap to continue chanting.`,
        );

        const ok = await notifyOnce({
          userId: Number(row.userId),
          title: branded.title,
          message: branded.message,
          notificationType: 'JAPA_REMINDER',
          actionType: 'DAILY_JAPA_PENDING',
          actionId: deadlineActionId(mantraKey, dayKey % 1000),
          extraData: {
            goalId,
            mantraId,
            personalMantraId,
            mantraName: branded.mantraName,
            category: branded.category,
            shortLine: branded.shortLine,
            detail: branded.detail,
            pushTitle: branded.pushTitle,
            pushBody: branded.pushBody,
            pendingCount: pending,
            dailyTarget,
            todayCount,
            targetCount: Number(row.targetCount || 0),
            completedCount: Number(row.completedCount || 0),
            mode: isPersonal ? 'private' : 'community',
            date: today,
          },
          expiresAt: endOfDayStamp(today),
        });
        if (ok) {
          created += 1;
        }
      }
    }
  } catch (error) {
    console.warn('Daily pending goal reminders failed:', error);
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
      const branded = brandJapaNotification(
        'Your Japa',
        'Daily reminder',
        'no japas yet today',
        'You have not chanted today. Take a few minutes for your japa practice.',
      );
      const ok = await notifyOnce({
        userId: Number(row.userId),
        title: branded.title,
        message: branded.message,
        notificationType: 'JAPA_REMINDER',
        actionType: 'DAILY_JAPA_REMINDER',
        actionId: dayKey,
        extraData: {
          date: today,
          mantraName: branded.mantraName,
          category: branded.category,
          shortLine: branded.shortLine,
          detail: branded.detail,
          pushTitle: branded.pushTitle,
          pushBody: branded.pushBody,
        },
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
let queueTimer: NodeJS.Timeout | null = null;
let reminderRunning = false;

export const runReminderSweep = async () => {
  if (reminderRunning) {
    return;
  }
  const {isWithinNotificationHoursIST} = await import(
    '../admin/adminNotification.service'
  );
  if (!isWithinNotificationHoursIST()) {
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
  // First sweep shortly after boot, then every 30 minutes for deadlines.
  setTimeout(() => {
    runReminderSweep().catch(() => undefined);
  }, 15_000);
  reminderTimer = setInterval(() => {
    runReminderSweep().catch(() => undefined);
  }, 30 * 60 * 1000);
  if (typeof reminderTimer.unref === 'function') {
    reminderTimer.unref();
  }

  // Admin "Later" queue needs a tighter poll so scheduled pushes fire on time.
  if (!queueTimer) {
    queueTimer = setInterval(() => {
      import('../admin/adminNotification.service')
        .then(({flushDueAdminNotifications}) =>
          flushDueAdminNotifications(),
        )
        .catch(() => undefined);
    }, 60 * 1000);
    if (typeof queueTimer.unref === 'function') {
      queueTimer.unref();
    }
  }
};
