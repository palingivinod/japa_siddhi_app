export const SPIRITUAL_MILESTONES = [
  {target: 2498, title: 'Praramba Diksha', key: 'prarambaDiksha'},
  {target: 10000, title: 'Yogam', key: 'yogam'},
  {target: 30000, title: 'Siddhi Yogam', key: 'siddhiYogam'},
  {target: 50000, title: 'Maha Siddhi Yogam', key: 'mahaSiddhiYogam'},
  {target: 75000, title: 'Ati Siddhi Yogam', key: 'atiSiddhiYogam'},
  {target: 100000, title: 'Parma Siddhi Yogam', key: 'parmaSiddhiYogam'},
] as const;

export type SpiritualMilestone = (typeof SPIRITUAL_MILESTONES)[number];

export const milestoneByTarget = (target: number) =>
  SPIRITUAL_MILESTONES.find(item => item.target === target) || null;

export const buildMilestoneProgress = (totalRaw: number) => {
  const total = Math.max(0, Number(totalRaw) || 0);
  const achieved = SPIRITUAL_MILESTONES.filter(item => total >= item.target);
  const upcoming = SPIRITUAL_MILESTONES.filter(item => total < item.target);
  const latest = achieved[achieved.length - 1] || null;
  const next = upcoming[0] || null;
  const previousTarget = latest?.target || 0;
  const nextTarget = next?.target || latest?.target || SPIRITUAL_MILESTONES[0].target;
  const span = Math.max(nextTarget - previousTarget, 1);
  const gained = Math.max(total - previousTarget, 0);
  const percent = next
    ? Math.min(100, Math.round((gained / span) * 100))
    : 100;

  return {
    total,
    latest: latest?.target || 0,
    latestTitle: latest?.title || null,
    next: nextTarget,
    nextTitle: next?.title || latest?.title || null,
    progressCurrent: total,
    progressTarget: nextTarget,
    progressPercent: percent,
    remaining: next ? Math.max(nextTarget - total, 0) : 0,
    allComplete: !next,
    achieved: achieved.map(item => ({
      target: item.target,
      title: item.title,
      key: item.key,
      subtitle: `Reached ${item.target.toLocaleString()} Japas`,
    })),
    upcoming: upcoming.map(item => ({
      target: item.target,
      title: item.title,
      key: item.key,
      subtitle: `Reach ${item.target.toLocaleString()} Japas`,
    })),
    levels: SPIRITUAL_MILESTONES.map(item => ({
      target: item.target,
      title: item.title,
      key: item.key,
      reached: total >= item.target,
    })),
  };
};
