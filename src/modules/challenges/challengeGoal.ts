/** Session / chant goal for a challenge = full target (not a daily chunk). */
export const sessionGoalForChallenge = (item: any) => {
  const target = Math.max(1, Number(item?.targetValue || 108));
  return target;
};

export const challengeCurrentCount = (item: any) =>
  Math.max(0, Number(item?.currentValue || 0));

export const challengeRemaining = (item: any) => {
  const target = sessionGoalForChallenge(item);
  const current = challengeCurrentCount(item);
  return Math.max(0, target - current);
};
