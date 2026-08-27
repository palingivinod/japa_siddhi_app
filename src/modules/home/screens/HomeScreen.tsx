import React, {useCallback, useState} from 'react';
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
import PanchangDetails from '../../common/PanchangDetails';
import HomeBanner from '../components/HomeBanner';

const TILES = [
  {title: 'Japa Chanting', sub: 'Start or resume', route: 'JapaHub'},
  {title: 'Baanalingam', sub: 'Apply / order', route: 'BanaLingam'},
  {title: 'Annadanam', sub: 'Offer food service', route: 'Donate'},
  {title: 'Nithya Homam', sub: 'Enroll now', route: 'NithyaHomam'},
  {title: 'Orders & Tracking', sub: 'View orders', route: 'Orders'},
  {title: 'Customer Care', sub: 'Need help?', route: 'CustomerCare'},
];

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('Devotee');
  const [today, setToday] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [goal, setGoal] = useState(2000);
  const [streak, setStreak] = useState(0);
  const [challenge, setChallenge] = useState<any>(null);
  const [panchang, setPanchang] = useState<PanchangPayload>(emptyPanchang());
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const user = await getStoredUser();
    const display =
      user?.fullName || user?.full_name || user?.firstName || 'Devotee';
    setName(String(display).split(' ')[0] || 'Devotee');

    try {
      const [summary, goals, challenges, panchangRes] = await Promise.allSettled([
        apiService.get('/japa/summary'),
        apiService.get('/japa-goals'),
        apiService.get('/challenges'),
        apiService.get('/festivals/panchang'),
      ]);
      if (summary.status === 'fulfilled') {
        const data = summary.value.data.data ?? {};
        setToday(Number(data.todayJapaCount ?? data.todayCount ?? 0));
        setLifetime(Number(data.totalJapaCount ?? data.lifetimeCount ?? 0));
        setStreak(Number(data.streakDays ?? data.currentStreak ?? 0));
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
    } catch (error) {
      console.log('Home summary unavailable', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const progress = Math.min(100, Math.round((today / Math.max(goal, 1)) * 100));
  const showAnnadanam = lifetime >= 10000;

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
          <Text style={styles.greet}>Namaste, {name}</Text>
          <Text style={styles.wish}>May your day be peaceful</Text>

          <HomeBanner
            banner={{
              id: 1,
              title: 'Begin your Japa',
              subtitle:
                'A digital space for Japa, Annadanam and spiritual participation.',
              imageUrl: '',
              buttonText: 'Start Chanting',
            }}
            onPress={() => navigation.navigate('JapaHub')}
          />

          <TouchableOpacity
            style={styles.festival}
            onPress={() => navigation.navigate('Festivals')}>
            <Text style={styles.kicker}>
              {panchang.festival ? 'TODAY · FESTIVAL' : 'TODAY · PANCHANGAM'}
            </Text>
            <Text style={styles.dateLine}>
              {panchang.displayDate || 'Loading today...'}
            </Text>
            <Text style={styles.cardTitle}>
              {festivalName(panchang.festival) || "Today's Panchangam"}
            </Text>
            <Text style={styles.cardMeta}>
              {panchang.festival?.description ||
                'Nakshatra, tithi and panchangam for today.'}
            </Text>
            {panchang.nextFestival && !panchang.festival ? (
              <Text style={styles.nextFestival}>
                Next: {festivalName(panchang.nextFestival)} ·{' '}
                {festivalDateLabel(panchang.nextFestival.festivalDate)}
              </Text>
            ) : null}
            <PanchangDetails panchang={panchang} compact />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.progressCard}
            onPress={() => navigation.navigate('JapaHub')}>
            <Text style={styles.progressTitle}>Continue Japa</Text>
            <Text style={styles.progressMeta}>
              {today.toLocaleString()} chants today
            </Text>
            <Text style={styles.progressMeta}>
              Goal: {goal.toLocaleString()} chants
            </Text>
            <Text style={styles.todayLabel}>Today's progress</Text>
            <View style={styles.barRow}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, {width: `${progress}%`}]} />
              </View>
              <Text style={styles.percent}>{progress}%</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity
              style={styles.half}
              onPress={() => navigation.navigate('StreakAnalytics')}>
              <Text style={styles.kicker}>STREAK</Text>
              <Text style={styles.big}>{streak} days</Text>
              <Text style={styles.cardMeta}>Keep your daily Japa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.half}
              onPress={() =>
                challenge
                  ? navigation.navigate('ChallengeDetails', {id: challenge.id})
                  : navigation.navigate('Challenges')
              }>
              <Text style={styles.kicker}>CHALLENGE</Text>
              <Text style={styles.big} numberOfLines={2}>
                {challenge?.title || 'Join a challenge'}
              </Text>
              <Text style={styles.cardMeta}>
                {challenge
                  ? `${Number(challenge.progressPercent || 0)}% complete`
                  : 'Spiritual challenges'}
              </Text>
            </TouchableOpacity>
          </View>

          {showAnnadanam ? (
            <TouchableOpacity
              style={styles.promo}
              onPress={() => navigation.navigate('JapaAnnadanam')}>
              <Text style={styles.kicker}>ANNADANAM</Text>
              <Text style={styles.cardTitle}>
                You have completed {lifetime.toLocaleString()} Japas
              </Text>
              <Text style={styles.cardMeta}>
                Consider sponsoring Annadanam for greater spiritual benefit.
              </Text>
              <Text style={styles.link}>Donate Now →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.promo}
              onPress={() => navigation.navigate('Donate')}>
              <Text style={styles.kicker}>ANNADANAM</Text>
              <Text style={styles.cardTitle}>Offer food seva</Text>
              <Text style={styles.cardMeta}>
                Support Annadanam for devotees and festivals.
              </Text>
              <Text style={styles.link}>Donate Now →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.promo}
            onPress={() => navigation.navigate('NithyaHomam')}>
            <Text style={styles.kicker}>NITHYA HOMAM</Text>
            <Text style={styles.cardTitle}>Enroll for daily homam</Text>
            <Text style={styles.cardMeta}>
              Participate in Nithya Homam with your name and gothram.
            </Text>
            <Text style={styles.link}>Enroll Now →</Text>
          </TouchableOpacity>

          <Text style={styles.section}>Quick actions</Text>
          <View style={styles.grid}>
            {TILES.map(item => (
              <TouchableOpacity
                key={item.route}
                style={styles.tile}
                onPress={() => navigation.navigate(item.route)}>
                <View style={styles.tileDot} />
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
  tileDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.templeGold,
    marginBottom: 10,
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
