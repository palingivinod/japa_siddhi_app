import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {shortWeekday} from '../../i18n/calendar';
import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import {getJapaDraft} from '../../services/japaDraft';
import Colors from '../../theme/colors';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const JapaProgressScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [today, setToday] = useState(0);
  const [goal, setGoal] = useState(2000);
  const [percent, setPercent] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [weekly, setWeekly] = useState<Array<{day: string; count: number}>>([]);

  const load = useCallback(() => {
    Promise.all([
      apiService.get('/japa/progress'),
      apiService.get('/japa/summary'),
      apiService.get('/japa-goals').catch(() => ({data: {data: []}})),
    ])
      .then(([progress, summary, goalsRes]) => {
        const data = progress.data.data ?? {};
        const totals = summary.data.data ?? {};
        const goalsList = goalsRes?.data?.data ?? [];
        const firstGoal = goalsList[0];
        const targetGoal = Number(firstGoal?.targetCount || data.goal || 2000);
        const todayCount = Number(data.todayCount ?? totals.todayJapaCount ?? 0);
        const progressPct = Math.min(
          100,
          Math.round((todayCount / Math.max(targetGoal, 1)) * 100),
        );

        setToday(todayCount);
        setGoal(targetGoal);
        setPercent(progressPct);
        setWeekly(data.weekly ?? []);
        setLifetime(Number(totals.totalJapaCount ?? totals.lifetimeCount ?? 0));
      })
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const resumeJapa = async () => {
    if (lifetime >= 10000) {
      navigation.navigate('JapaAnnadanam');
      return;
    }
    // Normal / Antharanga resume only — never open a challenge draft here.
    const draft = await getJapaDraft();
    if (draft && !Number(draft.challengeId || 0)) {
      navigation.navigate('Chant', {
        mode: draft.mode,
        mantraId: draft.mantraId,
        privateMantra: draft.privateMantra,
        personalMantraId: draft.personalMantraId,
        goal: draft.goal || goal,
        japaGoalId: draft.japaGoalId,
        resume: true,
      });
      return;
    }
    navigation.navigate('Chant', {
      goal,
      resume: true,
    });
  };

  const maxWeeklyCount = Math.max(
    goal,
    ...weekly.map(item => Number(item.count) || 0),
    1,
  );

  return (
    <ScreenLayout title="Japa Progress" showBack tab="JapaHub">
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('thisWeek')}</Text>
        {weekly.length === 0 ? (
          <Text style={styles.meta}>{t('noChantsThisWeek')}</Text>
        ) : (
          weekly.map(item => (
            <Text key={item.day} style={styles.meta}>
              {shortWeekday(t, item.day)} • {Number(item.count).toLocaleString()}
            </Text>
          ))
        )}
      </View>
      <Text style={styles.section}>{t('goalCompletion')}</Text>
      <View style={styles.chartCard}>
        {weekly.length === 0 ? (
          <Text style={styles.meta}>{t('noSavedJapaForPeriod')}</Text>
        ) : (
          <View style={styles.chartRow}>
            {weekly.map(item => {
              const itemCount = Number(item.count) || 0;
              const isCompleted = itemCount >= goal && goal > 0;
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
                  <Text style={styles.axis}>{shortWeekday(t, item.day)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
      <View style={styles.gap} />
      <PrimaryButton
        title={t('japaAnalytics').toUpperCase()}
        onPress={() => navigation.navigate('AnalyticsHub')}
      />
      <View style={styles.gap} />
      <OutlineButton
        title={lifetime >= 10000 ? t('donateNowAction') : t('resumeJapa')}
        onPress={resumeJapa}
      />
    </ScreenLayout>
  );
};

export default JapaProgressScreen;

const styles = StyleSheet.create({
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

