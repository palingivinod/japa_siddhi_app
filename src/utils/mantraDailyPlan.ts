import AsyncStorage from '@react-native-async-storage/async-storage';

import {istIsoDate, shiftIsoDate} from './dateUtils';
import {calcDaysRemaining} from './dailyGoal';

const STORAGE_KEY = 'japa_mantra_daily_plan_v1';

export type DailyPlanSnap = {
  date: string;
  target: number;
  counted: number;
};

type SnapMap = Record<string, DailyPlanSnap>;

const morningTarget = (atStart: number, days: number) => {
  if (atStart <= 0) {
    return 0;
  }
  if (days <= 1) {
    return atStart;
  }
  const divisor = days >= 900 ? 30 : days;
  return Math.max(1, Math.ceil(atStart / divisor));
};

const capToRemaining = (target: number, atStart: number) => {
  if (atStart <= 0) {
    return 0;
  }
  const next = Math.max(1, Math.round(Number(target) || 0));
  return Math.min(next, atStart);
};

/**
 * Today's daily goal for one mantra.
 * The number stays for the Indian day. After midnight, an exact day keeps
 * the same number. A short day or an extra day divides what is still left.
 */
export function resolveMantraDailyTarget(opts: {
  today?: string;
  endDate?: string | null;
  remainingNow: number;
  doneToday: number;
  serverTarget?: number;
  serverPlanDate?: string | null;
  saved?: DailyPlanSnap | null;
}) {
  const today = opts.today || istIsoDate();
  const doneToday = Math.max(0, Number(opts.doneToday) || 0);
  const remainingNow = Math.max(0, Number(opts.remainingNow) || 0);
  const atStart = remainingNow + doneToday;
  const days = calcDaysRemaining(opts.endDate, today);
  const divided = morningTarget(atStart, days);
  const serverDate = String(opts.serverPlanDate || '').slice(0, 10);

  if (serverDate === today) {
    const target = capToRemaining(Number(opts.serverTarget) || divided, atStart);
    return {
      target,
      snap: {date: today, target, counted: doneToday} as DailyPlanSnap,
    };
  }

  const saved = opts.saved;
  let target = divided;
  if (saved && saved.date === today && saved.target > 0) {
    target = capToRemaining(saved.target, atStart);
  } else if (
    saved &&
    saved.target > 0 &&
    saved.counted === saved.target &&
    shiftIsoDate(saved.date, 1) === today
  ) {
    target = capToRemaining(saved.target, atStart);
  }

  return {
    target,
    snap: {date: today, target, counted: doneToday} as DailyPlanSnap,
  };
}

export function pickMantraGoal(
  goals: any[],
  opts: {goalId?: number; personalMantraId?: number; mantraId?: number},
) {
  const list = Array.isArray(goals) ? goals : [];
  const goalId = Number(opts.goalId || 0);
  const personalId = Number(opts.personalMantraId || 0);
  const mantraId = Number(opts.mantraId || 0);
  const active = (goal: any) =>
    String(goal?.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
  const belongs = (goal: any) => {
    const goalPersonal = Number(goal?.personalMantraId || goal?.personal_mantra_id || 0);
    const goalMantra = Number(goal?.mantraId || goal?.mantra_id || 0);
    if (personalId) {
      return goalPersonal === personalId;
    }
    if (mantraId) {
      return goalMantra === mantraId && !goalPersonal;
    }
    return false;
  };

  if (goalId) {
    const exact = list.find(
      goal => Number(goal?.id || 0) === goalId && active(goal) && (belongs(goal) || (!personalId && !mantraId)),
    );
    if (exact) {
      return exact;
    }
  }
  return list.find(goal => active(goal) && belongs(goal)) || null;
}

export async function readDailyPlanSnaps(): Promise<SnapMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeDailyPlanSnap(goalId: number, snap: DailyPlanSnap) {
  const id = Number(goalId || 0);
  if (!id || !snap?.date || !(snap.target >= 0)) {
    return;
  }
  try {
    const all = await readDailyPlanSnaps();
    all[String(id)] = snap;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // The screen can still show the number for this visit.
  }
}
