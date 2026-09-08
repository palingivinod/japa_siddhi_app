import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import MilestoneProgressCard from '../common/MilestoneProgressCard';
import ScreenLayout from '../common/ScreenLayout';

const ITEMS = [
  {title: 'Japa Overview', route: 'JapaOverview', emoji: '🕉️'},
  {title: 'Daily Analytics', route: 'DailyAnalytics', emoji: '📅'},
  {title: 'Weekly Analytics', route: 'WeeklyAnalytics', emoji: '📈'},
  {title: 'Monthly Analytics', route: 'MonthlyAnalytics', emoji: '🗓️'},
  {title: 'Lifetime Analytics', route: 'LifetimeAnalytics', emoji: '♾️'},
  {title: 'Goal Analytics', route: 'GoalAnalytics', emoji: '🎯'},
  {title: 'Streak Analytics', route: 'StreakAnalytics', emoji: '🔥'},
];

const AnalyticsHubScreen = () => {
  const navigation = useNavigation<any>();
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
          title={item.title}
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
