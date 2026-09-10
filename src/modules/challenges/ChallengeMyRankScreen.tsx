import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const ChallengeMyRankScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const challengeId = Number(route.params?.id || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [rank, setRank] = useState(Number(route.params?.rank || 0));
  const [japas, setJapas] = useState(Number(route.params?.currentValue || 0));
  const [totalPlayers, setTotalPlayers] = useState(
    Number(route.params?.totalPlayers || 0),
  );

  const load = useCallback(() => {
    if (!challengeId) {
      setLoading(false);
      setError('Challenge not found.');
      return;
    }
    setLoading(true);
    setError('');
    apiService
      .get(`/challenges/${challengeId}/leaderboard`)
      .then(response => {
        const rows = response.data.data ?? [];
        setTotalPlayers(rows.length);
        const you = rows.find((row: any) => row.isYou);
        if (you) {
          setRank(Number(you.rank || 0));
          setJapas(Number(you.currentValue || 0));
        } else if (route.params?.rank) {
          setRank(Number(route.params.rank));
          setJapas(Number(route.params.currentValue || 0));
        }
      })
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load your rank.'));
      })
      .finally(() => setLoading(false));
  }, [challengeId, route.params?.rank, route.params?.currentValue]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const topPercent =
    rank > 0 && totalPlayers > 0
      ? Math.max(1, Math.ceil((rank / totalPlayers) * 100))
      : 0;

  return (
    <ScreenLayout title="My Rank" showBack tab="JapaHub">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}

      {!loading && !error ? (
        <>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>#{rank || '—'}</Text>
          </View>
          <Text style={styles.subtitle}>Your current rank</Text>

          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.label}>Japas completed</Text>
              <Text style={styles.value}>{japas.toLocaleString()}</Text>
            </View>
            {topPercent > 0 ? (
              <Text style={styles.top}>Top {topPercent}%</Text>
            ) : null}
          </View>

          <PrimaryButton
            title="VIEW LEADERBOARD"
            onPress={() =>
              navigation.navigate('ChallengeLeaderboard', {id: challengeId})
            }
          />
        </>
      ) : null}
    </ScreenLayout>
  );
};

export default ChallengeMyRankScreen;

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 42,
    fontWeight: '800',
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 22,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardLeft: {flex: 1, paddingRight: 12},
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  value: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 28,
  },
  top: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginTop: 2,
  },
});
