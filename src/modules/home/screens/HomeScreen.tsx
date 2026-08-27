import React, {useEffect, useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import apiService from '../../../services/apiService';
import {getStoredUser} from '../../../services/session';
import Colors from '../../../theme/colors';
import AppHeader from '../../common/AppHeader';
import BottomTabs from '../../common/BottomTabs';

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
  const [goal, setGoal] = useState(2000);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const user = await getStoredUser();
    const display =
      user?.fullName || user?.full_name || user?.firstName || 'Devotee';
    setName(String(display).split(' ')[0] || 'Devotee');

    try {
      const [summary, goals] = await Promise.all([
        apiService.get('/japa/summary'),
        apiService.get('/japa-goals'),
      ]);
      const data = summary.data.data ?? {};
      setToday(Number(data.todayJapaCount ?? data.todayCount ?? 0));
      const firstGoal = (goals.data.data ?? [])[0];
      if (firstGoal?.targetCount) {
        setGoal(Number(firstGoal.targetCount) || 2000);
      }
    } catch (error) {
      console.log('Home summary unavailable', error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const progress = Math.min(100, Math.round((today / Math.max(goal, 1)) * 100));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title="Japa Siddhi" />
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
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 18,
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
