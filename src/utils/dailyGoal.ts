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
