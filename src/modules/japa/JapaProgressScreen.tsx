import React, {useCallback, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import {shortWeekday} from '../../i18n/calendar';
import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import {getJapaDraft} from '../../services/japaDraft';
import Colors from '../../theme/colors';
import {dailyPlansForDays} from '../../utils/dailyGoal';
import {istIsoDate, shiftIsoDate} from '../../utils/dateUtils';
import {getLastChantedJapa} from '../../services/session';
import {
  pickMantraGoal,
  readDailyPlanSnaps,
  resolveMantraDailyTarget,
  writeDailyPlanSnap,
} from '../../utils/mantraDailyPlan';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const JapaProgressScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const seededGoal = Math.max(
    0,
    Number(route.params?.dailyTarget || route.params?.goal || 0),
  );
  const seededToday = Math.max(
    0,
    Number(route.params?.todayCount || 0),
  );
  const seededLifetime = Math.max(0, Number(route.params?.count || 0));
  const seededGoalId = Math.max(0, Number(route.params?.japaGoalId || 0));
  const hasSeed =
    seededGoal > 0 || seededToday > 0 || Number(route.params?.sessionCount || 0) > 0;

  const [today, setToday] = useState(seededToday);
  const [goal, setGoal] = useState(seededGoal);
  const [percent, setPercent] = useState(() =>
    seededGoal > 0
      ? Math.min(100, Math.round((seededToday / seededGoal) * 100))
      : 0,
  );
  const [lifetime, setLifetime] = useState(seededLifetime);
  const [weekly, setWeekly] = useState<Array<{day: string; count: number}>>([]);
  const [dayPlans, setDayPlans] = useState<Record<string, number>>({});
  const [mantraLabel, setMantraLabel] = useState(
    String(route.params?.mantraName || '').trim(),
  );
  /** Mid-session draft only — Resume shows after Save Session / View Progress mid-way. */
  const [canResume, setCanResume] = useState(false);
  const [resumeTarget, setResumeTarget] = useState<{
    japaGoalId?: number;
    mantraId?: number;
    personalMantraId?: number;
    privateMantra?: string;
    mode: 'private' | 'community';
    lifetimeGoal: number;
    initialCount: number;
    postedCount: number;
    dailyTarget: number;
    todayCompletedCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(hasSeed);
  const [weekReady, setWeekReady] = useState(false);
  const hasLoadedRef = useRef(hasSeed);
  const loadGen = useRef(0);

  const applyProgressPayload = useCallback(
    async (data: any, goalsList: any[]) => {
      const lastChanted = await getLastChantedJapa();
      // Route goal (from Chant → View Progress) always wins over last-chanted.
      const preferredGoalId =
        seededGoalId ||
        Number(data.activeGoalId || 0) ||
        Number(lastChanted?.goalId || 0);

      let activeGoal: any = null;
      if (seededGoalId > 0) {
        activeGoal =
          goalsList.find((g: any) => Number(g.id) === seededGoalId) || null;
      }
      if (!activeGoal) {
        const picked = pickMantraGoal(goalsList, {
          goalId: preferredGoalId || lastChanted?.goalId,
          personalMantraId: lastChanted?.personalMantraId,
          mantraId: lastChanted?.mantraId,
        });
        activeGoal =
          picked ||
          (preferredGoalId
            ? goalsList.find((g: any) => Number(g.id) === preferredGoalId)
            : null) ||
          goalsList.find((g: any) => {
            if (String(g.status || '').toUpperCase() !== 'ACTIVE') {
              return false;
            }
            const target = Number(g.targetCount ?? 0);
            const completed = Number(g.completedCount ?? 0);
            const daily = Number(g.dailyTarget ?? 0);
            const goalName = String(g.goalName || '').trim();
            if (
              target === 10800 &&
              completed === 0 &&
              daily === 108 &&
              goalName === 'Daily Japa'
            ) {
              return false;
            }
            if (target > 0 && completed >= target) {
              return false;
            }
            return true;
          });
      }

      let todayCount = Number(
        activeGoal?.todayCompletedCount ??
          (seededGoalId > 0 ? 0 : data.todayCount) ??
          0,
      );
      // Keep just-saved session visible if server lag still shows an older today.
      const seedMatchesGoal =
        !seededGoalId ||
        !activeGoal ||
        Number(activeGoal.id) === seededGoalId;
      if (seedMatchesGoal && seededToday > todayCount) {
        todayCount = seededToday;
      }
      const label = String(
        (seededGoalId > 0 ? route.params?.mantraName : '') ||
          activeGoal?.mantraName ||
          activeGoal?.goalName ||
          data.mantraName ||
          route.params?.mantraName ||
          '',
      ).trim();
      if (label) {
        setMantraLabel(label);
      }

      // Always show last 7 IST days (0 where no chant) so bars don't collapse to "today only".
      const byDay = new Map<string, number>();
      (Array.isArray(data.weekly) ? data.weekly : []).forEach((row: any) => {
        const key = String(row.day || '').slice(0, 10);
        if (key) {
          byDay.set(key, Number(row.count) || 0);
        }
      });
      const todayIso = istIsoDate();
      const weekRows: Array<{day: string; count: number}> = [];
      for (let i = 6; i >= 0; i -= 1) {
        const day = shiftIsoDate(todayIso, -i);
        weekRows.push({day, count: byDay.get(day) || 0});
      }

      let dailyGoal = 0;
      let plans: Record<string, number> = {};
      if (activeGoal) {
        const target = Number(activeGoal.targetCount ?? 0);
        const completed = Number(activeGoal.completedCount ?? 0);
        const remaining = Math.max(0, target - completed);
        const snaps = await readDailyPlanSnaps();
        const plan = resolveMantraDailyTarget({
          today: todayIso,
          endDate: activeGoal.endDate,
          remainingNow: remaining,
          doneToday: todayCount,
          serverTarget: Number(activeGoal.dailyTarget || 0),
          serverPlanDate:
            activeGoal.dailyPlanDate || activeGoal.daily_plan_date,
          saved: snaps[String(activeGoal.id)] || null,
        });
        dailyGoal = plan.target;
        void writeDailyPlanSnap(Number(activeGoal.id), plan.snap);
        plans = dailyPlansForDays(weekRows, {
          target,
          completed,
          endDate: activeGoal.endDate,
        });
      }
      if (dailyGoal <= 0) {
        dailyGoal = Number(
          seededGoalId > 0
            ? seededGoal || data.dailyGoal || data.goal || 0
            : data.dailyGoal ?? data.goal ?? 0,
        );
      }
      if (dailyGoal <= 0 && seededGoal > 0) {
        dailyGoal = seededGoal;
      }
      const progressPct =
        dailyGoal > 0
          ? Math.min(100, Math.round((todayCount / dailyGoal) * 100))
          : Number(data.progressPercent ?? 0);

      setToday(todayCount);
      setGoal(dailyGoal);
      setPercent(progressPct);
      setWeekly(weekRows);
      setDayPlans(plans);
      setLifetime(
        Number(
          data.lifetime ??
            data.totalJapaCount ??
            seededLifetime ??
            0,
        ),
      );
      // Resume CTA only when an unfinished draft exists (Save Session / left mid-chant).
      const isPersonalGoal =
        !!activeGoal &&
        (String(activeGoal.mantraType || '').toUpperCase() === 'PERSONAL' ||
          Boolean(activeGoal.personalMantraId));
      const goalMantraId = activeGoal
        ? isPersonalGoal
          ? undefined
          : Number(activeGoal.mantraId || 0) || undefined
        : undefined;
      const goalPersonalId = activeGoal
        ? isPersonalGoal
          ? Number(activeGoal.personalMantraId || 0) || undefined
          : undefined
        : undefined;
      const goalMode: 'private' | 'community' = isPersonalGoal
        ? 'private'
        : 'community';
      const goalName = activeGoal
        ? String(
            activeGoal.mantraName || activeGoal.goalName || label || '',
          ).trim()
        : label;

      let draft = null as Awaited<ReturnType<typeof getJapaDraft>>;
      if (activeGoal) {
        draft = await getJapaDraft(
          goalMode,
          goalMantraId,
          undefined,
          goalPersonalId,
        );
        if (
          draft &&
          Number(draft.japaGoalId || 0) > 0 &&
          Number(draft.japaGoalId) !== Number(activeGoal.id)
        ) {
          draft = null;
        }
      }
      if (!draft) {
        draft = await getJapaDraft();
        if (
          draft &&
          seededGoalId > 0 &&
          Number(draft.japaGoalId || 0) > 0 &&
          Number(draft.japaGoalId) !== seededGoalId
        ) {
          draft = null;
        }
      }

      if (draft) {
        const draftPersonal = Number(draft.personalMantraId || 0) > 0;
        const draftCount = Math.max(0, Number(draft.count || 0));
        const draftPosted = Math.max(0, Number(draft.postedCount || 0));
        const serverDone = Math.max(
          0,
          Number(activeGoal?.completedCount || 0),
        );
        setCanResume(true);
        setResumeTarget({
          japaGoalId:
            Number(draft.japaGoalId || 0) ||
            Number(activeGoal?.id || 0) ||
            seededGoalId ||
            undefined,
          mantraId: draftPersonal
            ? undefined
            : Number(draft.mantraId || 0) || goalMantraId,
          personalMantraId: draftPersonal
            ? Number(draft.personalMantraId || 0) || undefined
            : goalPersonalId,
          privateMantra:
            draft.privateMantra ||
            (draftPersonal || isPersonalGoal ? goalName || undefined : undefined),
          mode: draft.mode || goalMode,
          lifetimeGoal: Math.max(
            0,
            Number(draft.goal || activeGoal?.targetCount || 0),
          ),
          // Prefer mid-session draft count so Chant does not flash 0 / server-only total.
          initialCount: Math.max(draftCount, serverDone),
          postedCount: Math.min(
            Math.max(draftPosted, serverDone),
            Math.max(draftCount, serverDone),
          ),
          dailyTarget: dailyGoal || seededGoal,
          todayCompletedCount: todayCount,
        });
      } else {
        setCanResume(false);
        setResumeTarget(null);
      }
    },
    [route.params?.mantraName, seededGoal, seededGoalId, seededLifetime, seededToday],
  );

  const load = useCallback(() => {
    const gen = ++loadGen.current;
    setLoading(true);
    (async () => {
      try {
        const lastChanted = await getLastChantedJapa();
        const goalId =
          seededGoalId || Number(lastChanted?.goalId || 0) || undefined;
        const progress = await apiService.get('/japa/progress', {
          params: goalId ? {goalId} : undefined,
        });
        if (gen !== loadGen.current) {
          return;
        }
        const data = progress.data?.data ?? {};
        let goalsList: any[] = Array.isArray(data.goals) ? data.goals : [];
        // Older backends without a `goals` field — one fallback call only.
        if (!Object.prototype.hasOwnProperty.call(data, 'goals')) {
          const goalsRes = await apiService
            .get('/japa-goals')
            .catch(() => ({data: {data: []}}));
          if (gen !== loadGen.current) {
            return;
          }
          goalsList = goalsRes?.data?.data ?? [];
        }
        await applyProgressPayload(data, goalsList);
        hasLoadedRef.current = true;
        setHasLoaded(true);
        setWeekReady(true);
      } catch {
        // Keep seeded / last painted values; stop spinning so empty state can show.
        if (gen === loadGen.current) {
          setWeekReady(true);
        }
      } finally {
        if (gen === loadGen.current) {
          setLoading(false);
        }
      }
    })();
  }, [applyProgressPayload, seededGoalId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const resumeJapa = async () => {
    // Only mid-session drafts — button is hidden otherwise.
    if (resumeTarget) {
      navigation.navigate('Chant', {
        mode: resumeTarget.mode,
        mantraId: resumeTarget.mantraId,
        privateMantra: resumeTarget.privateMantra || mantraLabel || undefined,
        personalMantraId: resumeTarget.personalMantraId,
        goal: resumeTarget.lifetimeGoal || goal,
        initialCount: resumeTarget.initialCount,
        postedCount: resumeTarget.postedCount,
        todayCompletedCount: resumeTarget.todayCompletedCount || today,
        dailyTarget: resumeTarget.dailyTarget || goal,
        japaGoalId: resumeTarget.japaGoalId,
        resume: true,
      });
      return;
    }
    const draft = await getJapaDraft();
    if (!draft || Number(draft.challengeId || 0)) {
      return;
    }
    const draftCount = Math.max(0, Number(draft.count || 0));
    const draftPosted = Math.max(0, Number(draft.postedCount || 0));
    navigation.navigate('Chant', {
      mode: draft.mode,
      mantraId: draft.mantraId,
      privateMantra: draft.privateMantra,
      personalMantraId: draft.personalMantraId,
      goal: draft.goal || goal,
      japaGoalId: draft.japaGoalId || seededGoalId || undefined,
      dailyTarget: goal,
      todayCompletedCount: today,
      initialCount: draftCount,
      postedCount: Math.min(draftPosted, draftCount),
      resume: true,
    });
  };

  const openAnnadanam = () => {
    navigation.navigate('JapaAnnadanam', {
      persons: 2,
      suggestPersons: true,
    });
  };

  const maxWeeklyCount = useMemo(
    () =>
      Math.max(
        goal,
        ...weekly.map(item => Number(item.count) || 0),
        1,
      ),
    [goal, weekly],
  );

  const weekPending = !weekReady;
  const weekHasChants = weekly.some(item => Number(item.count) > 0);

  return (
    <ScreenLayout title="Japa Progress" showBack tab="JapaHub">
      {loading && !hasLoaded && !hasSeed ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.templeGold} />
          <Text style={styles.loadingText}>
            {t('pleaseWait') || 'Please wait…'}
          </Text>
        </View>
      ) : (
        <>
          {loading && weekReady ? (
            <View style={styles.refreshRow}>
              <ActivityIndicator size="small" color={Colors.templeGold} />
              <Text style={styles.refreshText}>
                {t('pleaseWait') || 'Please wait…'}
              </Text>
            </View>
          ) : null}
          {mantraLabel ? (
            <Text style={styles.mantraName} numberOfLines={2}>
              {mantraLabel}
            </Text>
          ) : null}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.label}>{t('today')}</Text>
              <Text style={styles.value}>{today.toLocaleString()}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.label}>{t('goalLabel')}</Text>
              <Text style={styles.value}>{goal.toLocaleString()}</Text>
            </View>
          </View>
          <Text style={styles.section}>{t('dailyGoal')}</Text>
          <View style={styles.barRow}>
            <View style={styles.track}>
              <View style={[styles.fill, {width: `${percent}%`}]} />
            </View>
            <Text style={styles.percent}>{percent}%</Text>
          </View>
          {canResume || lifetime >= 5000 ? (
            <View style={styles.resumeRow}>
              {canResume ? (
                <PrimaryButton
                  title={t('resumeJapa') || 'RESUME JAPA'}
                  onPress={resumeJapa}
                />
              ) : null}
              {lifetime >= 5000 ? (
                <>
                  {canResume ? <View style={styles.gap} /> : null}
                  <OutlineButton
                    title={t('donateNowAction') || 'SUPPORT NOW'}
                    onPress={openAnnadanam}
                  />
                </>
              ) : null}
            </View>
          ) : null}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('thisWeek')}</Text>
            {weekPending ? (
              <View style={styles.sectionLoading}>
                <ActivityIndicator size="small" color={Colors.templeGold} />
                <Text style={styles.refreshText}>
                  {t('pleaseWait') || 'Please wait…'}
                </Text>
              </View>
            ) : !weekHasChants ? (
              <Text style={styles.meta}>{t('noChantsThisWeek')}</Text>
            ) : (
              weekly.map(item => (
                <Text key={item.day} style={styles.meta}>
                  {shortWeekday(t, item.day)} •{' '}
                  {Number(item.count).toLocaleString()}
                </Text>
              ))
            )}
          </View>
          <Text style={styles.section}>{t('goalCompletion')}</Text>
          <View style={styles.chartCard}>
            {weekPending ? (
              <View style={styles.sectionLoading}>
                <ActivityIndicator size="large" color={Colors.templeGold} />
                <Text style={styles.refreshText}>
                  {t('pleaseWait') || 'Please wait…'}
                </Text>
              </View>
            ) : weekly.length === 0 ? (
              <Text style={styles.meta}>{t('noSavedJapaForPeriod')}</Text>
            ) : (
              <View style={styles.chartRow}>
                {weekly.map(item => {
                  const itemCount = Number(item.count) || 0;
                  const dayKey = String(item.day || '').slice(0, 10);
                  const dayPlan = Object.prototype.hasOwnProperty.call(
                    dayPlans,
                    dayKey,
                  )
                    ? dayPlans[dayKey]
                    : goal;
                  const isCompleted = itemCount >= dayPlan && dayPlan > 0;
                  const barHeight = Math.max(
                    14,
                    Math.round((itemCount / maxWeeklyCount) * 96),
                  );

                  return (
                    <View key={`bar-${item.day}`} style={styles.col}>
                      <View
                        style={[
                          styles.statusBadge,
                          isCompleted
                            ? styles.statusBadgeCompleted
                            : styles.statusBadgeNotCompleted,
                        ]}>
                        <Text
                          style={[
                            styles.statusText,
                            isCompleted
                              ? styles.statusTextCompleted
                              : styles.statusTextNotCompleted,
                          ]}
                          numberOfLines={1}>
                          {isCompleted
                            ? `✓ ${t('goalCompleted')}`
                            : t('goalNotCompleted')}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.barCount,
                          isCompleted
                            ? styles.barCountCompleted
                            : styles.barCountRegular,
                        ]}>
                        {itemCount.toLocaleString()}
                      </Text>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: barHeight,
                            backgroundColor: isCompleted
                              ? '#2E7D32'
                              : Colors.templeGold,
                          },
                        ]}
                      />
                      <Text style={styles.axis}>
                        {shortWeekday(t, item.day)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          <View style={styles.gap} />
          <OutlineButton
            title={t('japaAnalytics').toUpperCase()}
            onPress={() => navigation.navigate('AnalyticsHub')}
          />
        </>
      )}
    </ScreenLayout>
  );
};

