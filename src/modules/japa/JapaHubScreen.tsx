import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import AppHeader from '../common/AppHeader';
import BottomTabs from '../common/BottomTabs';

const JapaHubScreen = () => {
  const navigation = useNavigation<any>();
  const [today, setToday] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    apiService
      .get('/japa/summary')
      .then(response => {
        const data = response.data.data ?? {};
        setToday(Number(data.todayJapaCount ?? data.todayCount ?? 0));
        setStreak(Number(data.streakDays ?? data.currentStreak ?? 0));
      })
      .catch(() => undefined);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title="Japa Chanting" />
        <Text style={styles.heading}>Choose your Japa</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('CommunityJapa')}>
          <View style={styles.dot} />
          <View style={styles.copy}>
            <Text style={styles.title}>Community Japa</Text>
            <Text style={styles.sub}>Join collective chanting.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PrivateJapa')}>
          <View style={[styles.dot, styles.dotGreen]} />
          <View style={styles.copy}>
            <Text style={styles.title}>My Japa</Text>
            <Text style={styles.sub}>Private mantra.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Challenges')}>
          <View style={[styles.dot, styles.dotGreen]} />
          <View style={styles.copy}>
            <Text style={styles.title}>Challenge Japa</Text>
            <Text style={styles.sub}>Take a spiritual challenge.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('AnalyticsHub')}>
          <View style={styles.dot} />
          <View style={styles.copy}>
            <Text style={styles.title}>Japa Analytics</Text>
            <Text style={styles.sub}>Weekly, monthly and streak reports.</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.recent}>Recent progress</Text>
        <View style={styles.stats}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('JapaProgress')}>
            <Text style={styles.statLabel}>TODAY</Text>
            <Text style={styles.statValue}>{today.toLocaleString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('StreakAnalytics')}>
            <Text style={styles.statLabel}>STREAK</Text>
            <Text style={styles.statValue}>{streak} days</Text>
          </TouchableOpacity>
        </View>
      </View>
      <BottomTabs active="JapaHub" />
    </SafeAreaView>
  );
};

export default JapaHubScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 20},
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.templeGold,
    marginRight: 12,
  },
  dotGreen: {backgroundColor: Colors.leafGreen},
  copy: {flex: 1},
  title: {fontSize: 17, fontWeight: '800', color: Colors.sacredBrown},
  sub: {marginTop: 4, color: Colors.textSecondary},
  recent: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  stats: {flexDirection: 'row', gap: 10},
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statLabel: {color: Colors.leafGreen, fontWeight: '700'},
  statValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
});
