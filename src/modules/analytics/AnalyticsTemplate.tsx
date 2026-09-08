import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import InsightCard from '../common/InsightCard';
import MilestoneProgressCard from '../common/MilestoneProgressCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';
import TrendChart from '../common/TrendChart';

type Period =
  | 'overview'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'lifetime'
  | 'goals'
  | 'streak';

const CHART_CAPTION: Record<Period, string> = {
  overview: 'Last 12 months from saved Japa',
  daily: 'Last 7 days from saved Japa',
  weekly: 'Last 7 days from saved Japa',
  monthly: 'This month, grouped by week',
  lifetime: 'Last 12 months from saved Japa',
  goals: 'Last 7 days from saved Japa',
  streak: 'Last 7 days — keep a bar on every day',
};

const BY_MANTRA_CAPTION: Record<Period, string> = {
  overview: 'Lifetime count for each mantra',
  daily: "Today's count for each mantra",
  weekly: "This week's count for each mantra",
  monthly: "This month's count for each mantra",
  lifetime: 'Lifetime count for each mantra',
  goals: "This week's count for each mantra",
  streak: "This year's count for each mantra",
};

const NEXT: Record<Period, {title: string; route: string}> = {
  overview: {title: 'DAILY ANALYTICS', route: 'DailyAnalytics'},
  daily: {title: 'WEEKLY ANALYTICS', route: 'WeeklyAnalytics'},
  weekly: {title: 'MONTHLY ANALYTICS', route: 'MonthlyAnalytics'},
  monthly: {title: 'LIFETIME ANALYTICS', route: 'LifetimeAnalytics'},
  lifetime: {title: 'GOAL ANALYTICS', route: 'GoalAnalytics'},
  goals: {title: 'STREAK ANALYTICS', route: 'StreakAnalytics'},
  streak: {title: 'BACK TO JAPA', route: 'JapaHub'},
};

const AnalyticsTemplate = ({
  title,
  period,
}: {
  title: string;
  period: Period;
}) => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    setRawError(null);
    apiService
      .get('/japa/analytics')
      .then(response => {
        const all = response.data.data || {};
        const periodData = all[period] || all.overview || {};
        setData({
          ...periodData,
          byMantra: periodData.byMantra || all.byMantra || [],
          milestone: all.milestone || periodData.milestone || null,
        });
      })
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load analytics.'));
      })
      .finally(() => setLoading(false));
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScreenLayout title={title} showBack tab="JapaHub">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {data ? (
        <View>
          <Text style={styles.source}>Updated from your saved Japa sessions</Text>
          <MilestoneProgressCard
            milestone={data.milestone}
            onPress={() => navigation.navigate('MilestoneNotifications')}
          />
          <StatCards items={data.stats || []} />
          <Text style={styles.section}>Progress trend</Text>
          <Text style={styles.caption}>{CHART_CAPTION[period]}</Text>
          <TrendChart values={data.trend || []} />
          <Text style={styles.section}>By mantra</Text>
          <Text style={styles.caption}>{BY_MANTRA_CAPTION[period]}</Text>
          {(data.byMantra || []).length ? (
            (data.byMantra as Array<{
              mantraId: number;
              mantraName: string;
              total: number;
            }>).map(item => (
              <View key={`${item.mantraId}-${item.mantraName}`} style={styles.mantraRow}>
                <Text style={styles.mantraName}>{item.mantraName}</Text>
                <Text style={styles.mantraTotal}>
                  {Number(item.total || 0).toLocaleString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.caption}>No saved Japa by mantra yet.</Text>
          )}
          <Text style={styles.section}>Highlights</Text>
          <InsightCard text={data.insight} />
          <PrimaryButton
            title={NEXT[period].title}
            onPress={() => navigation.navigate(NEXT[period].route)}
          />
        </View>
      ) : null}
    </ScreenLayout>
  );
};

export default AnalyticsTemplate;

const styles = StyleSheet.create({
  source: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 6,
  },
  caption: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  mantraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  mantraName: {
    flex: 1,
    marginRight: 12,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  mantraTotal: {
    color: Colors.leafGreen,
    fontWeight: '800',
  },
});
