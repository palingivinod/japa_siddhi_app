/** Calendar days left including today (IST-local device date). */
export function calcDaysRemaining(endDateStr?: string | null): number {
  if (!endDateStr) {
    return 999;
  }
  const match = String(endDateStr)
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return 999;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  end.setHours(0, 0, 0, 0);
  const diffDays =
    Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Dynamic daily target from remaining japas ÷ remaining days.
 * Matches reminder cron: ceil(remaining / remDays).
 */
export function computeEffectiveDailyTarget(opts: {
  remainingCount: number;
  remainingDays?: number;
  endDate?: string | null;
}): number {
  const remaining = Math.max(0, Number(opts.remainingCount) || 0);
  if (remaining <= 0) {
    return 0;
  }
  const days = Math.max(
    1,
    Number(opts.remainingDays) || calcDaysRemaining(opts.endDate) || 1,
  );
  if (days <= 1) {
    return remaining;
  }
  const dayDivisor = days >= 900 ? 30 : days;
  return Math.max(1, Math.ceil(remaining / dayDivisor));
}

const asDate = (value?: string | null) => {
  const match = String(value || '')
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Inclusive days from one calendar date through the goal end date. */
export function daysFromDate(fromDate?: string | null, endDate?: string | null) {
  const from = asDate(fromDate);
  const end = asDate(endDate);
  if (!from || !end) {
    return 999;
  }
  const diffDays =
    Math.round((end.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Plan that was in force at the start of today.
 * Japas already done today are put back, so chanting more does not
 * change today's number. Tomorrow uses whatever is still left.
 */
export function dailyPlanForToday(opts: {
  remainingNow: number;
  doneToday: number;
  endDate?: string | null;
  remainingDays?: number;
}) {
  return computeEffectiveDailyTarget({
    remainingCount:
      Math.max(0, Number(opts.remainingNow) || 0) +
      Math.max(0, Number(opts.doneToday) || 0),
    remainingDays: opts.remainingDays,
    endDate: opts.endDate,
  });
}

/**
 * Daily plan at the start of each listed day.
 * Each day is judged by the japas still left that morning, so a day that
 * met its plan stays completed when a later day raises the plan.
 */
export function dailyPlansForDays(
  days: Array<{day: string; count: number}>,
  opts: {target: number; completed: number; endDate?: string | null},
) {
  const sorted = [...days].sort((a, b) =>
    String(a.day).localeCompare(String(b.day)),
  );
  const weekSum = sorted.reduce(
    (sum, item) => sum + (Number(item.count) || 0),
    0,
  );
  let done = Math.max(0, (Number(opts.completed) || 0) - weekSum);
  const target = Math.max(0, Number(opts.target) || 0);
  const plans: Record<string, number> = {};
  sorted.forEach(item => {
    plans[String(item.day).slice(0, 10)] = computeEffectiveDailyTarget({
      remainingCount: Math.max(0, target - done),
      remainingDays: daysFromDate(item.day, opts.endDate),
    });
    done += Number(item.count) || 0;
  });
  return plans;
}
