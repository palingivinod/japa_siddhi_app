import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import AppIcon from '../../components/icons/AppIcon';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';
import {
  checkRewardEligibility,
  getLocalizedReward,
  sortRewardsCanonical,
} from '../../utils/rewardContent';

type RewardItem = {
  id: number | string;
  name: string;
  stock?: number;
  inStock?: boolean;
  description?: string;
  emoji?: string;
};

const DEFAULT_REWARDS: RewardItem[] = [
  {id: 1, name: 'Rudrakshi Mala', inStock: true},
  {id: 2, name: 'Tulasi Mala', inStock: true},
  {id: 3, name: 'Pasupu Mala', inStock: true},
  {id: 4, name: 'Karungali Mala', inStock: true},
  {id: 5, name: 'Spatik Mala', inStock: true},
  {id: 6, name: 'Green Agate', inStock: true},
  {id: 7, name: 'Yellow Agate', inStock: true},
];

const AvailableRewardsScreen = () => {
  const {t, tt, language} = useLanguage();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [userTotalJapas, setUserTotalJapas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setRawError(null);
    try {
      const [response, milestoneRes] = await Promise.all([
        apiService
          .get('/challenges/rewards')
          .catch(() => apiService.get('/admin/rewards')),
        apiService.get('/japa/milestones').catch(() => null),
      ]);

      const milestoneData = milestoneRes?.data?.data || {};
      const total = Number(milestoneData.total || milestoneData.milestoneTotal || 0);
      setUserTotalJapas(total);

      const raw =
        response.data?.data?.rewards ||
        response.data?.data ||
        response.data?.rewards ||
        [];

      const rows: any[] = Array.isArray(raw) ? raw : [];

      if (rows.length > 0) {
        const mapped = rows.map((row: any) => ({
          id: row.id,
          name: String(row.name || ''),
          stock: Number(row.stock || 0),
          inStock: Number(row.stock ?? 1) > 0,
          emoji: row.emoji,
          description: row.description,
        }));
        setRewards(sortRewardsCanonical(mapped));
      } else {
        setRewards(DEFAULT_REWARDS);
      }
    } catch (err) {
      setRawError(err);
      // Fall back to default sacred rewards if offline or network issue
      setRewards(DEFAULT_REWARDS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCardPress = (item: RewardItem, localized: any) => {
    const eligibility = checkRewardEligibility(item.name, userTotalJapas, language);
    if (!eligibility.isEligible) {
      Alert.alert(
        t('rewardLockedTitle') || 'Reward Locked',
        t('rewardLockedMsg', {
          required: eligibility.requiredLabel,
          remaining: eligibility.remainingJapas.toLocaleString('en-IN'),
          current: userTotalJapas.toLocaleString('en-IN'),
        }) ||
          `This reward is available after ${eligibility.requiredLabel} Japas.\n\nYou need to complete ${eligibility.remainingJapas.toLocaleString()} more Japas to grab this reward.\n\nYour current completed Japas: ${userTotalJapas.toLocaleString()}`,
        [{text: t('ok') || 'OK'}],
      );
    } else {
      Alert.alert(
        localized.title || tt(item.name),
        `${localized.description || ''}\n\n${t('rewardEligibleMsg', {
          count: userTotalJapas.toLocaleString('en-IN'),
        }) || `✓ Eligible: You have completed ${userTotalJapas.toLocaleString()} Japas. Complete challenges or milestones to claim this reward for delivery.`}`,
        [{text: t('ok') || 'OK'}],
      );
    }
  };

  return (
    <ScreenLayout title={t('availableRewards') || 'Available Rewards'} tab="Rewards">
      {/* Banner / Info Header */}
      <View style={styles.banner}>
        <View style={styles.bannerIconWrap}>
          <Text style={styles.bannerEmoji}>🎁</Text>
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>
            {t('spiritualRewardsTitle') || 'Sacred Spiritual Rewards'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {t('spiritualRewardsSubtitle') ||
              'Explore our authentic collection of consecrated spiritual items. Total completed Japas: ' +
                userTotalJapas.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {loading ? <ActivityIndicator color={Colors.templeGold} style={styles.loader} /> : null}

      {error && rewards.length === 0 ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}

      <Text style={styles.sectionHeading}>
        {t('rewardsCatalog') || 'Available Rewards'}
      </Text>

      <View style={styles.listContainer}>
        {rewards.map(item => {
          const localized = getLocalizedReward(item.name, language);
          const eligibility = checkRewardEligibility(item.name, userTotalJapas, language);
          const isLocked = !eligibility.isEligible;

          return (
            <TouchableOpacity
              key={String(item.id)}
              style={[styles.rewardCard, isLocked && styles.rewardCardLocked]}
              activeOpacity={0.85}
              onPress={() => handleCardPress(item, localized)}>
              <View style={styles.cardHeader}>
                <View style={[styles.dot, isLocked && styles.dotLocked]}>
                  {localized.imageName ? (
                    <AppIcon name={localized.imageName} size={48} />
                  ) : (
                    <Text style={styles.emoji}>
                      {item.emoji || localized.emoji}
                    </Text>
                  )}
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.rewardName}>
                    {localized.title || tt(item.name)}
                  </Text>
                  <View style={styles.badgeRow}>
                    {isLocked ? (
                      <View style={styles.lockedBadge}>
                        <Text style={styles.lockedBadgeText}>
                          🔒 {t('unlocksAt', {target: eligibility.requiredLabel}) || `Unlocks at ${eligibility.requiredLabel}`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                          {eligibility.requiredJapas > 0
                            ? `✓ ${t('unlocked') || 'Unlocked'} (${eligibility.requiredLabel})`
                            : t('available') || tt('Available')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.description}>
                {localized.description || tt(item.description || '')}
              </Text>
              {isLocked ? (
                <Text style={styles.remainingHint}>
                  {t('needMoreJapasReward', {
                    count: eligibility.remainingJapas.toLocaleString('en-IN'),
                  }) || `Need ${eligibility.remainingJapas.toLocaleString()} more Japas to grab this reward`}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenLayout>
  );
};

export default AvailableRewardsScreen;

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF4E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerEmoji: {
    fontSize: 24,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
    includeFontPadding: true,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#5C4A38',
    lineHeight: 19,
    includeFontPadding: true,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
    includeFontPadding: true,
  },
  loader: {
    marginVertical: 20,
  },
  listContainer: {
    paddingBottom: 24,
  },
  rewardCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
    includeFontPadding: true,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#EBF7EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: Colors.leafGreen,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    includeFontPadding: true,
  },
  lockedBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  lockedBadgeText: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    includeFontPadding: true,
  },
  rewardCardLocked: {
    backgroundColor: '#FAF7F0',
    borderColor: '#D8CAB0',
  },
  dotLocked: {
    backgroundColor: '#EBE2D2',
  },
  description: {
    fontSize: 13.5,
    color: '#3E3024',
    lineHeight: 22,
    includeFontPadding: true,
  },
  remainingHint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#B45309',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: 'hidden',
    includeFontPadding: true,
  },
});
