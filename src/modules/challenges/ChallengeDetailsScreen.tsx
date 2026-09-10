import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {
  challengeCurrentCount,
  sessionGoalForChallenge,
} from './challengeGoal';

const deriveChallengeMantra = (rewardName?: string | null) => {
  const fromReward = String(rewardName || '')
    .replace(/\s*Certificate$/i, '')
    .trim();
  if (fromReward && fromReward.toLowerCase() !== 'certificate') {
    return fromReward;
  }
  return 'Community mantra';
};

const startChallengeJapa = (navigation: any, item: any) => {
  navigation.navigate('ReferenceChant', {
    mode: 'community',
    goal: sessionGoalForChallenge(item),
    initialCount: challengeCurrentCount(item),
    challengeId: item?.id,
    challengeMantra: deriveChallengeMantra(item?.mantra || item?.rewardName),
  });
};

const formatDay = (raw?: string | null) => {
  const value = String(raw || '').trim();
  if (!value) {
    return '—';
  }
  const iso = /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : (() => {
        const parts = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
        if (!parts) {
          return value;
        }
        return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      })();
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
};

const mantraLabel = (item: any) => {
  const direct = String(item?.mantra || '').trim();
  if (direct) {
    return direct;
  }
  const fromReward = String(item?.rewardName || '')
    .replace(/\s*Certificate$/i, '')
    .trim();
  if (fromReward && fromReward.toLowerCase() !== 'certificate') {
    return fromReward;
  }
  return 'Community mantra';
};

const ChallengeDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const id = route.params?.id;
    if (!id) {
      setError('Challenge not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    apiService
      .get(`/challenges/${id}`)
      .then(response => setItem(response.data.data))
      .catch(err => {
        setItem(null);
        setError(getApiError(err, 'Could not load challenge details.'));
      })
      .finally(() => setLoading(false));
  }, [route.params?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const join = async () => {
    setJoining(true);
    try {
      await apiService.post(`/challenges/${route.params?.id}/join`);
      const refreshed = await apiService.get(`/challenges/${route.params?.id}`);
      const next = refreshed.data.data;
      setItem(next);
      Alert.alert('Joined', 'You joined this challenge.');
      startChallengeJapa(navigation, next);
    } catch (err: any) {
      Alert.alert(
        'Challenge',
        err?.response?.data?.message || 'Could not join this challenge.',
      );
    } finally {
      setJoining(false);
    }
  };

  if (loading && !item) {
    return (
      <ScreenLayout title="Challenge Details" showBack tab="JapaHub">
        <ActivityIndicator color={Colors.templeGold} />
      </ScreenLayout>
    );
  }

  if (!item) {
    return (
      <ScreenLayout title="Challenge Details" showBack tab="JapaHub">
        <Text style={styles.meta}>{error || 'Challenge not found.'}</Text>
      </ScreenLayout>
    );
  }

  const target = Number(item.targetValue || 0);
  const current = Number(item.currentValue || 0);
  const percent = Number(item.progressPercent || 0);
  const joined = Boolean(item.joined);
  const completed =
    Boolean(item.completed) || (target > 0 && current >= target) || percent >= 100;
  const rewardClaimed = Boolean(item.rewardClaimed);
  const rewardDeliverySubmitted = Boolean(item.rewardDeliverySubmitted);
  const description =
    item.description ||
    (target
      ? `Complete ${target.toLocaleString()} chants. Progress and streak are tracked automatically.`
      : 'Join this community challenge.');

  return (
    <ScreenLayout title="Challenge Details" showBack tab="JapaHub">
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.badge}>Admin-created challenge</Text>

      <View style={styles.card}>
        <View style={styles.dot}>
          <View style={styles.dotInner} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>Challenge Description</Text>
          <Text style={styles.meta}>{description}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.label}>Mantra</Text>
          <Text style={styles.value}>{mantraLabel(item)}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Target Count</Text>
          <Text style={styles.value}>
            {target ? target.toLocaleString() : '—'}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Start Date</Text>
          <Text style={styles.value}>{formatDay(item.startDate)}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>End Date</Text>
          <Text style={styles.value}>{formatDay(item.endDate)}</Text>
        </View>
      </View>

      <Text style={styles.section}>Your progress</Text>
      <Text style={styles.progressCount}>
        {current.toLocaleString()} / {target ? target.toLocaleString() : '—'}
      </Text>
      <View style={styles.barRow}>
        <View style={styles.track}>
          <View style={[styles.fill, {width: `${Math.min(100, percent)}%`}]} />
        </View>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      {!joined ? (
        <Text style={styles.hint}>Join to start counting toward this goal.</Text>
      ) : null}

      <View style={styles.links}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChallengeRules')}
          hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
          <Text style={styles.link}>Challenge Rules</Text>
        </TouchableOpacity>
        <Text style={styles.linkSep}>•</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('RewardTerms')}
          hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
          <Text style={styles.link}>Reward Terms</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gap} />
      {joined ? (
        <>
          {!completed ? (
            <>
              <PrimaryButton
                title="CONTINUE JAPA"
                onPress={() => startChallengeJapa(navigation, item)}
              />
              <View style={styles.gap} />
            </>
          ) : null}
          {completed && !rewardClaimed ? (
            <>
              <PrimaryButton
                title="CHOOSE REWARD"
                onPress={() =>
                  navigation.navigate('ChallengeRewardSelect', {id: item.id})
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
                    id: item.id,
                    rewardName: item.claimedRewardName,
                  })
                }
              />
              <View style={styles.gap} />
            </>
          ) : null}
          <OutlineButton
            title="VIEW FULL PROGRESS"
            onPress={() =>
              navigation.navigate('ChallengeProgress', {id: item.id})
            }
          />
          <View style={styles.gap} />
          <OutlineButton
            title="LEADERBOARD"
            onPress={() =>
              navigation.navigate('ChallengeLeaderboard', {id: item.id})
            }
          />
          {completed && rewardClaimed && rewardDeliverySubmitted ? (
            <Text style={styles.hint}>
              Reward ordered
              {item.claimedRewardName ? `: ${item.claimedRewardName}` : ''}
              {item.rewardOrderNumber ? ` (#${item.rewardOrderNumber})` : ''}.
            </Text>
          ) : null}
          {completed && rewardClaimed && !rewardDeliverySubmitted ? (
            <Text style={styles.hint}>
              Reward selected
              {item.claimedRewardName ? `: ${item.claimedRewardName}` : ''}.
              Add delivery details to place the order.
            </Text>
          ) : null}
        </>
      ) : (
        <PrimaryButton
          title={joining ? 'JOINING...' : 'JOIN CHALLENGE'}
          onPress={join}
          disabled={joining}
        />
      )}
    </ScreenLayout>
  );
};

export default ChallengeDetailsScreen;

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    lineHeight: 30,
  },
  badge: {
    marginTop: 6,
    marginBottom: 16,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.templeGold,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.white,
  },
  cardCopy: {flex: 1},
  cardTitle: {fontWeight: '800', color: Colors.sacredBrown, fontSize: 16},
  meta: {marginTop: 6, color: Colors.textSecondary, lineHeight: 20},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  cell: {
    width: '50%',
    marginBottom: 14,
    paddingRight: 8,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 4,
  },
  value: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
  },
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 4,
  },
  progressCount: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 8,
  },
  barRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  track: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  fill: {height: 10, backgroundColor: Colors.templeGold},
  percent: {fontWeight: '800', color: Colors.sacredBrown, minWidth: 40},
  hint: {
    marginTop: 8,
    color: Colors.textSecondary,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  link: {
    color: Colors.templeGold,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  linkSep: {
    marginHorizontal: 8,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  gap: {height: 14},
});
