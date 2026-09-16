import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import {
  clearJapaDraft,
  getJapaDraft,
  saveJapaDraft,
} from '../../services/japaDraft';
import Colors from '../../theme/colors';
import {formMessageColor} from '../../theme/formMessage';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';

interface Mantra {
  id: number;
  mantraName: string;
  deityName: string;
  transliteration: string;
  defaultJapaCount: number;
}

/** A chip in the count screen: either a listed mantra or the user's own. */
interface ChantMantra {
  key: string;
  id: number;
  name: string;
  own: boolean;
}

const presetChip = (item: Mantra): ChantMantra => ({
  key: `preset:${item.id}`,
  id: item.id,
  name: item.mantraName || item.transliteration,
  own: false,
});

const ownChip = (id: number, name: string): ChantMantra => ({
  key: `own:${id}`,
  id,
  name,
  own: true,
});

const ChantScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const mode = route.params?.mode === 'private' ? 'private' : 'community';
  const [mantras, setMantras] = useState<ChantMantra[]>([]);
  const [selected, setSelected] = useState<ChantMantra | null>(null);
  const [savedTotal, setSavedTotal] = useState(0);
  const [mantraTotals, setMantraTotals] = useState<Record<number, number>>({});
  const [personalTotals, setPersonalTotals] = useState<Record<number, number>>(
    {},
  );
  const [count, setCount] = useState(0);
  const [goal, setGoal] = useState(Number(route.params?.goal ?? 2000) || 2000);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [challengeMantra, setChallengeMantra] = useState(
    String(route.params?.challengeMantra || '').trim(),
  );
  const ownMantra = String(route.params?.privateMantra || '').trim();
  const personalMantraId =
    Number(route.params?.personalMantraId || 0) || undefined;
  const lastTap = useRef(0);
  const intervals = useRef<number[]>([]);
  const countRef = useRef(0);
  const goalRef = useRef(goal);
  const postedCountRef = useRef(0);
  const selectedRef = useRef<ChantMantra | null>(null);
  const completingRef = useRef(false);
  const challengeId = Number(route.params?.challengeId || 0);

  countRef.current = count;
  goalRef.current = goal;
  selectedRef.current = selected;
  const goalReached = count >= goal && goal > 0;

  const applyMantraTotals = (rows: any[]) => {
    const next: Record<number, number> = {};
    const personal: Record<number, number> = {};
    (rows || []).forEach(item => {
      const ownId = Number(item.personalMantraId || 0);
      if (ownId) {
        personal[ownId] = Number(item.total || 0);
        return;
      }
      next[Number(item.mantraId || 0)] = Number(item.total || 0);
    });
    setMantraTotals(next);
    setPersonalTotals(personal);
    return {presets: next, personal};
  };

  const applyDraftToCount = (draft: {
    count: number;
    postedCount: number;
    goal: number;
  }) => {
    setGoal(draft.goal);
    setCount(draft.count);
    countRef.current = draft.count;
    postedCountRef.current = Math.min(draft.postedCount, draft.count);
  };

  const resetSessionCount = () => {
    setCount(0);
    countRef.current = 0;
    postedCountRef.current = 0;
  };

  const load = async () => {
    setLoading(true);
    setError('');
    setRawError(null);
    try {
      const [mantraResponse, summaryResponse, ownResponse] = await Promise.all([
        apiService.get('/mantras'),
        apiService.get('/japa/summary'),
        apiService.get('/personal-mantras').catch(() => null),
      ]);
      const presets: Mantra[] = mantraResponse.data.data ?? [];
      const ownRows: any[] = ownResponse?.data?.data ?? [];

      // The user's own mantras sit in the same list as the listed ones.
      const items: ChantMantra[] = [
        ...presets.map(presetChip),
        ...ownRows
          .filter(row => Number(row?.id || 0) > 0)
          .map(row => ownChip(Number(row.id), String(row.mantraName || ''))),
      ];
      if (ownMantra && !items.some(item => item.own && item.name === ownMantra)) {
        items.push(ownChip(Number(personalMantraId || 0), ownMantra));
      }
      setMantras(items);

      const preferredId = Number(route.params?.mantraId || 0);
      const preferred =
        (ownMantra &&
          items.find(item => item.own && item.name === ownMantra)) ||
        (personalMantraId &&
          items.find(item => item.own && item.id === personalMantraId)) ||
        (preferredId &&
          items.find(item => !item.own && item.id === preferredId)) ||
        items.find(item => !item.own) ||
        items[0] ||
        null;
      setSelected(current => current ?? preferred);
      const data = summaryResponse.data.data ?? {};
      const {presets: totals, personal} = applyMantraTotals(
        data.byMantra || [],
      );
      let initialCount = Number(route.params?.initialCount || 0);
      let paramGoal = Number(route.params?.goal ?? data.dailyTarget ?? 2000) || 2000;

      // Challenge japa uses its own target/progress — never Antharanga draft/goal.
      if (challengeId) {
        try {
          const challengeResponse = await apiService.get(
            `/challenges/${challengeId}`,
          );
          const challenge = challengeResponse.data?.data || {};
          paramGoal = Math.max(
            1,
            Number(challenge.targetValue || paramGoal) || paramGoal,
          );
          initialCount = Math.max(
            0,
            Number(challenge.currentValue || initialCount) || 0,
          );
          const mantra =
            String(challenge.mantra || '').trim() ||
            String(challenge.rewardName || '')
              .replace(/\s*Certificate$/i, '')
              .trim();
          if (mantra && mantra.toLowerCase() !== 'certificate') {
            setChallengeMantra(mantra);
          }
        } catch {
          // Fall back to route params.
        }
      }

      const presetDraftId = preferred?.own ? undefined : preferred?.id;
      const ownDraftId = preferred?.own ? preferred.id : undefined;
      const resumeDraft = challengeId
        ? await getJapaDraft(mode, presetDraftId, challengeId, ownDraftId)
        : route.params?.resume
          ? await getJapaDraft()
          : await getJapaDraft(mode, presetDraftId, undefined, ownDraftId);
      const restore =
        !!resumeDraft &&
        resumeDraft.count > 0 &&
        resumeDraft.count < resumeDraft.goal &&
        (challengeId
          ? Number(resumeDraft.challengeId || 0) === challengeId
          : !resumeDraft.challengeId &&
            (route.params?.resume || resumeDraft.mode === mode));
      let active = preferred;
      if (restore && resumeDraft) {
        const draftMatch = resumeDraft.personalMantraId
          ? items.find(
              item => item.own && item.id === resumeDraft.personalMantraId,
            )
          : resumeDraft.mantraId
            ? items.find(
                item => !item.own && item.id === resumeDraft.mantraId,
              )
            : null;
        if (draftMatch) {
          active = draftMatch;
          setSelected(draftMatch);
        }
        applyDraftToCount(resumeDraft);
      } else if (challengeId) {
        applyDraftToCount({
          count: Math.min(initialCount, paramGoal),
          postedCount: Math.min(initialCount, paramGoal),
          goal: paramGoal,
        });
        completingRef.current = false;
      } else if (
        initialCount > 0 &&
        paramGoal > initialCount &&
        route.params?.resume
      ) {
        applyDraftToCount({
          count: initialCount,
          postedCount: initialCount,
          goal: paramGoal,
        });
        completingRef.current = false;
      } else {
        setGoal(paramGoal);
        completingRef.current = false;
      }
      setSavedTotal(
        active?.own
          ? personal[active.id] || 0
          : totals[Number(active?.id || 0)] || 0,
      );
    } catch (err: any) {
      setRawError(err);
      setError(getApiError(err, 'Could not load mantras from the API.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setMessage('');
    }, []),
  );

  /** Draft ids: presets keyed by mantraId, own mantras by personalMantraId. */
  const draftIds = (chip?: ChantMantra | null) => ({
    mantraId: chip && !chip.own ? chip.id : undefined,
    personalMantraId: chip?.own ? chip.id : undefined,
  });

  const persistDraft = async (nextCount: number, postedCount: number) => {
    const chip = selectedRef.current;
    await saveJapaDraft({
      mode,
      ...draftIds(chip),
      privateMantra: chip?.own ? chip.name : route.params?.privateMantra,
      goal: goalRef.current,
      count: nextCount,
      postedCount,
      japaGoalId: challengeId ? undefined : route.params?.japaGoalId,
      challengeId: challengeId || undefined,
    });
  };

  const clearDraftFor = async (chip?: ChantMantra | null) => {
    const ids = draftIds(chip);
    await clearJapaDraft(
      mode,
      ids.mantraId,
      challengeId || undefined,
      ids.personalMantraId,
    );
  };

  const selectMantra = async (item: ChantMantra) => {
    if (selectedRef.current?.key === item.key) {
      return;
    }
    if (countRef.current > 0) {
      await persistDraft(countRef.current, postedCountRef.current);
    }
    setSelected(item);
    selectedRef.current = item;
    setSavedTotal(
      (item.own ? personalTotals[item.id] : mantraTotals[item.id]) || 0,
    );
    const ids = draftIds(item);
    const draft = await getJapaDraft(
      mode,
      ids.mantraId,
      challengeId || undefined,
      ids.personalMantraId,
    );
    if (draft) {
      applyDraftToCount(draft);
    } else {
      resetSessionCount();
    }
  };

  const afterSessionSaved = (
    data: any,
    fallbackCount: number,
    options?: {completed?: boolean; resetCount?: boolean},
  ) => {
    const userTotal = Number(data?.userTotal ?? savedTotal + fallbackCount);
    const savedCount = Number(data?.count ?? fallbackCount);
    const reached = (data?.milestonesReached || []).filter(
      (level: unknown) => Number(level) > 0,
    );
    const chip = selectedRef.current;
    const chipId = Number(chip?.id || 0);
    const added = Number(fallbackCount || 0);
    const bump = (prev: Record<number, number>) => {
      const nextTotal = Number(prev[chipId] || savedTotal || 0) + added;
      setSavedTotal(nextTotal);
      return chipId ? {...prev, [chipId]: nextTotal} : prev;
    };
    if (chip?.own) {
      setPersonalTotals(bump);
    } else {
      setMantraTotals(bump);
    }
    if (options?.resetCount) {
      setCount(0);
      countRef.current = 0;
    }
    setMessage(`Saved ${savedCount.toLocaleString()} japas to your account.`);
    const goProgress = () =>
      navigation.navigate('JapaProgress', {
        count: userTotal,
        goal,
        sessionCount: savedCount,
        completed: options?.completed,
      });
    const goGoalComplete = () =>
      navigation.replace('JapaGoalComplete', {
        count: Math.max(savedCount, countRef.current, goal),
        goal: goalRef.current,
        mode,
        mantraId: chip?.own ? undefined : chip?.id,
        privateMantra: chip?.own ? chip.name : route.params?.privateMantra,
        personalMantraId: chip?.own ? chip.id : undefined,
        japaGoalId: route.params?.japaGoalId,
        userTotal,
      });
    if (challengeId) {
      const update = (data?.challengeUpdates || []).find(
        (row: any) => Number(row.challengeId) === challengeId,
      );
      const challengeDone =
        Boolean(update?.completed) ||
        (options?.completed && countRef.current >= goalRef.current);
      if (challengeDone) {
        navigation.replace('ChallengeComplete', {
          id: challengeId,
          count: Number(update?.currentValue || countRef.current || goal),
          goal: goalRef.current,
          mode,
          mantraId: chip?.own ? undefined : chip?.id,
          privateMantra: route.params?.privateMantra,
        });
        return;
      }
      navigation.replace('ChallengeProgress', {id: challengeId});
      return;
    }
    if (options?.completed) {
      if (reached.length) {
        const highest = Math.max(
          ...reached.map((level: number) => Number(level)),
        );
        Alert.alert(
          t('milestoneReachedTitle'),
          t('milestoneReachedBody', {count: highest.toLocaleString()}),
          [
            {text: t('ok'), style: 'cancel', onPress: goGoalComplete},
            {
              text: t('viewMilestone'),
              onPress: () => navigation.navigate('MilestoneNotifications'),
            },
          ],
        );
        return;
      }
      goGoalComplete();
      return;
    }
    if (reached.length) {
      const highest = Math.max(...reached.map((level: number) => Number(level)));
      Alert.alert(
        t('milestoneReachedTitle'),
        t('milestoneReachedBody', {count: highest.toLocaleString()}),
        [
          {text: t('ok'), style: 'cancel', onPress: goProgress},
          {
            text: t('viewMilestone'),
            onPress: () => navigation.navigate('MilestoneNotifications'),
          },
        ],
      );
      return;
    }
    goProgress();
  };

  const sessionRemarks = () => {
    if (challengeId) {
      return `Challenge:${challengeId}`;
    }
    const chip = selectedRef.current;
    if (chip?.own) {
      return `My Japa · ${chip.name.slice(0, 80)}`;
    }
    return undefined;
  };

  /** Own-mantra japa is stored as PERSONAL; listed mantras stay DEFAULT. */
  const sessionMantraFields = () => {
    const chip = selectedRef.current;
    return chip?.own
      ? {mantraType: 'PERSONAL' as const, personalMantraId: chip.id}
      : {mantraType: 'DEFAULT' as const, mantraId: chip?.id};
  };

  const finishGoal = async (sessionCount: number) => {
    if (completingRef.current || sessionCount < 1) {
      return;
    }
    completingRef.current = true;
    setSaving(true);
    setMessage('Goal reached. Saving your session...');
    try {
      if (!selected) {
        setMessage('Select a mantra, then save your completed goal.');
        completingRef.current = false;
        return;
      }
      const remaining = Math.max(sessionCount - postedCountRef.current, 0);
      if (remaining < 1) {
        await clearDraftFor(selectedRef.current);
        afterSessionSaved(
          {userTotal: savedTotal, count: sessionCount},
          sessionCount,
          {completed: true},
        );
        return;
      }
      const response = await apiService.post('/japa/session', {
        ...sessionMantraFields(),
        chantMode: 'TAP',
        sessionCount: remaining,
        durationSeconds: Math.max(remaining * 2, 1),
        japaGoalId: challengeId ? undefined : route.params?.japaGoalId,
        challengeId: challengeId || undefined,
        remarks: sessionRemarks(),
      });
      postedCountRef.current = sessionCount;
      await clearDraftFor(selectedRef.current);
      afterSessionSaved(response.data.data, remaining, {completed: true});
    } catch (err: any) {
      completingRef.current = false;
      setMessage(
        err?.response?.data?.message ??
          'Could not save the completed session. Try Save Session again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const tapChant = () => {
    if (completingRef.current || goalReached) {
      return;
    }
    const now = Date.now();
    if (lastTap.current) {
      const delta = now - lastTap.current;
      // Ignore accidental double-taps under 250ms; otherwise accept.
      if (delta < 250) {
        return;
      }
      const reference = Number(route.params?.durationMs || 0);
      const average =
        intervals.current.length >= 3
          ? intervals.current.reduce((sum, item) => sum + item, 0) /
            intervals.current.length
          : reference;
      // Soft pace hint only after we have a stable average; never hard-block early taps.
      if (
        intervals.current.length >= 5 &&
        average > 0 &&
        delta < average * 0.35
      ) {
        setMessage('Slow down a little to match your chanting pace.');
        lastTap.current = now;
        return;
      }
      if (intervals.current.length < 12 && delta < 10000) {
        intervals.current = [...intervals.current, delta];
      }
    }
    lastTap.current = now;
    const next = countRef.current + 1;
    countRef.current = next;
    setCount(next);
    setMessage('');
    if (next >= goalRef.current) {
      void finishGoal(next);
      return;
    }
    void persistDraft(next, postedCountRef.current);
  };

  const saveSession = async () => {
    if (count < 1) {
      setMessage('Tap to count chant before saving.');
      return;
    }
    if (count >= goal) {
      await finishGoal(count);
      return;
    }
    if (!selected) {
      setMessage('Select a mantra, then save your session.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const delta = Math.max(count - postedCountRef.current, 0);
      if (delta > 0) {
        const response = await apiService.post('/japa/session', {
          ...sessionMantraFields(),
          chantMode: 'TAP',
          sessionCount: delta,
          durationSeconds: Math.max(delta * 2, 1),
          japaGoalId: challengeId ? undefined : route.params?.japaGoalId,
          challengeId: challengeId || undefined,
          remarks: sessionRemarks(),
        });
        postedCountRef.current = count;
        await persistDraft(count, count);
        afterSessionSaved(response.data.data, delta);
      } else {
        await persistDraft(count, postedCountRef.current);
        afterSessionSaved(
          {userTotal: savedTotal, count},
          count,
        );
      }
    } catch (err: any) {
      setMessage(
        err?.response?.data?.message ??
          'Could not save the session. Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const progress = Math.min(100, Math.round((count / Math.max(goal, 1)) * 100));

  if (loading) {
    return (
      <ScreenLayout title="Smart Japa" showBack tab="JapaHub">
        <ActivityIndicator color={Colors.templeGold} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Smart Japa" showBack tab="JapaHub">
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <Text style={styles.mode}>
        {challengeId
          ? 'Challenge Japa'
          : mode === 'private'
            ? t('myJapa')
            : t('communityJapa')}
      </Text>
      {challengeId ? (
        <Text style={styles.challengeHint}>
          Counting only for this challenge — separate from Antharanga japa.
        </Text>
      ) : (
        <View style={styles.chipRow}>
          {mantras.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.chip,
                item.own && styles.chipOwn,
                selected?.key === item.key && styles.chipActive,
              ]}
              onPress={() => selectMantra(item)}>
              <Text
                style={[
                  styles.chipText,
                  selected?.key === item.key && styles.chipTextActive,
                ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={styles.mantra}>
        {challengeId
          ? challengeMantra || selected?.name || t('myJapa')
          : selected?.name || route.params?.privateMantra || t('myJapa')}
      </Text>
      <Pressable
        onPress={tapChant}
        disabled={goalReached || saving}
        style={({pressed}) => [
          styles.countZone,
          pressed && !goalReached && !saving ? styles.countZonePressed : null,
        ]}>
        <View style={[styles.ring, goalReached && styles.ringPaused]}>
          <View style={styles.innerRing}>
            <Text style={styles.count}>{count.toLocaleString()}</Text>
            <Text style={styles.japas}>JAPAS</Text>
          </View>
        </View>
        <Text style={styles.goal}>
          {challengeId
            ? `Challenge goal ${goal.toLocaleString()}`
            : `Goal ${goal.toLocaleString()}${
                savedTotal > 0 ? ` · Lifetime ${savedTotal.toLocaleString()}` : ''
              }`}
        </Text>
        <View style={styles.barRow}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, {width: `${progress}%`}]} />
          </View>
          <Text style={styles.percent}>{progress}%</Text>
        </View>
        <View
          style={[styles.tapCircle, goalReached && styles.tapCirclePaused]}>
          <Text style={styles.tapCircleText}>
            {goalReached
              ? challengeId
                ? 'Challenge complete'
                : 'Goal reached'
              : 'Click to count chant'}
          </Text>
        </View>
      </Pressable>
      <TouchableOpacity
        style={styles.save}
        onPress={saveSession}
        disabled={saving}>
        <Text style={styles.saveText}>
          {saving ? 'Saving...' : 'Save Session'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.save}
        onPress={() => {
          if (challengeId) {
            navigation.navigate('ChallengeProgress', {id: challengeId});
            return;
          }
          navigation.navigate('JapaProgress', {
            count: savedTotal + count,
            goal,
            sessionCount: count,
          });
        }}>
        <Text style={styles.saveText}>
          {challengeId ? 'View Challenge Progress' : 'View Progress'}
        </Text>
      </TouchableOpacity>
      {message ? (
        <Text style={[styles.message, {color: formMessageColor(message)}]}>
          {message}
        </Text>
      ) : null}
    </ScreenLayout>
  );
};

export default ChantScreen;

const styles = StyleSheet.create({
  mode: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
  },
  challengeHint: {
    marginTop: -4,
    marginBottom: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  chipOwn: {
    borderColor: Colors.selectedOrange,
    borderStyle: 'dashed',
  },
  chipText: {color: Colors.sacredBrown, fontWeight: '700'},
  chipTextActive: {color: Colors.white},
  mantra: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.leafGreen,
    textAlign: 'center',
    marginBottom: 8,
  },
  countZone: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  countZonePressed: {
    opacity: 0.92,
  },
  ring: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPaused: {
    opacity: 0.75,
  },
  innerRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: Colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  japas: {
    marginTop: 4,
    color: Colors.leafGreen,
    fontWeight: '800',
    letterSpacing: 1,
  },
  goal: {
    marginTop: 18,
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: Colors.templeGold,
  },
  percent: {fontWeight: '800', color: Colors.sacredBrown},
  tapCircle: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: Colors.templeGold,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  tapCircleText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  tapCirclePaused: {
    opacity: 0.7,
  },
  save: {
    marginTop: 18,
    backgroundColor: Colors.templeGold,
    borderRadius: 30,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {color: Colors.white, fontWeight: '800'},
  message: {marginTop: 14, fontWeight: '600', lineHeight: 22},
});
