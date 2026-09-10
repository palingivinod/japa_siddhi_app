import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const ChallengeLeaderboardScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const challengeId = Number(route.params?.id || 0);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiService
      .get(`/challenges/${challengeId}/leaderboard`)
      .then(response => setRows(response.data.data ?? []))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load leaderboard.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [challengeId]);

  const openMyRank = (item: any) => {
    navigation.navigate('ChallengeMyRank', {
      id: challengeId,
      rank: item.rank,
      currentValue: item.currentValue,
      totalPlayers: rows.length,
    });
  };

  return (
    <ScreenLayout title="Challenge Leaderboard" showBack tab="JapaHub">
      <Text style={styles.heading}>Top devotees</Text>
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {rows.map(item => {
        const isYou = Boolean(item.isYou);
        const name = item.displayName || item.fullName || 'Devotee';
        const Row = isYou ? TouchableOpacity : View;
        return (
          <Row
            key={`${item.userId}-${item.rank}`}
            style={[styles.card, isYou && styles.cardYou]}
            {...(isYou
              ? {
                  activeOpacity: 0.85,
                  onPress: () => openMyRank(item),
                }
              : {})}>
            <View style={[styles.rank, isYou && styles.rankYou]}>
              <Text style={[styles.rankText, isYou && styles.rankTextYou]}>
                {item.rank}
              </Text>
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.score}>
              {Number(item.currentValue || 0).toLocaleString()}
            </Text>
          </Row>
        );
      })}
      <PrimaryButton
        title="BACK TO HOME"
        onPress={() => navigation.navigate('Home')}
      />
    </ScreenLayout>
  );
};

export default ChallengeLeaderboardScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardYou: {
    borderColor: Colors.templeGold,
    borderWidth: 1.5,
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankYou: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  rankText: {fontWeight: '800', color: Colors.sacredBrown},
  rankTextYou: {color: Colors.white},
  name: {flex: 1, fontWeight: '800', color: Colors.sacredBrown, fontSize: 16},
  score: {color: Colors.leafGreen, fontWeight: '800'},
});
