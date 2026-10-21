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
  sortRewardsCanonical,
} from '../../utils/rewardContent';

type RewardItem = {
  id: number;
  name: string;
  stock: number;
  inStock: boolean;
};

const MilestoneRewardSelectScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t, tt, language} = useLanguage();
  const target = Number(route.params?.target || 0);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [userTotalJapas, setUserTotalJapas] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [reached, setReached] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiService
      .get('/japa/milestone-rewards', {params: {target}})
      .then(response => {
        const data = response.data?.data || {};
        setUserTotalJapas(Number(data.total || 0));
        setRewards(sortRewardsCanonical<RewardItem>(data.rewards || []));
        setClaimed(Boolean(data.claimed));
        setReached(Boolean(data.reached));
      })
      .catch(err => {
        Alert.alert('Rewards', getApiError(err, 'Could not load rewards.'));
      })
      .finally(() => setLoading(false));
  }, [target]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selected = rewards.find(item => item.id === selectedId);

  const handleRewardPress = (item: RewardItem) => {
    if (claimed || !reached) {
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
          `This reward is available after ${eligibility.requiredLabel} Japas.`,
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

  const continueNext = () => {
    if (claimed) {
      Alert.alert('Reward', 'This milestone reward is already submitted.');
      return;
    }
    if (!selected) {
      Alert.alert('Select reward', 'Choose a reward to continue.');
      return;
    }
    navigation.navigate('MilestoneRewardAddress', {
      target,
      rewardId: selected.id,
      rewardName: selected.name,
    });
  };

  return (
    <ScreenLayout title={t('chooseReward') || 'Choose Your Reward'} showBack tab="SevaHub">
      <Text style={styles.heading}>{t('grabReward')}</Text>
      <Text style={styles.sub}>
        {`Choose one reward. Japas completed: ${userTotalJapas.toLocaleString('en-IN')}.`}
      </Text>
      {claimed ? (
        <Text style={styles.claimed}>{t('rewardClaimed')}</Text>
      ) : null}
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      <View style={styles.grid}>
        {rewards.map(item => {
          const isSelected = selectedId === item.id;
          const eligibility = checkRewardEligibility(
            item.name,
            userTotalJapas,
            language,
          );
          const localized = getLocalizedReward(item.name, language);
          const isLocked = !eligibility.isEligible;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                (isLocked || !item.inStock || claimed) && styles.cardLocked,
              ]}
              activeOpacity={0.85}
              disabled={claimed}
              onPress={() => handleRewardPress(item)}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.radio, isSelected && styles.radioOn]} />
                {localized.imageName ? (
                  <View style={styles.rewardIconWrap}>
                    <AppIcon name={localized.imageName} size={32} />
                  </View>
                ) : null}
              </View>
              <Text style={styles.name}>{localized.title || tt(item.name)}</Text>
              {isLocked ? (
                <Text style={styles.requirementHint}>
                  {t('unlocksAt', {target: eligibility.requiredLabel}) ||
                    `Unlocks at ${eligibility.requiredLabel}`}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.stock,
                  item.inStock ? styles.inStock : styles.outStock,
                ]}>
                {item.inStock ? t('available') || 'IN STOCK' : 'OUT OF STOCK'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!loading && rewards.length === 0 ? (
        <Text style={styles.empty}>No rewards are available right now.</Text>
      ) : null}
      <PrimaryButton
        title="CONTINUE"
        onPress={continueNext}
        disabled={claimed || !selectedId}
      />
    </ScreenLayout>
  );
};

export default MilestoneRewardSelectScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 18,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
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
    minHeight: 120,
  },
  cardSelected: {
    borderColor: Colors.templeGold,
    backgroundColor: '#FFF6E8',
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
  requirementHint: {
    fontSize: 12,
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
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
});
