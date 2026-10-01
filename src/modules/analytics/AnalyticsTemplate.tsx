import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearModalVisible, setYearModalVisible] = useState(false);

  const showYearSelector = period === 'overview' || period === 'lifetime';

  const load = useCallback(
    (yearToFetch?: number) => {
      setLoading(true);
      setError('');
      setRawError(null);
      const targetYear = yearToFetch || selectedYear;
      apiService
        .get('/japa/analytics', {
          params: targetYear ? {year: targetYear} : undefined,
        })
        .then(response => {
          const all = response.data.data || {};
          const periodData = all[period] || all.overview || {};
          setData({
            ...periodData,
            byMantra: periodData.byMantra || all.byMantra || [],
            milestone: all.milestone || periodData.milestone || null,
          });
          const years =
            periodData.availableYears || all.overview?.availableYears || [];
          if (years && years.length > 0) {
            setAvailableYears(years);
          } else {
            const cur = new Date().getFullYear();
            setAvailableYears([cur, cur - 1, cur - 2]);
          }
          if (periodData.selectedYear) {
            setSelectedYear(periodData.selectedYear);
          }
        })
        .catch(err => {
          setRawError(err);
          setError(getApiError(err, t('couldNotLoadAnalytics')));
        })
        .finally(() => setLoading(false));
    },
    [period, selectedYear, t],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    setYearModalVisible(false);
    load(year);
  };

  return (
    <ScreenLayout title={title} showBack tab="JapaHub">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={() => load()} />
      ) : null}
      {data ? (
        <View>
          <Text style={styles.source}>{t('updatedFromSavedJapa')}</Text>
          <MilestoneProgressCard
            milestone={data.milestone}
            onPress={() => navigation.navigate('MilestoneNotifications')}
          />
          <StatCards items={data.stats || []} />

          <View style={styles.trendHeaderRow}>
            <View style={styles.trendHeaderTitles}>
              <Text style={styles.section}>{t('progressTrend')}</Text>
              <Text style={styles.caption}>
                {showYearSelector && selectedYear
                  ? t('chartYearMonths', {year: selectedYear})
                  : t(CHART_CAPTION[period])}
              </Text>
            </View>
            {showYearSelector ? (
              <TouchableOpacity
                style={styles.yearDropdownButton}
                activeOpacity={0.7}
                onPress={() => setYearModalVisible(true)}>
                <Text style={styles.yearDropdownText}>{selectedYear}</Text>
                <Text style={styles.yearDropdownChevron}>▾</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TrendChart values={data.trend || []} />

          <Text style={styles.section}>{t('byMantra')}</Text>
          <Text style={styles.caption}>{t(BY_MANTRA_CAPTION[period])}</Text>
          {(data.byMantra || []).length ? (
            (data.byMantra as Array<{
              mantraId: number;
              mantraName: string;
              total: number;
            }>).map(item => (
              <View
                key={`${item.mantraId}-${item.mantraName}`}
                style={styles.mantraRow}>
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

          {showYearSelector ? (
            <Modal
              transparent
              animationType="fade"
              visible={yearModalVisible}
              onRequestClose={() => setYearModalVisible(false)}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setYearModalVisible(false)}>
                <View style={styles.modalSheet}>
                  <Text style={styles.modalTitle}>{t('selectYear')}</Text>
                  <ScrollView bounces={false} style={styles.modalScroll}>
                    {(availableYears.length
                      ? availableYears
                      : [selectedYear, selectedYear - 1, selectedYear - 2]
                    ).map(year => {
                      const active = year === selectedYear;
                      return (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.yearOption,
                            active && styles.yearOptionActive,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handleSelectYear(year)}>
                          <Text
                            style={[
                              styles.yearOptionText,
                              active && styles.yearOptionTextActive,
                            ]}>
                            {year}
                          </Text>
                          {active ? (
                            <Text style={styles.yearTick}>✓</Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          ) : null}
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
  trendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  trendHeaderTitles: {
    flex: 1,
    marginRight: 10,
  },
  yearDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  yearDropdownText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginRight: 4,
  },
  yearDropdownChevron: {
    fontSize: 13,
    color: Colors.templeGold,
    fontWeight: '800',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 8,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalScroll: {
    maxHeight: 260,
  },
  yearOption: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3EEE2',
  },
  yearOptionActive: {
    backgroundColor: '#FFF8EC',
  },
  yearOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.sacredBrown,
  },
  yearOptionTextActive: {
    color: Colors.templeGold,
    fontWeight: '800',
  },
  yearTick: {
    fontSize: 16,
    color: Colors.templeGold,
    fontWeight: '800',
  },
});

