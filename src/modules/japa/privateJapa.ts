export type PrivateJapaGoal = {
  id: number;
  goalName?: string;
  mantraType?: string;
  mantraId?: number | null;
  personalMantraId?: number | null;
  mantraName?: string | null;
  notes?: string | null;
  targetCount?: number;
  completedCount?: number;
  remainingCount?: number;
  dailyTarget?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
};

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
};

const isoDate = (value?: string | Date | null) => {
  if (!value) {
    return '';
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
};

const daySpan = (start?: string | null, end?: string | null) => {
  const from = isoDate(start);
  const to = isoDate(end);
  if (!from || !to) {
    return 0;
  }
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

export const isPersonalGoal = (item?: PrivateJapaGoal | null) =>
  String(item?.mantraType || '').toUpperCase() === 'PERSONAL';

export const isDateExpired = (item?: PrivateJapaGoal | null) => {
  if (!item) {
    return false;
  }
  const end = isoDate(item.endDate);
  if (!end) {
    return false;
  }
  // Count-only goals use a short 1-day window; they stay open until the count is done.
  if (daySpan(item.startDate, item.endDate) <= 1) {
    return false;
  }
  return end < todayIso();
};

export const isCountComplete = (item?: PrivateJapaGoal | null) => {
  if (!item) {
    return false;
  }
  const status = String(item.status || '').toUpperCase();
  if (status === 'COMPLETED') {
    return true;
  }
  const target = Number(item.targetCount || 0);
  const completed = Number(item.completedCount || 0);
  const remaining = Number(
    item.remainingCount ?? (target > 0 ? target - completed : 0),
  );
  return target > 0 && (remaining <= 0 || completed >= target);
};

export const isOpenPrivateGoal = (item?: PrivateJapaGoal | null) => {
  if (!isPersonalGoal(item)) {
    return false;
  }
  const status = String(item?.status || '').toUpperCase();
  if (status === 'CANCELLED' || status === 'COMPLETED') {
    return false;
  }
  return !isCountComplete(item) && !isDateExpired(item);
};

export const normalizeMantra = (value?: string | null) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const privateMantraLabel = (item?: PrivateJapaGoal | null) => {
  const name = String(item?.mantraName || '').trim();
  if (name && name.toLowerCase() !== 'private japa') {
    return name;
  }
  const notes = String(item?.notes || '').trim();
  if (notes) {
    return notes;
  }
  return 'Private Japa';
};

export const formatGoalDate = (value?: string | Date | null) => {
  const iso = isoDate(value);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return '';
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
};

export const hasDateGoal = (item?: PrivateJapaGoal | null) =>
  daySpan(item?.startDate, item?.endDate) > 1;

export const chantParamsFromPrivateGoal = (goal: PrivateJapaGoal) => {
  const target = Math.max(1, Number(goal.targetCount || 0) || 1008);
  const completed = Math.max(0, Number(goal.completedCount || 0));
  const dated = hasDateGoal(goal);
  return {
    mode: 'private' as const,
    privateMantra: privateMantraLabel(goal),
    personalMantraId: Number(goal.personalMantraId || 0) || undefined,
    japaGoalId: Number(goal.id),
    goal: target,
    initialCount: Math.min(completed, target),
    resume: completed > 0 && completed < target,
    goalType: dated ? 'date' : 'count',
    endDate: dated ? formatGoalDate(goal.endDate) : undefined,
    dailyTarget: Number(goal.dailyTarget || 0) || undefined,
    durationMs: 2500,
  };
};

export const findOpenPrivateGoalByMantra = (
  goals: PrivateJapaGoal[],
  mantra?: string,
) => {
  const needle = normalizeMantra(mantra);
  if (!needle) {
    return undefined;
  }
  return goals.find(
    item =>
      isOpenPrivateGoal(item) &&
      normalizeMantra(privateMantraLabel(item)) === needle,
  );
};
