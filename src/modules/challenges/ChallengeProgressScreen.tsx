import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';
import {sessionGoalForChallenge} from './challengeGoal';

const ChallengeProgressScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    apiService
      .get(`/challenges/${route.params?.id}/progress`)
      .then(response => setItem(response.data.data))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load challenge progress.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [route.params?.id]);

  const current = Number(item?.currentValue || 0);
  const target = Number(item?.targetValue || 10000);
  const percent = Number(item?.progressPercent || 0);

  return (
    <ScreenLayout title="Challenge Progress" showBack tab="JapaHub">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {item ? (
        <>
          <View style={styles.circle}>
            <Text style={styles.big}>{current.toLocaleString()}</Text>
            <Text style={styles.over}>/ {target.toLocaleString()}</Text>
          </View>
          <Text style={styles.section}>Overall progress</Text>
          <View style={styles.barRow}>
            <View style={styles.track}>
              <View style={[styles.fill, {width: `${percent}%`}]} />
            </View>
            <Text style={styles.percent}>{percent}%</Text>
          </View>
          <StatCards
            items={[
              {label: 'STREAK', value: `${item.streakDays || 0} days`},
              {label: 'RANK', value: `#${item.rank || '-'}`},
            ]}
          />
          <PrimaryButton
            title="RESUME JAPA"
            onPress={() =>
              navigation.navigate('GoalSelect', {
                mode: 'community',
                goal: sessionGoalForChallenge(item),
                challengeId: route.params?.id,
              })
            }
          />
          <View style={styles.gap} />
          <OutlineButton
            title="LEADERBOARD"
            onPress={() =>
              navigation.navigate('ChallengeLeaderboard', {
                id: route.params?.id,
              })
            }
          />
          {percent >= 50 ? (
            <>
              <View style={styles.gap} />
              <PrimaryButton
                title="RATE CHALLENGE"
                onPress={() =>
                  navigation.navigate('ChallengeComplete', {
                    id: route.params?.id,
                  })
                }
              />
            </>
          ) : null}
        </>
      ) : null}
    </ScreenLayout>
  );
};

export default ChallengeProgressScreen;

const styles = StyleSheet.create({
  circle: {
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  big: {fontSize: 36, fontWeight: '800', color: Colors.sacredBrown},
  over: {color: Colors.textSecondary, fontWeight: '700'},
  section: {color: Colors.leafGreen, fontWeight: '800', marginBottom: 8},
  barRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16},
  track: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  fill: {height: 10, backgroundColor: Colors.sacredBrown},
  percent: {fontWeight: '800', color: Colors.sacredBrown},
  gap: {height: 12},
});
