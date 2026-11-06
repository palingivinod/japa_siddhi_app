import AsyncStorage from '@react-native-async-storage/async-storage';

import {MARAKATA_SHIVLING_EXTRA_JAPAS} from './rewardContent';

/** Sentinel milestone_target for Marakata Shivling relative claims (not a real japa count). */
export const MARAKATA_SHIVLING_CLAIM_TARGET = 900003;

export const MARAKATA_SHIVLING_REWARD_NAME =
  'Marakata Shivling (Green Aventurine)';

const storageKey = (userId: string | number) =>
  `marakata_shivling_unlock_${userId || 'anon'}`;

/** Lock present+3000 the first time this devotee sees the reward. */
export const resolveMarakataUnlockTarget = async (
  userId: string | number,
  presentCount: number,
  serverTarget?: number,
): Promise<number> => {
  if (typeof serverTarget === 'number' && serverTarget > 0) {
    await AsyncStorage.setItem(storageKey(userId), String(serverTarget));
    return serverTarget;
  }
  const key = storageKey(userId);
  const existing = await AsyncStorage.getItem(key);
  if (existing) {
    const locked = Number(existing);
    if (locked > 0) {
      return locked;
    }
  }
  const target =
    Math.max(0, Number(presentCount) || 0) + MARAKATA_SHIVLING_EXTRA_JAPAS;
  await AsyncStorage.setItem(key, String(target));
  return target;
};
