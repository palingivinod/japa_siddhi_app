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
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

type RewardItem = {
  id: number;
  name: string;
  stock: number;
  inStock: boolean;
};

const ChallengeRewardSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const challengeId = Number(route.params?.id || 0);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [claimedName, setClaimedName] = useState('');
  const [deliverySubmitted, setDeliverySubmitted] = useState(false);
  const [claimedOrderId, setClaimedOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiService
      .get(`/challenges/${challengeId}/rewards`)
      .then(response => {
        const data = response.data?.data || {};
        setRewards(data.rewards || []);
        setDeliverySubmitted(Boolean(data.deliverySubmitted));
        if (data.claimed && data.claimedReward?.name) {
          setClaimedName(String(data.claimedReward.name));
          setSelectedId(Number(data.claimedReward.id) || null);
          setClaimedOrderId(
            data.claimedReward.orderId
              ? Number(data.claimedReward.orderId)
              : null,
          );
        }
      })
      .catch(err => {
        Alert.alert('Rewards', getApiError(err, 'Could not load rewards.'));
      })
      .finally(() => setLoading(false));
  }, [challengeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selected = rewards.find(item => item.id === selectedId);

  const continueConfirm = () => {
    if (claimedName && deliverySubmitted) {
      if (claimedOrderId) {
        navigation.navigate('OrderDetails', {id: claimedOrderId});
        return;
      }
      Alert.alert(
        'Already ordered',
        `You already chose ${claimedName} for this challenge.`,
      );
      return;
    }
    if (claimedName && !deliverySubmitted) {
      navigation.navigate('ChallengeRewardDelivery', {
        id: challengeId,
        rewardName: claimedName,
      });
      return;
    }
    if (!selected || !selected.inStock) {
      Alert.alert('Select reward', 'Choose an in-stock Mala to continue.');
      return;
    }
    navigation.navigate('ChallengeRewardConfirm', {
      id: challengeId,
      rewardId: selected.id,
      rewardName: selected.name,
    });
  };

  return (
    <ScreenLayout title="Choose Your Reward" showBack tab="JapaHub">
      <Text style={styles.heading}>Reward unlocked</Text>
      <Text style={styles.sub}>
        Select one Mala after completing the challenge.
      </Text>

      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}

      {claimedName ? (
        <Text style={styles.claimed}>
          {deliverySubmitted
            ? `Already claimed: ${claimedName}`
            : `Selected: ${claimedName}. Add delivery details to place the order.`}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {rewards.map(item => {
          const selected = selectedId === item.id;
          const disabled = !item.inStock || Boolean(claimedName);
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                selected && styles.cardSelected,
                !item.inStock && styles.cardOut,
              ]}
              activeOpacity={0.85}
              disabled={disabled}
              onPress={() => setSelectedId(item.id)}>
              <View
                style={[styles.radio, selected && styles.radioOn]}
              />
              <Text style={styles.name}>{item.name}</Text>
              <Text
                style={[
                  styles.stock,
                  item.inStock ? styles.inStock : styles.outStock,
                ]}>
                {item.inStock ? 'IN STOCK' : 'OUT OF STOCK'}
              </Text>
              {!item.inStock ? <Text style={styles.x}>×</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {!loading && rewards.length === 0 ? (
        <Text style={styles.empty}>
          No rewards configured yet. Ask admin to add rewards in Reward
          Management.
        </Text>
      ) : null}

      <PrimaryButton
        title={
          claimedName && !deliverySubmitted
            ? 'ENTER DELIVERY DETAILS'
            : claimedName && deliverySubmitted
              ? 'VIEW ORDER'
              : 'CONFIRM REWARD'
        }
        onPress={continueConfirm}
        disabled={!claimedName && !selectedId}
      />
    </ScreenLayout>
  );
};

export default ChallengeRewardSelectScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 18,
    color: Colors.textSecondary,
  },
  claimed: {
    marginBottom: 12,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    padding: 14,
    marginBottom: 12,
    minHeight: 110,
  },
  cardSelected: {
    borderColor: Colors.templeGold,
    backgroundColor: '#FFF6E8',
  },
  cardOut: {
    opacity: 0.55,
    borderColor: Colors.cardBorder,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    marginBottom: 10,
  },
  radioOn: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  name: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 16,
  },
  stock: {
    marginTop: 8,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  inStock: {color: Colors.leafGreen},
  outStock: {color: Colors.error},
  x: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '800',
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
});
