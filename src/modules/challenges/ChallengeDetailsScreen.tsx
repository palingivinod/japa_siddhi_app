import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {sessionGoalForChallenge} from './challengeGoal';

const ChallengeDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    apiService
      .get(`/challenges/${route.params?.id}`)
      .then(response => setItem(response.data.data))
      .catch(() => undefined);
  }, [route.params?.id]);

  const join = async () => {
    try {
      await apiService.post(`/challenges/${route.params?.id}/join`);
      Alert.alert('Joined', 'You joined this challenge.');
      navigation.navigate('GoalSelect', {
        mode: 'community',
        goal: sessionGoalForChallenge(item),
        challengeId: item?.id,
      });
    } catch (error: any) {
      Alert.alert(
        'Challenge',
        error?.response?.data?.message || 'Could not join this challenge.',
      );
    }
  };

  if (!item) {
    return (
      <ScreenLayout title="Challenge Details" showBack tab="JapaHub">
        <Text style={styles.meta}>Loading challenge...</Text>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Challenge Details" showBack tab="JapaHub">
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.sub}>
        {item.durationDays || 30} days • {item.typeLabel || 'Community'}
      </Text>
      <View style={styles.card}>
        <View style={styles.dot} />
        <View>
          <Text style={styles.cardTitle}>Challenge goal</Text>
          <Text style={styles.meta}>
            Complete {Number(item.targetValue || 0).toLocaleString()} chants
            before the end date.
          </Text>
        </View>
      </View>
      <Text style={styles.section}>Your progress</Text>
      <View style={styles.barRow}>
        <View style={styles.track}>
          <View
            style={[styles.fill, {width: `${Number(item.progressPercent || 0)}%`}]}
          />
        </View>
        <Text style={styles.percent}>{Number(item.progressPercent || 0)}%</Text>
      </View>
      <Text style={styles.section}>Rules</Text>
      {(item.rules || []).map((rule: string) => (
        <Text key={rule} style={styles.rule}>
          • {rule}
        </Text>
      ))}
      <View style={styles.gap} />
      <PrimaryButton
        title={item.joined ? 'VIEW PROGRESS' : 'JOIN CHALLENGE'}
        onPress={() => {
          if (item.joined) {
            navigation.navigate('ChallengeProgress', {id: item.id});
            return;
          }
          join();
        }}
      />
      {item.joined ? (
        <>
          <View style={styles.gap} />
          <PrimaryButton
            title="LEADERBOARD"
            onPress={() =>
              navigation.navigate('ChallengeLeaderboard', {id: item.id})
            }
          />
          {Number(item.progressPercent || 0) >= 100 ? (
            <>
              <View style={styles.gap} />
              <PrimaryButton
                title="RATE CHALLENGE"
                onPress={() =>
                  navigation.navigate('ChallengeComplete', {id: item.id})
                }
              />
            </>
          ) : null}
        </>
      ) : null}
    </ScreenLayout>
  );
};

export default ChallengeDetailsScreen;

const styles = StyleSheet.create({
  title: {fontSize: 24, fontWeight: '800', color: Colors.sacredBrown},
  sub: {marginTop: 6, marginBottom: 16, color: Colors.leafGreen, fontWeight: '700'},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    marginBottom: 18,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.templeGold,
    marginRight: 12,
  },
  cardTitle: {fontWeight: '800', color: Colors.sacredBrown},
  meta: {marginTop: 4, color: Colors.textSecondary},
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 8,
  },
  barRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
  track: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  fill: {height: 10, backgroundColor: Colors.templeGold},
  percent: {fontWeight: '800', color: Colors.sacredBrown},
  rule: {color: Colors.sacredBrown, marginBottom: 6},
  gap: {height: 20},
});
