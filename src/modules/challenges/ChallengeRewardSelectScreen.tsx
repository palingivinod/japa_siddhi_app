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

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import AppIcon from '../../components/icons/AppIcon';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {
  checkRewardEligibility,
  getLocalizedReward,
} from '../../utils/rewardContent';

type RewardItem = {
  id: number;
  name: string;
  stock: number;
  inStock: boolean;
};

const ChallengeRewardSelectScreen = () => {
  const navigation = useNavigation<any>();
  const {t, tt, language} = useLanguage();
  const route = useRoute<any>();
  const challengeId = Number(route.params?.id || 0);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [claimedName, setClaimedName] = useState('');
  const [deliverySubmitted, setDeliverySubmitted] = useState(false);
  const [claimedOrderId, setClaimedOrderId] = useState<number | null>(null);
  const [userTotalJapas, setUserTotalJapas] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiService.get(`/challenges/${challengeId}/rewards`),
      apiService.get('/japa/milestones').catch(() => null),
    ])
      .then(([response, milestoneRes]) => {
        const data = response.data?.data || {};
        const milestoneData = milestoneRes?.data?.data || {};
        const total = Number(milestoneData.total || milestoneData.milestoneTotal || 0);
        setUserTotalJapas(total);
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

  const handleRewardPress = (item: RewardItem) => {
    if (claimedName) {
      return;
    }
    const eligibility = checkRewardEligibility(item.name, userTotalJapas, language);
    if (!eligibility.isEligible) {
      Alert.alert(
        t('rewardLockedTitle') || 'Reward Locked',
        t('rewardLockedMsg', {
          required: eligibility.requiredLabel,
          remaining: eligibility.remainingJapas.toLocaleString('en-IN'),
          current: userTotalJapas.toLocaleString('en-IN'),
        }) ||
          `This reward is available after ${eligibility.requiredLabel} Japas.\n\nYou need to complete ${eligibility.remainingJapas.toLocaleString()} more Japas to grab this reward. (Current Japas: ${userTotalJapas.toLocaleString()})`,
        [{text: t('ok') || 'OK'}],
      );
      return;
    }
    if (!item.inStock) {
      Alert.alert('Out of Stock', 'This reward item is currently out of stock.');
      return;
    }
    setSelectedId(item.id);
  };

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
    if (!selected) {
      Alert.alert('Select reward', 'Choose a sacred reward to continue.');
      return;
    }
    const eligibility = checkRewardEligibility(selected.name, userTotalJapas, language);
    if (!eligibility.isEligible) {
      Alert.alert(
        t('rewardLockedTitle') || 'Reward Locked',
        t('rewardLockedMsg', {
          required: eligibility.requiredLabel,
          remaining: eligibility.remainingJapas.toLocaleString('en-IN'),
          current: userTotalJapas.toLocaleString('en-IN'),
        }) ||
          `This reward is available after ${eligibility.requiredLabel} Japas.\n\nYou need to complete ${eligibility.remainingJapas.toLocaleString()} more Japas to grab this reward.`,
      );
      return;
    }
    if (!selected.inStock) {
      Alert.alert('Out of stock', 'Choose an in-stock reward to continue.');
      return;
    }
    navigation.navigate('ChallengeRewardConfirm', {
      id: challengeId,
      rewardId: selected.id,
      rewardName: selected.name,
    });
  };

  return (
    <ScreenLayout title={t('chooseReward') || 'Choose Your Reward'} showBack tab="JapaHub">
      <Text style={styles.heading}>{t('unlocked') || 'Reward unlocked'}</Text>
      <Text style={styles.sub}>
        {t('spiritualRewardsSubtitle') ||
          `Select your consecrated spiritual reward. Total Japas completed: ${userTotalJapas.toLocaleString('en-IN')}`}
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
          const isSelected = selectedId === item.id;
          const eligibility = checkRewardEligibility(item.name, userTotalJapas, language);
          const localized = getLocalizedReward(item.name, language);
          const isLocked = !eligibility.isEligible;
          const disabled = Boolean(claimedName);

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                !item.inStock && styles.cardOut,
                isLocked && styles.cardLocked,
              ]}
              activeOpacity={0.85}
              disabled={disabled}
              onPress={() => handleRewardPress(item)}>
              <View style={styles.cardHeaderRow}>
                <View
                  style={[styles.radio, isSelected && styles.radioOn]}
                />
                {localized.imageName ? (
                  <View style={styles.rewardIconWrap}>
                    <AppIcon name={localized.imageName} size={32} />
                  </View>
                ) : null}
                {isLocked ? (
                  <View style={styles.lockBadge}>
                    <Text style={styles.lockBadgeText}>🔒 {t('unlocksAt', {target: eligibility.requiredLabel}) || `Unlocks at ${eligibility.requiredLabel}`}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.name}>{localized.title || tt(item.name)}</Text>
              
              {isLocked ? (
                <Text style={styles.requirementHint}>
                  {t('unlocksAt', {target: eligibility.requiredLabel}) || `Requires ${eligibility.requiredLabel} Japas`}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.stock,
                  item.inStock ? styles.inStock : styles.outStock,
                ]}>
                {item.inStock ? (t('available') || 'IN STOCK') : 'OUT OF STOCK'}
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
            ? (t('enterDeliveryDetails') || 'ENTER DELIVERY DETAILS')
            : claimedName && deliverySubmitted
              ? (t('viewOrder') || 'VIEW ORDER')
              : (t('chooseReward') || 'CONFIRM REWARD')
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
    color: '#4A3B2C',
    fontSize: 13.5,
    lineHeight: 19,
  },
  claimed: {
    marginBottom: 12,
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 13.5,
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
    minHeight: 120,
  },
  cardSelected: {
    borderColor: Colors.templeGold,
    backgroundColor: '#FFF6E8',
  },
  cardOut: {
    opacity: 0.55,
    borderColor: Colors.cardBorder,
  },
  cardLocked: {
    borderColor: '#D4C4AA',
    backgroundColor: '#F7F3EA',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#FFF4E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    backgroundColor: '#F0E6D2',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C6F48',
  },
  requirementHint: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 4,
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
