import React from 'react';
import {useNavigation} from '@react-navigation/native';

import MenuCard from '../common/MenuCard';
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
  return (
    <ScreenLayout title="Japa Analytics" showBack tab="JapaHub">
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
