import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import MilestoneProgressCard from '../common/MilestoneProgressCard';
import ScreenLayout from '../common/ScreenLayout';

const ITEMS: Array<{
  titleKey: TranslationKey;
  route: string;
  emoji: string;
}> = [
  {titleKey: 'japaOverview', route: 'JapaOverview', emoji: '🕉️'},
  {titleKey: 'dailyAnalytics', route: 'DailyAnalytics', emoji: '📅'},
  {titleKey: 'weeklyAnalytics', route: 'WeeklyAnalytics', emoji: '📈'},
  {titleKey: 'monthlyAnalytics', route: 'MonthlyAnalytics', emoji: '🗓️'},
  {titleKey: 'lifetimeAnalytics', route: 'LifetimeAnalytics', emoji: '♾️'},
  {titleKey: 'goalAnalytics', route: 'GoalAnalytics', emoji: '🎯'},
  {titleKey: 'streakAnalytics', route: 'StreakAnalytics', emoji: '🔥'},
];

const AnalyticsHubScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [milestone, setMilestone] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      apiService
        .get('/japa/milestones')
        .then(response => setMilestone(response.data.data || null))
        .catch(() => setMilestone(null))
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <ScreenLayout title="Japa Analytics" showBack tab="JapaHub">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      <MilestoneProgressCard
        milestone={milestone}
        onPress={() => navigation.navigate('MilestoneNotifications')}
      />
      <View style={styles.gap} />
      {ITEMS.map(item => (
        <MenuCard
          key={item.route}
          emoji={item.emoji}
          title={t(item.titleKey)}
          onPress={() => navigation.navigate(item.route)}
        />
      ))}
    </ScreenLayout>
  );
};

export default AnalyticsHubScreen;

const styles = StyleSheet.create({
  gap: {height: 4},
});
