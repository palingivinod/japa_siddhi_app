import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import InsightCard from '../common/InsightCard';
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
      .then(response =>
        setData(
          response.data.data?.[period] || response.data.data?.overview,
        ),
      )
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
          <StatCards items={data.stats || []} />
          <Text style={styles.section}>Progress trend</Text>
          <Text style={styles.caption}>{CHART_CAPTION[period]}</Text>
          <TrendChart values={data.trend || []} />
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
});
