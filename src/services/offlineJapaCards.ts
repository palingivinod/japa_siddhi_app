import AsyncStorage from '@react-native-async-storage/async-storage';

import {userScopedKey} from './session';

/**
 * Read-only copy of the Your Japas list (goals + joined challenges) from the last
 * successful load. It is only used to DISPLAY cards when there is no internet.
 * It never feeds japa counts, savings, chant, deadline or delete actions.
 *
 * The base key must match the one listed in session.ts clearSession().
 */
const BASE_KEY = 'japa_cards_offline_v1';

export type OfflineJapaCards = {
  goals?: any[];
  goalsSavedAt?: number;
  challenges?: any[];
  challengesSavedAt?: number;
};

export const readOfflineJapaCards = async (): Promise<OfflineJapaCards | null> => {
  try {
    const key = await userScopedKey(BASE_KEY);
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as OfflineJapaCards) : null;
  } catch {
    return null;
  }
};

/** Saves one part (goals or challenges) after a successful server response. */
export const saveOfflineJapaCards = async (
  part: {goals: any[]} | {challenges: any[]},
) => {
  try {
    const key = await userScopedKey(BASE_KEY);
    const raw = await AsyncStorage.getItem(key);
    const current: OfflineJapaCards =
      raw && typeof JSON.parse(raw) === 'object' ? JSON.parse(raw) : {};
    const now = Date.now();
    const next: OfflineJapaCards =
      'goals' in part
        ? {...current, goals: part.goals, goalsSavedAt: now}
        : {...current, challenges: part.challenges, challengesSavedAt: now};
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Saving the offline copy must never break the live screen.
  }
};

/** "24 Nov, 3:10 pm" in India time, for the offline banner. */
export const formatSavedAt = (savedAt: number) =>
  new Date(savedAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
