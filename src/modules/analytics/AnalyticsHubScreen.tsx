import React from 'react';
import {useNavigation} from '@react-navigation/native';

import MenuCard from '../common/MenuCard';
import ScreenLayout from '../common/ScreenLayout';

const ITEMS = [
  {title: 'Japa Overview', route: 'JapaOverview'},
  {title: 'Daily Analytics', route: 'DailyAnalytics'},
  {title: 'Weekly Analytics', route: 'WeeklyAnalytics'},
  {title: 'Monthly Analytics', route: 'MonthlyAnalytics'},
  {title: 'Lifetime Analytics', route: 'LifetimeAnalytics'},
  {title: 'Goal Analytics', route: 'GoalAnalytics'},
  {title: 'Streak Analytics', route: 'StreakAnalytics'},
];

const AnalyticsHubScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <ScreenLayout title="Japa Analytics" showBack tab="JapaHub">
      {ITEMS.map(item => (
        <MenuCard
          key={item.route}
          title={item.title}
          onPress={() => navigation.navigate(item.route)}
        />
      ))}
    </ScreenLayout>
  );
};

export default AnalyticsHubScreen;
