import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import AppIcon, {AppIconName} from '../../components/icons/AppIcon';
import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import AppHeader from '../common/AppHeader';
import BottomTabs from '../common/BottomTabs';

const JapaHubScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [today, setToday] = useState(0);
  const [streak, setStreak] = useState(0);

  const items = useMemo(
    () => [
      {
        key: 'yourJapas',
        icon: 'prayer' as AppIconName,
        title: t('yourJapas') || 'Your Japas',
        sub: t('ongoingJapasSub') || 'View ongoing mantras & dynamic goals',
        route: 'YourJapas',
        tone: 'gold' as const,
      },
      {
        key: 'community',
        icon: 'om' as AppIconName,
        title: t('communityJapa'),
        sub: t('communityJapaSub'),
        route: 'CommunityJapa',
        tone: 'green' as const,
      },
      {
        key: 'private',
        icon: 'mala' as AppIconName,
        title: t('myJapa'),
        sub: t('myJapaSub'),
        route: 'PrivateJapa',
        tone: 'green' as const,
      },
      {
        key: 'challenge',
        icon: 'trophy' as AppIconName,
        title: t('challengeJapa'),
        sub: t('challengeJapaSub'),
        route: 'Challenges',
        tone: 'green' as const,
      },
      {
        key: 'analytics',
        icon: 'chart' as AppIconName,
        title: t('japaAnalytics'),
        sub: t('japaAnalyticsSub'),
        route: 'AnalyticsHub',
        tone: 'gold' as const,
      },
    ],
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      apiService
        .get('/japa/summary')
        .then(response => {
          const data = response.data.data ?? {};
          setToday(Number(data.todayJapaCount ?? data.todayCount ?? 0));
          setStreak(Number(data.streakDays ?? data.currentStreak ?? 0));
        })
        .catch(() => undefined);
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title="Japa Chanting" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <Text style={styles.heading}>{t('chooseYourJapa')}</Text>
          {items.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(item.route)}>
              <View
                style={[
                  styles.iconWrap,
                  item.tone === 'green' ? styles.iconGreen : styles.iconGold,
                ]}>
                <AppIcon name={item.icon} size={44} color={Colors.sacredBrown} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.sub}>{item.sub}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.recent}>{t('recentProgress')}</Text>
          <View style={styles.stats}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('JapaProgress')}>
              <AppIcon name="prayer" size={22} color={Colors.sacredBrown} />
              <Text style={styles.statLabel}>{t('today')}</Text>
              <Text style={styles.statValue}>{today.toLocaleString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('StreakAnalytics')}>
              <AppIcon name="flame" size={22} color={Colors.sacredBrown} />
              <Text style={styles.statLabel}>{t('streak')}</Text>
              <Text style={styles.statValue}>
                {streak} {t('days')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <BottomTabs active="JapaHub" />
    </SafeAreaView>
  );
};

export default JapaHubScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 20},
  scrollContent: {paddingBottom: 36},
  heading: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 10,
    includeFontPadding: true,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  iconGold: {
    backgroundColor: '#F3E2C6',
  },
  iconGreen: {
    backgroundColor: '#E4EFDF',
  },
  copy: {flex: 1, paddingVertical: 1},
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  sub: {
    marginTop: 2,
    color: '#4A3B2C',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: true,
  },
  chevron: {
    fontSize: 24,
    color: Colors.lightGold,
    fontWeight: '300',
    marginLeft: 4,
  },
  recent: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '800',
    color: Colors.leafGreen,
    includeFontPadding: true,
  },
  stats: {flexDirection: 'row', gap: 10},
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  statLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: true,
  },
  statValue: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
});
