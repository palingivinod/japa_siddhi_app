import {MARAKATA_SHIVLING_JAPAS} from './rewardContent';

/** Sentinel milestone_target for Marakata Shivling claims (not a real japa count). */
export const MARAKATA_SHIVLING_CLAIM_TARGET = 900003;

export const MARAKATA_SHIVLING_REWARD_NAME =
  'Marakata Shivling (Green Aventurine)';

/** Absolute 8,000 unlock — ignores old present+ baselines. */
export const resolveMarakataUnlockTarget = async (
  _userId: string | number,
  _presentCount: number,
  serverTarget?: number,
): Promise<number> => {
  if (typeof serverTarget === 'number' && serverTarget > 0) {
    // Prefer canonical 8k when server still returns a relative/old target.
    if (serverTarget === MARAKATA_SHIVLING_JAPAS) {
      return MARAKATA_SHIVLING_JAPAS;
    }
    // If server already healed to 8k absolute, use it; otherwise force 8k.
    return MARAKATA_SHIVLING_JAPAS;
  }
  return MARAKATA_SHIVLING_JAPAS;
};
