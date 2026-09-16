import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFTS_KEY = 'japa_goal_drafts';
const LEGACY_KEY = 'japa_goal_draft';

export type JapaDraft = {
  mode: 'private' | 'community';
  mantraId?: number;
  personalMantraId?: number;
  privateMantra?: string;
  goal: number;
  count: number;
  postedCount: number;
  japaGoalId?: number;
  challengeId?: number;
  updatedAt?: number;
};

type DraftMap = Record<string, JapaDraft>;

/** Own mantras keep their own key space so ids never clash with presets. */
export const draftKey = (
  mode: string,
  mantraId?: number,
  challengeId?: number,
  personalMantraId?: number,
) => {
  if (Number(challengeId) > 0) {
    return `challenge:${Number(challengeId)}`;
  }
  if (Number(personalMantraId) > 0) {
    return `${mode}:own:${Number(personalMantraId)}`;
  }
  return `${mode}:${Number(mantraId || 0)}`;
};

const isActive = (draft?: JapaDraft | null) => {
  const count = Number(draft?.count || 0);
  const goal = Number(draft?.goal || 0);
  return count > 0 && goal > 0 && count < goal;
};

const normalize = (draft: JapaDraft): JapaDraft => ({
  ...draft,
  count: Number(draft.count || 0),
  goal: Number(draft.goal || 0),
  postedCount: Number(draft.postedCount || 0),
  mantraId: Number(draft.mantraId || 0) || undefined,
  personalMantraId: Number(draft.personalMantraId || 0) || undefined,
  challengeId: Number(draft.challengeId || 0) || undefined,
});

const readMap = async (): Promise<DraftMap> => {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    if (raw) {
      return JSON.parse(raw) as DraftMap;
    }
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacy) {
      return {};
    }
    const draft = normalize(JSON.parse(legacy) as JapaDraft);
    const map = isActive(draft)
      ? {
          [draftKey(
            draft.mode,
            draft.mantraId,
            draft.challengeId,
            draft.personalMantraId,
          )]: draft,
        }
      : {};
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(map));
    await AsyncStorage.removeItem(LEGACY_KEY);
    return map;
  } catch {
    return {};
  }
};

const writeMap = async (map: DraftMap) => {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(map));
};

export const getJapaDraft = async (
  mode?: string,
  mantraId?: number,
  challengeId?: number,
  personalMantraId?: number,
): Promise<JapaDraft | null> => {
  const map = await readMap();
  if (Number(challengeId) > 0) {
    const match =
      map[
        draftKey(mode || 'community', mantraId, challengeId, personalMantraId)
      ];
    return isActive(match) ? normalize(match) : null;
  }
  if (mode) {
    const match = map[draftKey(mode, mantraId, undefined, personalMantraId)];
    return isActive(match) && !match.challengeId ? normalize(match) : null;
  }
  // Antaranga / normal japa resume only — never mix challenge drafts.
  const latest = Object.values(map)
    .filter(item => isActive(item) && !Number(item.challengeId || 0))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0];
  return latest ? normalize(latest) : null;
};

export const saveJapaDraft = async (draft: JapaDraft) => {
  const next = normalize({...draft, updatedAt: Date.now()});
  const map = await readMap();
  const key = draftKey(
    next.mode,
    next.mantraId,
    next.challengeId,
    next.personalMantraId,
  );
  if (!isActive(next)) {
    delete map[key];
  } else {
    map[key] = next;
  }
  await writeMap(map);
};

export const clearJapaDraft = async (
  mode?: string,
  mantraId?: number,
  challengeId?: number,
  personalMantraId?: number,
) => {
  if (!mode && !challengeId) {
    await AsyncStorage.removeItem(DRAFTS_KEY);
    await AsyncStorage.removeItem(LEGACY_KEY);
    return;
  }
  const map = await readMap();
  delete map[
    draftKey(mode || 'community', mantraId, challengeId, personalMantraId)
  ];
  await writeMap(map);
};
