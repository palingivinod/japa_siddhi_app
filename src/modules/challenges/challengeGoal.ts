export const sessionGoalForChallenge = (item: any) => {
  const target = Number(item?.targetValue || 108);
  const current = Number(item?.currentValue || 0);
  const remaining = Math.max(1, target - current);
  const title = String(item?.title || '');
  if (/\b108\b/.test(title) || target === 108) {
    return Math.min(108, remaining);
  }
  const days = Number(item?.durationDays || 1);
  const daily = days > 1 ? Math.ceil(target / days) : target;
  return Math.min(remaining, daily);
};
