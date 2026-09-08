import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
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

const ChantScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const mode = route.params?.mode === 'private' ? 'private' : 'community';
  const [mantras, setMantras] = useState<Mantra[]>([]);
  const [selected, setSelected] = useState<Mantra | null>(null);
  const [savedTotal, setSavedTotal] = useState(0);
  const [mantraTotals, setMantraTotals] = useState<Record<number, number>>({});
  const [count, setCount] = useState(0);
  const [goal, setGoal] = useState(Number(route.params?.goal ?? 2000) || 2000);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const lastTap = useRef(0);
  const intervals = useRef<number[]>([]);
  const countRef = useRef(0);
  const goalRef = useRef(goal);
  const postedCountRef = useRef(0);
  const selectedRef = useRef<Mantra | null>(null);
  const completingRef = useRef(false);
  const challengeId = Number(route.params?.challengeId || 0);

  countRef.current = count;
  goalRef.current = goal;
  selectedRef.current = selected;
  const goalReached = count >= goal && goal > 0;

  const applyMantraTotals = (rows: any[]) => {
    const next: Record<number, number> = {};
    (rows || []).forEach(item => {
      next[Number(item.mantraId || 0)] = Number(item.total || 0);
    });
    setMantraTotals(next);
    return next;
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
      const [mantraResponse, summaryResponse] = await Promise.all([
        apiService.get('/mantras'),
        apiService.get('/japa/summary'),
      ]);
      const items: Mantra[] = mantraResponse.data.data ?? [];
      setMantras(items);
      const preferredId = Number(route.params?.mantraId || 0);
      const preferred =
        (preferredId && items.find(item => item.id === preferredId)) ||
        items[0] ||
        null;
      setSelected(current => current ?? preferred);
      const data = summaryResponse.data.data ?? {};
      const totals = applyMantraTotals(data.byMantra || []);
      const resumeDraft = route.params?.resume
        ? await getJapaDraft()
        : await getJapaDraft(mode, preferred?.id);
      const restore =
        !!resumeDraft &&
        resumeDraft.count > 0 &&
        resumeDraft.count < resumeDraft.goal &&
        (route.params?.resume || resumeDraft.mode === mode);
      const activeMantraId = restore
        ? Number(resumeDraft?.mantraId || preferred?.id || 0)
        : Number(preferred?.id || 0);
      if (restore && resumeDraft) {
        if (resumeDraft.mantraId) {
          const match = items.find(item => item.id === resumeDraft.mantraId);
          if (match) {
            setSelected(match);
          }
        }
        applyDraftToCount(resumeDraft);
      } else {
        setGoal(Number(route.params?.goal ?? data.dailyTarget ?? 2000) || 2000);
      }
      setSavedTotal(
        totals[activeMantraId] || Number(data.totalJapaCount ?? 0) || 0,
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

  const persistDraft = async (nextCount: number, postedCount: number) => {
    await saveJapaDraft({
      mode,
      mantraId: selectedRef.current?.id,
      privateMantra: route.params?.privateMantra,
      goal: goalRef.current,
      count: nextCount,
      postedCount,
      japaGoalId: route.params?.japaGoalId,
      challengeId: challengeId || undefined,
    });
  };

  const selectMantra = async (item: Mantra) => {
    if (selectedRef.current?.id === item.id) {
      return;
    }
    if (countRef.current > 0) {
      await persistDraft(countRef.current, postedCountRef.current);
    }
    setSelected(item);
    setSavedTotal(mantraTotals[item.id] || 0);
    const draft = await getJapaDraft(mode, item.id);
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
    const mantraId = Number(selectedRef.current?.id || 0);
    const added = Number(fallbackCount || 0);
    setMantraTotals(prev => {
      const nextTotal = Number(prev[mantraId] || savedTotal || 0) + added;
      setSavedTotal(nextTotal);
      return mantraId ? {...prev, [mantraId]: nextTotal} : prev;
    });
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
    if (challengeId) {
      navigation.replace('ChallengeComplete', {id: challengeId});
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
    if (mode === 'private') {
      return `Private Japa · ${String(route.params?.privateMantra || 'Private').slice(0, 80)}`;
    }
    return undefined;
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
        await clearJapaDraft(mode, selected.id);
        afterSessionSaved(
          {userTotal: savedTotal, count: sessionCount},
          sessionCount,
          {completed: true},
        );
        return;
      }
      const response = await apiService.post('/japa/session', {
        mantraType: 'DEFAULT',
        mantraId: selected.id,
        chantMode: 'TAP',
        sessionCount: remaining,
        durationSeconds: Math.max(remaining * 2, 1),
        japaGoalId: route.params?.japaGoalId,
        challengeId: challengeId || undefined,
        remarks: sessionRemarks(),
      });
      postedCountRef.current = sessionCount;
      await clearJapaDraft(mode, selected.id);
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
          mantraType: 'DEFAULT',
          mantraId: selected.id,
          chantMode: 'TAP',
          sessionCount: delta,
          durationSeconds: Math.max(delta * 2, 1),
          japaGoalId: route.params?.japaGoalId,
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
        {mode === 'private' ? t('myJapa') : t('communityJapa')}
      </Text>
      <View style={styles.chipRow}>
        {mantras.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.chip, selected?.id === item.id && styles.chipActive]}
            onPress={() => selectMantra(item)}>
            <Text
              style={[
                styles.chipText,
                selected?.id === item.id && styles.chipTextActive,
              ]}>
              {item.mantraName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.mantra}>
        {selected?.mantraName ||
          selected?.transliteration ||
          route.params?.privateMantra ||
          t('myJapa')}
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.ring, goalReached && styles.ringPaused]}
        onPress={tapChant}
        disabled={goalReached || saving}>
        <View style={styles.innerRing}>
          <Text style={styles.count}>{count.toLocaleString()}</Text>
          <Text style={styles.japas}>JAPAS</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.goal}>
        Goal {goal.toLocaleString()}
        {savedTotal > 0 ? ` · Lifetime ${savedTotal.toLocaleString()}` : ''}
      </Text>
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, {width: `${progress}%`}]} />
        </View>
        <Text style={styles.percent}>{progress}%</Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.tapCircle,
          goalReached && styles.tapCirclePaused,
        ]}
        onPress={tapChant}
        disabled={goalReached || saving}>
        <Text style={styles.tapCircleText}>
          {goalReached ? 'Goal reached' : 'Click to count chant'}
        </Text>
      </TouchableOpacity>
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
        onPress={() =>
          navigation.navigate('JapaProgress', {
            count: savedTotal + count,
            goal,
            sessionCount: count,
          })
        }>
        <Text style={styles.saveText}>View Progress</Text>
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
  chipText: {color: Colors.sacredBrown, fontWeight: '700'},
  chipTextActive: {color: Colors.white},
  mantra: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.leafGreen,
    textAlign: 'center',
    marginBottom: 16,
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
    alignSelf: 'center',
    minWidth: 240,
    height: 52,
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
