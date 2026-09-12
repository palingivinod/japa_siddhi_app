import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
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

const CHART_CAPTION: Record<Period, TranslationKey> = {
  overview: 'chartLast12Months',
  daily: 'chartLast7Days',
  weekly: 'chartLast7Days',
  monthly: 'chartThisMonthWeeks',
  lifetime: 'chartLast12Months',
  goals: 'chartLast7Days',
  streak: 'chartStreakDays',
};

const BY_MANTRA_CAPTION: Record<Period, TranslationKey> = {
  overview: 'byMantraLifetime',
  daily: 'byMantraToday',
  weekly: 'byMantraWeek',
  monthly: 'byMantraMonth',
  lifetime: 'byMantraLifetime',
  goals: 'byMantraWeek',
  streak: 'byMantraYear',
};

const NEXT: Record<Period, {titleKey: TranslationKey; route: string}> = {
  overview: {titleKey: 'dailyAnalyticsCta', route: 'DailyAnalytics'},
  daily: {titleKey: 'weeklyAnalyticsCta', route: 'WeeklyAnalytics'},
  weekly: {titleKey: 'monthlyAnalyticsCta', route: 'MonthlyAnalytics'},
  monthly: {titleKey: 'lifetimeAnalyticsCta', route: 'LifetimeAnalytics'},
  lifetime: {titleKey: 'goalAnalyticsCta', route: 'GoalAnalytics'},
  goals: {titleKey: 'streakAnalyticsCta', route: 'StreakAnalytics'},
  streak: {titleKey: 'backToJapa', route: 'JapaHub'},
};

const AnalyticsTemplate = ({
  title,
  period,
}: {
  title: string;
  period: Period;
}) => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
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
        setError(getApiError(err, t('couldNotLoadAnalytics')));
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
          <Text style={styles.source}>{t('updatedFromSavedJapa')}</Text>
          <MilestoneProgressCard
            milestone={data.milestone}
            onPress={() => navigation.navigate('MilestoneNotifications')}
          />
          <StatCards items={data.stats || []} />
          <Text style={styles.section}>{t('progressTrend')}</Text>
          <Text style={styles.caption}>{t(CHART_CAPTION[period])}</Text>
          <TrendChart values={data.trend || []} />
          <Text style={styles.section}>{t('byMantra')}</Text>
          <Text style={styles.caption}>{t(BY_MANTRA_CAPTION[period])}</Text>
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
            <Text style={styles.caption}>{t('noSavedJapaByMantra')}</Text>
          )}
          <Text style={styles.section}>{t('highlights')}</Text>
          <InsightCard text={data.insight} />
          <PrimaryButton
            title={t(NEXT[period].titleKey)}
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