export default JapaProgressScreen;

const styles = StyleSheet.create({
  loadingBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 14,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLoading: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  refreshText: {
    color: Colors.sacredBrown,
    fontWeight: '600',
    fontSize: 13,
  },
  mantraName: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  stats: {flexDirection: 'row', gap: 10, marginBottom: 16},
  stat: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  label: {color: Colors.leafGreen, fontWeight: '700'},
  value: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 8,
  },
  barRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16},
  resumeRow: {
    marginTop: 4,
    marginBottom: 14,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  fill: {height: 10, backgroundColor: Colors.sacredBrown},
  percent: {fontWeight: '800', color: Colors.sacredBrown},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  cardTitle: {fontWeight: '800', color: Colors.sacredBrown, marginBottom: 8},
  meta: {marginTop: 6, color: Colors.sacredBrown},
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
    minHeight: 180,
    justifyContent: 'center',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    minHeight: 165,
    paddingTop: 4,
  },
  col: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
    maxWidth: '100%',
  },
  statusBadgeCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeNotCompleted: {
    backgroundColor: '#FFF8EC',
  },
  statusText: {
    fontSize: 9,
    textAlign: 'center',
  },
  statusTextCompleted: {
    color: '#2E7D32',
    fontWeight: '800',
  },
  statusTextNotCompleted: {
    color: Colors.sacredBrown,
    fontWeight: '600',
  },
  barCount: {
    fontSize: 11,
    marginBottom: 4,
  },
  barCountCompleted: {
    color: '#2E7D32',
    fontWeight: '800',
  },
  barCountRegular: {
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  bar: {
    width: 28,
    borderRadius: 8,
  },
  axis: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  gap: {height: 12},
});
