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
  formatPanchangDisplayDate,
  PanchangPayload,
} from '../../../services/panchang';
import {getStoredUser} from '../../../services/session';
import {getJapaDraft} from '../../../services/japaDraft';
import Colors from '../../../theme/colors';
import AppHeader from '../../common/AppHeader';
import BottomTabs from '../../common/BottomTabs';
import MilestoneProgressCard from '../../common/MilestoneProgressCard';
import PanchangDetails from '../../common/PanchangDetails';
import HomeBanner from '../components/HomeBanner';

type ActiveGoal = {
  id: number;
  goalName: string;
  mantraId?: number | null;
  personalMantraId?: number | null;
  mantraType?: string;
  mantraName?: string;
  targetCount: number;
  completedCount: number;
  dailyTarget?: number;
  remainingCount: number;
  startDate?: string;
  endDate?: string;
  status: string;
};

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const {t, tt, language} = useLanguage();
  const [name, setName] = useState('Devotee');
  const [today, setToday] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [activeJapaGoal, setActiveJapaGoal] = useState<ActiveGoal | null>(null);
  const [allActiveGoals, setAllActiveGoals] = useState<any[]>([]);
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
        const goalList: any[] = Array.isArray(goals.value.data?.data)
          ? goals.value.data.data
          : [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const activeGoals = goalList.filter((item: any) => {
          if (String(item.status || '').toUpperCase() !== 'ACTIVE') {
            return false;
          }
          const completed = Number(item.completedCount ?? item.completed_count ?? 0);
          const target = Number(item.targetCount ?? item.target_count ?? 0);
          if (target > 0 && completed >= target) {
            return false;
          }
          if (item.endDate && String(item.endDate).slice(0, 10) < todayStr) {
            return false;
          }
          return true;
        });

        setAllActiveGoals(activeGoals);
        const active = activeGoals[0];

        if (active) {
          const targetCount =
            Number(active.targetCount ?? active.target_count) || 108;
          const completedCount =
            Number(active.completedCount ?? active.completed_count) || 0;
          const dailyTarget =
            Number(active.dailyTarget ?? active.daily_target) || 0;
          setActiveJapaGoal({
            id: Number(active.id),
            goalName: String(
              active.goalName || active.goal_name || t('continueJapa'),
            ),
            mantraId: active.mantraId ?? active.mantra_id ?? null,
            personalMantraId:
              active.personalMantraId ?? active.personal_mantra_id ?? null,
            mantraType: active.mantraType ?? active.mantra_type ?? 'DEFAULT',
            mantraName: active.mantraName ?? active.mantra_name ?? '',
            targetCount,
            completedCount,
            dailyTarget,
            remainingCount: Math.max(0, targetCount - completedCount),
            startDate: active.startDate ?? active.start_date,
            endDate: active.endDate ?? active.end_date,
            status: String(active.status || 'ACTIVE').toUpperCase(),
          });
        } else {
          setActiveJapaGoal(null);
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

  const formatCountShort = (num: number) => {
    if (num >= 1000) {
      const k = num / 1000;
      return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
    }
    return num.toLocaleString('en-IN');
  };

  const totalGoalDays = (startDateStr?: string, endDateStr?: string) => {
    if (!endDateStr) {
      return 1;
    }
    const endIso = String(endDateStr).slice(0, 10);
    const endMatch = endIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!endMatch) {
      return 1;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3]));
    end.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const userDailyGoal = useMemo(() => {
    if (allActiveGoals.length > 0) {
      let totalDaily = 0;
      allActiveGoals.forEach(g => {
        const target = Number(g.targetCount ?? g.target_count) || 0;
        let daily = Number(g.dailyTarget ?? g.daily_target) || 0;
        if (daily <= 0 && target > 0) {
          const days = totalGoalDays(g.startDate ?? g.start_date, g.endDate ?? g.end_date);
          daily = Math.max(1, Math.ceil(target / days));
        }
        totalDaily += daily;
      });
      return Math.max(1, totalDaily);
    }
    if (activeJapaGoal && activeJapaGoal.targetCount > 0) {
      if (activeJapaGoal.dailyTarget && activeJapaGoal.dailyTarget > 0) {
        return activeJapaGoal.dailyTarget;
      }
      const totalDays = totalGoalDays(activeJapaGoal.startDate, activeJapaGoal.endDate);
      return Math.max(1, Math.ceil(activeJapaGoal.targetCount / Math.max(1, totalDays)));
    }
    return 108;
  }, [allActiveGoals, activeJapaGoal]);

  const dailyProgress = Math.min(
    100,
    Math.round((today / Math.max(userDailyGoal, 1)) * 100),
  );

  const goalTarget = activeJapaGoal ? activeJapaGoal.targetCount : 0;
  const goalCompleted = activeJapaGoal ? activeJapaGoal.completedCount : 0;
  const goalProgress =
    goalTarget > 0
      ? Math.min(100, Math.round((goalCompleted / goalTarget) * 100))
      : 0;

  const handleDailyGoalPress = () => {
    navigation.navigate('YourJapas');
  };

  const handleContinueJapaPress = () => {
    navigation.navigate('YourJapas');
  };

  const handleBannerStartJapa = () => {
    navigation.navigate('YourJapas');
  };

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
          contentContainerStyle={styles.scrollContent}
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
            onPress={handleBannerStartJapa}
          />

          {homeBanners.map(item => (
            <View key={String(item.id)} style={styles.noticeCard}>
              <View style={styles.noticeCopy}>
                <Text style={styles.noticeKicker}>{t('announcement')}</Text>
                <Text style={styles.noticeTitle}>{tt(item.title)}</Text>
                {item.subtitle ? (
                  <Text style={styles.noticeSub}>{tt(item.subtitle)}</Text>
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
              {formatPanchangDisplayDate(panchang, t) ||
                panchang.displayDate ||
                t('loadingToday')}
            </Text>
            {panchang.festival ? (
              <>
                <Text style={styles.cardTitle}>
                  {tt(festivalName(panchang.festival))}
                </Text>
                {panchang.festival.description ? (
                  <Text style={styles.cardMeta}>
                    {tt(panchang.festival.description)}
                  </Text>
                ) : null}
              </>
            ) : null}
            {panchang.nextFestival && !panchang.festival ? (
              <Text style={styles.nextFestival}>
                {t('next')}: {tt(festivalName(panchang.nextFestival))} ·{' '}
                {festivalDateLabel(panchang.nextFestival.festivalDate, t)}
              </Text>
            ) : null}
            <PanchangDetails panchang={panchang} compact />
          </TouchableOpacity>

          <View style={styles.progressCard}>
            {/* Top Section: Daily Goal (Non-clickable status view) */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.progressTitle}>{t('dailyGoal')}</Text>
                <View
                  style={[
                    styles.sectionBadge,
                    today >= userDailyGoal && styles.sectionBadgeDone,
                  ]}>
                  <Text
                    style={[
                      styles.sectionBadgeText,
                      today >= userDailyGoal && styles.sectionBadgeTextDone,
                    ]}>
                    {today >= userDailyGoal
                      ? `✓ ${t('goalCompleted')}`
                      : t('goalNotCompleted')}
                  </Text>
                </View>
              </View>
              <Text style={styles.progressMeta}>
                {t('chantsToday', {count: today.toLocaleString('en-IN')})}
              </Text>
              <Text style={styles.progressMeta}>
                {t('goalChants', {count: userDailyGoal.toLocaleString('en-IN')})}
              </Text>
              <View style={styles.barRow}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {width: `${dailyProgress}%`},
                      today >= userDailyGoal && styles.barFillCompleted,
                    ]}
                  />
                </View>
                <Text style={styles.percent}>
                  {today.toLocaleString('en-IN')} / {formatCountShort(userDailyGoal)} · {dailyProgress}%
                </Text>
              </View>
            </View>

            {/* Bottom Section: Continue Japa (Visible ONLY when an active Japa Goal is in progress) */}
            {activeJapaGoal &&
            activeJapaGoal.targetCount > 0 &&
            activeJapaGoal.completedCount < activeJapaGoal.targetCount ? (
              <TouchableOpacity
                style={[styles.cardSection, {marginTop: 14}]}
                activeOpacity={0.85}
                onPress={handleContinueJapaPress}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.progressTitle}>
                    {activeJapaGoal.goalName || t('continueJapa')}
                  </Text>
                  <Text style={styles.resumeChevron}>➔</Text>
                </View>
                <Text style={styles.progressMeta}>
                  {activeJapaGoal.mantraName
                    ? activeJapaGoal.mantraName
                    : t('tabJapa')}
                </Text>
                <Text style={styles.progressMeta}>
                  {t('goalChants', {
                    count: activeJapaGoal.targetCount.toLocaleString('en-IN'),
                  })}
                </Text>
                <View style={styles.barRow}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {width: `${goalProgress}%`},
                        goalCompleted >= goalTarget && styles.barFillCompleted,
                      ]}
                    />
                  </View>
                  <Text style={styles.percent}>
                    {goalCompleted.toLocaleString('en-IN')} /{' '}
                    {formatCountShort(goalTarget)} · {goalProgress}%
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

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
  scrollContent: {paddingBottom: 40},
  greet: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '800',
    color: Colors.leafGreen,
    includeFontPadding: true,
  },
  wish: {
    marginTop: 4,
    marginBottom: 16,
    color: Colors.sacredBrown,
    lineHeight: 22,
    includeFontPadding: true,
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
    lineHeight: 18,
    includeFontPadding: true,
  },
  noticeTitle: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 26,
    includeFontPadding: true,
  },
  noticeSub: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: true,
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
    lineHeight: 22,
    includeFontPadding: true,
  },
  nextFestival: {
    marginTop: 8,
    color: Colors.sacredBrown,
    fontWeight: '700',
    lineHeight: 22,
    includeFontPadding: true,
  },
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 14,
  },
  cardSection: {
    paddingVertical: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  progressTitle: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  sectionBadge: {
    backgroundColor: '#FFF8EC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#E8D8C0',
  },
  sectionBadgeDone: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  sectionBadgeTextDone: {
    color: '#2E7D32',
    fontWeight: '800',
  },
  resumeChevron: {
    fontSize: 14,
    color: Colors.templeGold,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F2EBE0',
    marginVertical: 12,
  },
  progressMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: true,
  },
  todayLabel: {
    marginTop: 14,
    color: Colors.leafGreen,
    fontWeight: '700',
    lineHeight: 22,
    includeFontPadding: true,
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
  barFillCompleted: {
    backgroundColor: '#2E7D32',
  },
  percent: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: true,
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
    lineHeight: 20,
    letterSpacing: 0,
    includeFontPadding: true,
  },
  big: {
    marginTop: 8,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  cardTitle: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  cardMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    lineHeight: 22,
    includeFontPadding: true,
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
    lineHeight: 22,
    includeFontPadding: true,
  },
  section: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '800',
    color: Colors.leafGreen,
    includeFontPadding: true,
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
    paddingBottom: 18,
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
    lineHeight: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: true,
  },
  tileSub: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: true,
  },
});
