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
  const {t, tt} = useLanguage();
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
  const [showMantraPicker, setShowMantraPicker] = useState(false);
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
      const data = summaryResponse.data.data ?? {};
      const {presets: totals, personal} = applyMantraTotals(
        data.byMantra || [],
      );

      const isRecentOnly = Boolean(route.params?.recentOnly);
      let listItems = items;
      if (isRecentOnly) {
        const previousDone = items.filter(item => {
          if (item.own) {
            return (
              (personal[item.id] || 0) > 0 ||
              ownRows.some(r => Number(r.id) === item.id)
            );
          }
          return (totals[item.id] || 0) > 0;
        });
        listItems = previousDone.length > 0 ? previousDone : items;
      }
      setMantras(listItems);

      const preferredId = Number(route.params?.mantraId || 0);
      const isExplicitMantra =
        Boolean(ownMantra) ||
        Boolean(personalMantraId) ||
        Boolean(preferredId) ||
        Boolean(challengeId) ||
        mode === 'community';

      const preferred =
        (ownMantra &&
          listItems.find(item => item.own && item.name === ownMantra)) ||
        (personalMantraId &&
          listItems.find(item => item.own && item.id === personalMantraId)) ||
        (preferredId &&
          listItems.find(item => !item.own && item.id === preferredId)) ||
        (isRecentOnly
          ? listItems[0] || null
          : mode === 'community'
            ? listItems.find(item => !item.own) || listItems[0] || null
            : null);

      setSelected(current => current ?? preferred);
      setShowMantraPicker(isRecentOnly || (!preferred && mode === 'private'));
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
          setShowMantraPicker(false);
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
    setShowMantraPicker(false);
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
    if (mode === 'private' && !selected) {
      setShowMantraPicker(true);
      setMessage(t('chooseOneMantra'));
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

  // Preset mantra names live in the dictionary, so they follow the chosen
  // language. A devotee's own mantra is always shown exactly as they typed it.
  const mantraLabel = (item: ChantMantra) =>
    item.own ? item.name : tt(item.name);

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
          ? t('challengeJapa')
          : mode === 'private'
            ? t('myJapa')
            : t('communityJapa')}
      </Text>
      {challengeId ? (
        <Text style={styles.challengeHint}>{t('challengeCountingHint')}</Text>
      ) : null}

      {mode === 'private' ? (
        showMantraPicker || !selected ? (
          <View style={styles.mantraPickerSection}>
            <View style={styles.mantraHeaderRow}>
              <Text style={styles.mantraHeaderTitle}>
                {route.params?.recentOnly
                  ? t('yourPracticedMantras') || 'Your Practiced Mantras'
                  : t('chooseMantra') || 'Choose Mantra'}
              </Text>
              {route.params?.recentOnly ? (
                <TouchableOpacity
                  style={styles.exploreLinkBtn}
                  onPress={() => navigation.navigate('JapaHub')}
                  activeOpacity={0.75}>
                  <Text style={styles.exploreLinkText}>
                    + {t('newMantra') || 'New Mantra'} (Japa Hub)
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
                    {mantraLabel(item)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.selectedMantraContainer}>
            <Text style={styles.selectedMantraText} numberOfLines={2}>
              {mantraLabel(selected)}
            </Text>
            <TouchableOpacity
              style={styles.changeMantraButton}
              activeOpacity={0.7}
              onPress={() => setShowMantraPicker(true)}>
              <Text style={styles.changeMantraText}>{t('changeMantra')}</Text>
              <Text style={styles.changeMantraChevron}>▾</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <Text
          style={[
            styles.mantra,
            mode === 'community' && !challengeId && styles.mantraCommunity,
          ]}>
          {challengeId
            ? (challengeMantra && tt(challengeMantra)) ||
              (selected && mantraLabel(selected)) ||
              t('myJapa')
            : (selected && mantraLabel(selected)) ||
              route.params?.privateMantra ||
              t('myJapa')}
        </Text>
      )}
      <Pressable
        onPress={tapChant}
        disabled={goalReached || saving}
        style={({pressed}) => [
          styles.countZone,
          pressed && !goalReached && !saving ? styles.countZonePressed : null,
        ]}>
        <View
          style={[
            styles.ring,
            goalReached && styles.ringPaused,
          ]}>
          <View style={styles.innerRing}>
            <Text style={styles.count}>
              {count.toLocaleString()}
            </Text>
            <Text style={styles.japas}>{t('japasLabel')}</Text>
          </View>
        </View>
        <Text style={styles.goal}>
          {challengeId
            ? t('challengeGoalWithCount', {count: goal.toLocaleString()})
            : savedTotal > 0
              ? t('goalWithLifetime', {
                  count: goal.toLocaleString(),
                  lifetime: savedTotal.toLocaleString(),
                })
              : t('goalWithCount', {count: goal.toLocaleString()})}
        </Text>
        <View style={styles.barRow}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, {width: `${progress}%`}]} />
          </View>
          <Text style={styles.percent}>{progress}%</Text>
        </View>
        <View style={[styles.tapPromptContainer, goalReached && styles.tapPromptContainerDone]}>
          <Text style={[styles.tapPromptText, goalReached && styles.tapPromptTextDone]}>
            {goalReached
              ? challengeId
                ? `✓ ${t('challengeCompleteLabel') || 'Challenge Complete'}`
                : `✓ ${t('goalReachedLabel') || 'Goal Reached'}`
              : `📿 ${t('tapAnywhereToChant') || 'Tap anywhere to chant'}`}
          </Text>
        </View>
      </Pressable>
      <TouchableOpacity
        style={styles.save}
        onPress={saveSession}
        disabled={saving}>
        <Text style={styles.saveText}>
          {saving ? t('savingLabel') : t('saveSession')}
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
          {challengeId ? t('viewChallengeProgress') : t('viewProgress')}
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
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: true,
  },
  challengeHint: {
    marginTop: -4,
    marginBottom: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  mantraPickerSection: {
    marginBottom: 6,
  },
  mantraHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mantraHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.leafGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exploreLinkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3EFE6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  exploreLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
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
  chipText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: true,
  },
  chipTextActive: {
    color: Colors.white,
  },
  selectedMantraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  selectedMantraText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 6,
    includeFontPadding: true,
  },
  changeMantraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  changeMantraText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.templeGold,
    marginRight: 4,
  },
  changeMantraChevron: {
    fontSize: 12,
    color: Colors.templeGold,
    fontWeight: '800',
  },
  mantra: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.leafGreen,
    textAlign: 'center',
    lineHeight: 32,
    marginVertical: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    includeFontPadding: true,
  },
  mantraCommunity: {
    fontSize: 26,
    lineHeight: 36,
    color: Colors.sacredBrown,
    marginVertical: 16,
  },
  countZone: {
    width: '100%',
    backgroundColor: '#1B1612',
    borderWidth: 1.5,
    borderColor: '#4E3E28',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    paddingHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  countZonePressed: {
    backgroundColor: '#262019',
    borderColor: Colors.templeGold,
  },
  ring: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: Colors.templeGold,
    backgroundColor: '#120F0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPaused: {
    opacity: 0.75,
  },
  innerRing: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1.5,
    borderColor: 'rgba(218, 165, 32, 0.35)',
    backgroundColor: '#171310',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#FFF8EC',
    includeFontPadding: true,
  },
  japas: {
    marginTop: 2,
    color: Colors.templeGold,
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 11,
    lineHeight: 16,
    includeFontPadding: true,
  },
  goal: {
    marginTop: 16,
    color: '#E0D6C3',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: true,
  },
  barRow: {
    width: '88%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F261D',
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    backgroundColor: Colors.templeGold,
  },
  percent: {
    fontWeight: '800',
    color: '#E0D6C3',
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: true,
  },
  tapPromptContainer: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(196, 154, 69, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 69, 0.28)',
  },
  tapPromptContainerDone: {
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.35)',
  },
  tapPromptText: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.5,
    includeFontPadding: true,
  },
  tapPromptTextDone: {
    color: '#81C784',
  },
  save: {
    marginTop: 18,
    backgroundColor: Colors.templeGold,
    borderRadius: 30,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 22,
    includeFontPadding: true,
  },
  message: {
    marginTop: 14,
    fontWeight: '600',
    lineHeight: 22,
    includeFontPadding: true,
  },
});
