import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {sessionGoalForChallenge, challengeCurrentCount} from './challengeGoal';

const ChallengeProgressScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const openedCompleteRef = useRef(false);

  const load = useCallback(() => {
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
  }, [route.params?.id]);

  useFocusEffect(
    useCallback(() => {
      openedCompleteRef.current = false;
      load();
    }, [load]),
  );

  const current = Number(item?.currentValue || 0);
  const target = Number(item?.targetValue || 10000);
  const percent = Number(
    item?.progressPercent ??
      Math.min(100, Math.round((current / Math.max(target, 1)) * 100)),
  );
  const today = Number(item?.todayCount || 0);
  const week = Number(item?.weekCount || 0);
  const remaining = Number(
    item?.remaining ?? Math.max(0, target - current),
  );
  const completed =
    Boolean(item?.completed) ||
    (target > 0 && current >= target) ||
    percent >= 100;
  const rewardClaimed = Boolean(item?.rewardClaimed);
  const rewardDeliverySubmitted = Boolean(item?.rewardDeliverySubmitted);

  useEffect(() => {
    if (!item || loading || !completed || openedCompleteRef.current) {
      return;
    }
    openedCompleteRef.current = true;
    navigation.replace('ChallengeComplete', {
      id: route.params?.id,
      count: current,
      goal: target,
    });
  }, [
    item,
    loading,
    completed,
    current,
    target,
    navigation,
    route.params?.id,
  ]);
  const daily: Array<{day: string; label: string; count: number}> =
    item?.dailyActivity || [];
  const maxDaily = Math.max(1, ...daily.map(row => Number(row.count || 0)));

  const challengeMantra =
    String(item?.mantra || '')
      .replace(/\s*Certificate$/i, '')
      .trim() ||
    String(item?.rewardName || '')
      .replace(/\s*Certificate$/i, '')
      .trim() ||
    undefined;

  const resume = () =>
    navigation.navigate('ReferenceChant', {
      mode: 'community',
      goal: sessionGoalForChallenge(item),
      initialCount: challengeCurrentCount(item),
      challengeId: route.params?.id,
      challengeMantra,
    });

  return (
    <ScreenLayout title="Progress Tracking" showBack tab="JapaHub">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {item ? (
        <>
          <Text style={styles.title}>
            {item.title || `${target.toLocaleString()} Japa Challenge`}
          </Text>

          <Text style={styles.section}>Progress</Text>
          <View style={styles.track}>
            <View style={[styles.fill, {width: `${Math.min(100, percent)}%`}]} />
          </View>
          <Text style={styles.total}>{current.toLocaleString()} Japas</Text>
          <Text style={styles.completed}>{percent}% completed</Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Today</Text>
              <Text style={styles.statValue}>{today.toLocaleString()}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>This week</Text>
              <Text style={styles.statValue}>{week.toLocaleString()}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValue}>{remaining.toLocaleString()}</Text>
            </View>
          </View>

          <Text style={styles.section}>Daily activity</Text>
          <View style={styles.chart}>
            {(daily.length
              ? daily
              : ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => ({
                  day: String(index),
                  label,
                  count: 0,
                }))
            ).map(row => (
              <View key={`${row.day}-${row.label}`} style={styles.col}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(
                        8,
                        Math.round((Number(row.count || 0) / maxDaily) * 88),
                      ),
                    },
                  ]}
                />
                <Text style={styles.axis}>{row.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.note}>
            Challenge-only analytics. These counts are not included in Antharanga
            / normal japa analytics.
          </Text>

          <View style={styles.gap} />
          {!completed ? (
            <>
              <PrimaryButton title="RESUME CHALLENGE" onPress={resume} />
              <View style={styles.gap} />
            </>
          ) : null}
          {completed && !rewardClaimed ? (
            <>
              <PrimaryButton
                title="CHOOSE REWARD"
                onPress={() =>
                  navigation.navigate('ChallengeRewardSelect', {
                    id: route.params?.id,
                  })
                }
              />
              <View style={styles.gap} />
            </>
          ) : null}
          {completed && rewardClaimed && !rewardDeliverySubmitted ? (
            <>
              <PrimaryButton
                title="ENTER DELIVERY DETAILS"
                onPress={() =>
                  navigation.navigate('ChallengeRewardDelivery', {
                    id: route.params?.id,
                    rewardName: item.claimedRewardName,
                  })
                }
              />
              <View style={styles.gap} />
            </>
          ) : null}
          {completed && rewardClaimed && rewardDeliverySubmitted ? (
            <Text style={styles.note}>
              Reward ordered
              {item.claimedRewardName ? `: ${item.claimedRewardName}` : ''}
              {item.rewardOrderNumber ? ` (#${item.rewardOrderNumber})` : ''}.
            </Text>
          ) : null}
          {completed && rewardClaimed && !rewardDeliverySubmitted ? (
            <Text style={styles.note}>
              Reward selected
              {item.claimedRewardName ? `: ${item.claimedRewardName}` : ''}.
              Add delivery details to place the order.
            </Text>
          ) : null}
          {!completed ? (
            <OutlineButton
              title="LEADERBOARD"
              onPress={() =>
                navigation.navigate('ChallengeLeaderboard', {
                  id: route.params?.id,
                })
              }
            />
          ) : null}
        </>
      ) : null}
    </ScreenLayout>
  );
};

export default ChallengeProgressScreen;

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 18,
  },
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
  },
  track: {
    height: 12,
    borderRadius: 8,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fill: {
    height: 12,
    backgroundColor: Colors.templeGold,
    borderRadius: 8,
  },
  total: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  completed: {
    marginTop: 4,
    marginBottom: 18,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statLabel: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 13,
  },
  statValue: {
    marginTop: 8,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 18,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 110,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  col: {alignItems: 'center', flex: 1},
  bar: {
    width: 14,
    backgroundColor: Colors.templeGold,
    borderRadius: 8,
  },
  axis: {
    marginTop: 8,
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 12,
  },
  note: {
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  gap: {height: 12},
});
