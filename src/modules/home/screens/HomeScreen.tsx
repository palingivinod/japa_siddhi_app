import React, {useCallback, useMemo, useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../../i18n/LanguageContext';
import AppIcon, {AppIconName} from '../../../components/icons/AppIcon';
import apiService from '../../../services/apiService';
import {
  emptyPanchang,
  festivalDateLabel,
  festivalName,
  PanchangPayload,
} from '../../../services/panchang';
import {getStoredUser} from '../../../services/session';
import Colors from '../../../theme/colors';
import AppHeader from '../../common/AppHeader';
import BottomTabs from '../../common/BottomTabs';
import MilestoneProgressCard from '../../common/MilestoneProgressCard';
import PanchangDetails from '../../common/PanchangDetails';
import HomeBanner from '../components/HomeBanner';

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const {t, language} = useLanguage();
  const [name, setName] = useState('Devotee');
  const [today, setToday] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [goal, setGoal] = useState(2000);
  const [streak, setStreak] = useState(0);
  const [challenge, setChallenge] = useState<any>(null);
  const [milestone, setMilestone] = useState<any>(null);
  const [panchang, setPanchang] = useState<PanchangPayload>(emptyPanchang());
  const [refreshing, setRefreshing] = useState(false);
  const [homeBanners, setHomeBanners] = useState<
    Array<{
      id: number;
      title: string;
      subtitle: string;
      imageUrl: string;
      buttonText?: string;
    }>
  >([]);
  const [annadanamVisibility, setAnnadanamVisibility] = useState({
    japa: true,
    general: true,
    campaigns: true,
    any: true,
  });

  const tiles = useMemo(
    () => [
      {
        title: t('tileJapaChanting'),
        sub: t('tileJapaSub'),
        route: 'JapaHub',
        icon: 'prayer' as AppIconName,
        tone: 'gold' as const,
      },
      {
        title: t('tileBaanalingam'),
        sub: t('tileBaanalingamSub'),
        route: 'BanaLingam',
        icon: 'banalingam' as AppIconName,
        tone: 'green' as const,
      },
      {
        title: t('tileAnnadanam'),
        sub: t('tileAnnadanamSub'),
        route: 'Donate',
        icon: 'bowl' as AppIconName,
        tone: 'gold' as const,
      },
      {
        title: t('tileNithyaHomam'),
        sub: t('tileNithyaHomamSub'),
        route: 'NithyaHomam',
        icon: 'flame' as AppIconName,
        tone: 'green' as const,
      },
      {
        title: t('tileOrders'),
        sub: t('tileOrdersSub'),
        route: 'Orders',
        icon: 'box' as AppIconName,
        tone: 'gold' as const,
      },
      {
        title: t('tileCustomerCare'),
        sub: t('tileCustomerCareSub'),
        route: 'CustomerCare',
        icon: 'care' as AppIconName,
        tone: 'green' as const,
      },
    ],
    [t],
  );

  const load = async () => {
    const user = await getStoredUser();
    const display =
      user?.fullName || user?.full_name || user?.firstName || t('devotee');
    setName(String(display).split(' ')[0] || t('devotee'));

    try {
      const [summary, goals, challenges, panchangRes, bannersRes, annadanamRes] =
        await Promise.allSettled([
          apiService.get('/japa/summary'),
          apiService.get('/japa-goals'),
          apiService.get('/challenges'),
          apiService.get('/festivals/panchang', {params: {lang: language}}),
          apiService.get('/banners/active', {params: {module: 'Home'}}),
          apiService.get('/annadanam/visibility'),
        ]);
      if (summary.status === 'fulfilled') {
        const data = summary.value.data.data ?? {};
        setToday(Number(data.todayJapaCount ?? data.todayCount ?? 0));
        setLifetime(Number(data.totalJapaCount ?? data.lifetimeCount ?? 0));
        setStreak(Number(data.streakDays ?? data.currentStreak ?? 0));
        setMilestone(data.milestone || null);
      }
      if (goals.status === 'fulfilled') {
        const firstGoal = (goals.value.data.data ?? [])[0];
        if (firstGoal?.targetCount) {
          setGoal(Number(firstGoal.targetCount) || 2000);
        }
      }
      if (challenges.status === 'fulfilled') {
        const list = challenges.value.data.data ?? [];
        setChallenge(list.find((item: any) => item.joined) || list[0] || null);
      }
      if (panchangRes.status === 'fulfilled' && panchangRes.value.data.data) {
        setPanchang(panchangRes.value.data.data);
      }
      if (bannersRes.status === 'fulfilled') {
        const rows = Array.isArray(bannersRes.value.data?.data)
          ? bannersRes.value.data.data
          : [];
        setHomeBanners(
          rows.map((row: any) => ({
            id: Number(row.id) || 0,
            title: String(row.title || ''),
            subtitle: String(row.subtitle || ''),
            imageUrl: String(row.imageUrl || ''),
            buttonText: String(row.buttonText || t('startChanting')),
          })),
        );
      } else {
        setHomeBanners([]);
      }
      if (annadanamRes.status === 'fulfilled') {
        const data = annadanamRes.value.data?.data || {};
        setAnnadanamVisibility({
          japa: data.japa !== false,
          general: data.general !== false,
          campaigns: data.campaigns !== false,
          any: data.any !== false,
        });
      }
    } catch (error) {
      console.log('Home summary unavailable', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [t, language]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const progress = Math.min(100, Math.round((today / Math.max(goal, 1)) * 100));
  const showJapaAnnadanam =
    annadanamVisibility.japa && lifetime >= 10000;
  const visibleTiles = tiles.filter(item => {
    if (item.route !== 'Donate') {
      return true;
    }
    return annadanamVisibility.any;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title="Japa Siddhi" showBell />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.templeGold]}
            />
          }>
          <Text style={styles.greet}>{t('namaste', {name})}</Text>
          <Text style={styles.wish}>{t('peacefulDay')}</Text>

          <HomeBanner
            banner={{
              id: 1,
              title: t('beginYourJapa'),
              subtitle: t('bannerSubtitle'),
              imageUrl: '',
              buttonText: t('startChanting'),
            }}
            onPress={() => navigation.navigate('JapaHub')}
          />

          {homeBanners.map(item => (
            <View key={String(item.id)} style={styles.noticeCard}>
              <View style={styles.noticeCopy}>
                <Text style={styles.noticeKicker}>NOTICE</Text>
                <Text style={styles.noticeTitle}>{item.title}</Text>
                {item.subtitle ? (
                  <Text style={styles.noticeSub}>{item.subtitle}</Text>
                ) : null}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.festival}
            onPress={() => navigation.navigate('Festivals')}>
            <Text style={styles.kicker}>
              {panchang.festival ? t('todayFestival') : t('todayPanchangam')}
            </Text>
            <Text style={styles.dateLine}>
              {panchang.displayDate || t('loadingToday')}
            </Text>
            {panchang.festival ? (
              <>
                <Text style={styles.cardTitle}>
                  {festivalName(panchang.festival)}
                </Text>
                {panchang.festival.description ? (
                  <Text style={styles.cardMeta}>
                    {panchang.festival.description}
                  </Text>
                ) : null}
              </>
            ) : null}
            {panchang.nextFestival && !panchang.festival ? (
              <Text style={styles.nextFestival}>
                {t('next')}: {festivalName(panchang.nextFestival)} ·{' '}
                {festivalDateLabel(panchang.nextFestival.festivalDate)}
              </Text>
            ) : null}
            <PanchangDetails panchang={panchang} compact />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.progressCard}
            onPress={() => navigation.navigate('JapaHub')}>
            <Text style={styles.progressTitle}>{t('continueJapa')}</Text>
            <Text style={styles.progressMeta}>
              {t('chantsToday', {count: today.toLocaleString()})}
            </Text>
            <Text style={styles.progressMeta}>
              {t('goalChants', {count: goal.toLocaleString()})}
            </Text>
            <Text style={styles.todayLabel}>{t('todaysProgress')}</Text>
            <View style={styles.barRow}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, {width: `${progress}%`}]} />
              </View>
              <Text style={styles.percent}>{progress}%</Text>
            </View>
          </TouchableOpacity>

          <MilestoneProgressCard
            milestone={milestone}
            onPress={() => navigation.navigate('MilestoneNotifications')}
          />

          <View style={styles.row}>
            <TouchableOpacity
              style={styles.half}
              onPress={() => navigation.navigate('StreakAnalytics')}>
              <Text style={styles.kicker}>{t('streak')}</Text>
              <Text style={styles.big}>
                {streak} {t('days')}
              </Text>
              <Text style={styles.cardMeta}>{t('keepDailyJapa')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.half}
              onPress={() =>
                challenge
                  ? navigation.navigate('ChallengeDetails', {id: challenge.id})
                  : navigation.navigate('Challenges')
              }>
              <Text style={styles.kicker}>{t('challenge')}</Text>
              <Text style={styles.big} numberOfLines={2}>
                {challenge?.title || t('joinChallenge')}
              </Text>
              <Text style={styles.cardMeta}>
                {challenge
                  ? t('percentComplete', {
                      percent: Number(challenge.progressPercent || 0),
                    })
                  : t('spiritualChallenges')}
              </Text>
            </TouchableOpacity>
          </View>

          {showJapaAnnadanam ? (
            <TouchableOpacity
              style={styles.promo}
              onPress={() => navigation.navigate('JapaAnnadanam')}>
              <Text style={styles.kicker}>{t('annadanam')}</Text>
              <Text style={styles.cardTitle}>
                {t('completedJapas', {count: lifetime.toLocaleString()})}
              </Text>
              <Text style={styles.cardMeta}>{t('considerAnnadanam')}</Text>
              <Text style={styles.link}>{t('donateNow')}</Text>
            </TouchableOpacity>
          ) : annadanamVisibility.general || annadanamVisibility.campaigns ? (
            <TouchableOpacity
              style={styles.promo}
              onPress={() => navigation.navigate('Donate')}>
              <Text style={styles.kicker}>{t('annadanam')}</Text>
              <Text style={styles.cardTitle}>{t('offerFoodSeva')}</Text>
              <Text style={styles.cardMeta}>{t('supportAnnadanam')}</Text>
              <Text style={styles.link}>{t('donateNow')}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.promo}
            onPress={() => navigation.navigate('NithyaHomam')}>
            <Text style={styles.kicker}>{t('nithyaHomam')}</Text>
            <Text style={styles.cardTitle}>{t('enrollDailyHomam')}</Text>
            <Text style={styles.cardMeta}>{t('participateHomam')}</Text>
            <Text style={styles.link}>{t('enrollNow')}</Text>
          </TouchableOpacity>

          <Text style={styles.section}>{t('quickActions')}</Text>
          <View style={styles.grid}>
            {visibleTiles.map(item => (
              <TouchableOpacity
                key={item.route}
                style={styles.tile}
                activeOpacity={0.85}
                onPress={() => navigation.navigate(item.route)}>
                <View
                  style={[
                    styles.tileIcon,
                    item.tone === 'green'
                      ? styles.tileIconGreen
                      : styles.tileIconGold,
                  ]}>
                  <AppIcon
                    name={item.icon}
                    size={48}
                    color={Colors.sacredBrown}
                  />
                </View>
                <Text style={styles.tileTitle}>{item.title}</Text>
                <Text style={styles.tileSub}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <BottomTabs active="Home" />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 20},
  greet: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  wish: {
    marginTop: 4,
    marginBottom: 16,
    color: Colors.sacredBrown,
  },
  noticeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    padding: 14,
    marginBottom: 14,
  },
  noticeCopy: {flex: 1},
  noticeKicker: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  noticeTitle: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 17,
  },
  noticeSub: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  festival: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 14,
  },
  dateLine: {
    marginTop: 8,
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 14,
  },
  nextFestival: {
    marginTop: 8,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 14,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  progressMeta: {
    marginTop: 6,
    color: Colors.textSecondary,
  },
  todayLabel: {
    marginTop: 14,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: Colors.sacredBrown,
  },
  percent: {
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  row: {flexDirection: 'row', gap: 10, marginBottom: 14},
  half: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  kicker: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  big: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  cardTitle: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  cardMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  promo: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
  },
  link: {
    marginTop: 10,
    color: Colors.templeGold,
    fontWeight: '800',
  },
  section: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  tile: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  tileIconGold: {
    backgroundColor: '#F3E2C6',
  },
  tileIconGreen: {
    backgroundColor: '#E4EFDF',
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  tileSub: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
