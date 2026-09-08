import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import {getJapaDraft} from '../../services/japaDraft';
import Colors from '../../theme/colors';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const weekday = (value: string) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {weekday: 'short'});
};

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
    ])
      .then(([progress, summary]) => {
        const data = progress.data.data ?? {};
        const totals = summary.data.data ?? {};
        setToday(Number(data.todayCount ?? 0));
        setGoal(Number(data.goal ?? 2000));
        setPercent(Number(data.progressPercent ?? 0));
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
    const draft = await getJapaDraft();
    if (draft) {
      navigation.navigate('Chant', {
        mode: draft.mode,
        mantraId: draft.mantraId,
        privateMantra: draft.privateMantra,
        goal: draft.goal,
        japaGoalId: draft.japaGoalId,
        challengeId: draft.challengeId,
        resume: true,
      });
      return;
    }
    navigation.navigate('JapaHub');
  };

  return (
    <ScreenLayout title="Japa Progress" showBack tab="JapaHub">
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.label}>TODAY</Text>
          <Text style={styles.value}>{today.toLocaleString()}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.label}>GOAL</Text>
          <Text style={styles.value}>{goal.toLocaleString()}</Text>
        </View>
      </View>
      <Text style={styles.section}>Daily goal</Text>
      <View style={styles.barRow}>
        <View style={styles.track}>
          <View style={[styles.fill, {width: `${percent}%`}]} />
        </View>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This week</Text>
        {weekly.length === 0 ? (
          <Text style={styles.meta}>No chants saved this week yet.</Text>
        ) : (
          weekly.map(item => (
            <Text key={item.day} style={styles.meta}>
              {weekday(item.day)} • {Number(item.count).toLocaleString()}
            </Text>
          ))
        )}
      </View>
      <Text style={styles.section}>Goal completion</Text>
      <View style={styles.chart}>
        {weekly.map(item => (
          <View key={`bar-${item.day}`} style={styles.col}>
            <View
              style={[
                styles.bar,
                {height: Math.max(8, Math.min(80, Number(item.count) / 30))},
              ]}
            />
            <Text style={styles.axis}>{weekday(item.day)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.gap} />
      <PrimaryButton
        title={t('japaAnalytics').toUpperCase()}
        onPress={() => navigation.navigate('AnalyticsHub')}
      />
      <View style={styles.gap} />
      <OutlineButton
        title={lifetime >= 10000 ? 'DONATE NOW' : 'RESUME JAPA'}
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
  chart: {flexDirection: 'row', alignItems: 'flex-end', gap: 10, minHeight: 100},
  col: {alignItems: 'center', flex: 1},
  bar: {width: 12, backgroundColor: Colors.templeGold, borderRadius: 6},
  axis: {marginTop: 6, fontSize: 11, color: Colors.textSecondary},
  gap: {height: 12},
});
