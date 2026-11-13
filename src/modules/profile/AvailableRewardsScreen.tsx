import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import AppIcon from '../../components/icons/AppIcon';
import apiService from '../../services/apiService';
import {resolveMediaUrl} from '../../services/profilePhoto';
import {getStoredUser} from '../../services/session';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';
import {
  checkRewardEligibility,
  getLocalizedReward,
  isCanonicalReward,
  isMarakataShivlingName,
  MARAKATA_SHIVLING_EXTRA_JAPAS,
  sortRewardsCanonical,
} from '../../utils/rewardContent';
import {resolveMarakataUnlockTarget} from '../../utils/marakataShivling';

type RewardItem = {
  id: number | string;
  name: string;
  stock?: number;
  inStock?: boolean;
  description?: string;
  eligibilityCriteria?: number;
  unlockMode?: 'fixed' | 'relative';
  imageUrl?: string | null;
  emoji?: string;
};

const AvailableRewardsScreen = () => {
  const navigation = useNavigation<any>();
  const {t, tt, language} = useLanguage();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [userTotalJapas, setUserTotalJapas] = useState(0);
  const [marakataTarget, setMarakataTarget] = useState(0);
  const [relativeTargets, setRelativeTargets] = useState<
    Record<string, {unlockTarget: number; extraJapas: number}>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setRawError(null);
    try {
      const stored = await getStoredUser();
      const userId = stored?.id || stored?.userId || 'anon';

      const [response, milestoneRes, marakataRes, relativeRes] =
        await Promise.all([
          apiService
            .get('/challenges/rewards')
            .catch(() => apiService.get('/admin/rewards')),
          apiService.get('/japa/milestones').catch(() => null),
          apiService
            .get('/japa/relative-rewards/marakata-shivling')
            .catch(() => null),
          apiService.get('/japa/relative-rewards').catch(() => null),
        ]);

      const milestoneData = milestoneRes?.data?.data || {};
      const marakataData = marakataRes?.data?.data || {};
      const relativeData = relativeRes?.data?.data || {};
      const total = Number(
        relativeData.total ||
          marakataData.total ||
          milestoneData.total ||
          milestoneData.milestoneTotal ||
          0,
      );
      setUserTotalJapas(total);

      const locked = await resolveMarakataUnlockTarget(
        userId,
        total,
        Number(marakataData.unlockTarget || marakataData.target || 0) ||
          undefined,
      );
      setMarakataTarget(locked);

      const targetMap: Record<
        string,
        {unlockTarget: number; extraJapas: number}
      > = {};
      const relativeList = Array.isArray(relativeData.rewards)
        ? relativeData.rewards
        : [];
      relativeList.forEach((row: any) => {
        const id = String(row.rewardId || row.id || '');
        if (!id) {
          return;
        }
        targetMap[id] = {
          unlockTarget: Number(row.unlockTarget || row.target || 0),
          extraJapas: Number(row.extraJapas || 0),
        };
      });
      setRelativeTargets(targetMap);

      const raw =
        response.data?.data?.rewards ||
        response.data?.data ||
        response.data?.rewards ||
        [];

      const rows: any[] = Array.isArray(raw) ? raw : [];

      if (rows.length > 0) {
        const mapped = rows
          .map((row: any) => {
            const stock = Number(row.stock || 0);
            const adminOos =
              row.adminMarkedOos === true ||
              row.adminMarkedOos === 1 ||
              row.adminMarkedOos === '1' ||
              row.admin_marked_oos === 1 ||
              row.admin_marked_oos === '1' ||
              row.admin_marked_oos === true;
            // Qty is a label only — unavailable only when admin marked Out of Stock.
            const explicitOut =
              adminOos ||
              row.inStock === false ||
              row.inStock === 0 ||
              row.inStock === '0';
            const unlockMode =
              String(row.unlockMode || row.unlock_mode || '')
                .toLowerCase() === 'relative' ||
              isMarakataShivlingName(String(row.name || ''))
                ? 'relative'
                : 'fixed';
            return {
              id: row.id,
              name: String(row.name || ''),
              stock,
              inStock: !explicitOut,
              emoji: row.emoji,
              description: row.description,
              eligibilityCriteria: Number(
                row.eligibilityCriteria ?? row.eligibility_criteria ?? 0,
              ),
              unlockMode: unlockMode as 'fixed' | 'relative',
              imageUrl: row.imageUrl || row.image_url || null,
            };
          })
          .filter(row => row.name && (isCanonicalReward(row.name) || Boolean(row.id)));

        setRewards(sortRewardsCanonical(mapped));
      } else {
        setRewards([]);
        setError(t('unableToLoadRewards') || 'Unable to load rewards.');
      }
    } catch (err) {
      setRawError(err);
      setRewards([]);
      setError(t('unableToLoadRewards') || 'Unable to load rewards.');
      try {
        const stored = await getStoredUser();
        const locked = await resolveMarakataUnlockTarget(
          stored?.id || stored?.userId || 'anon',
          0,
        );
        setMarakataTarget(locked);
      } catch {
        setMarakataTarget(MARAKATA_SHIVLING_EXTRA_JAPAS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const relativeMetaFor = (item: RewardItem) => {
    const fromMap = relativeTargets[String(item.id)];
    if (fromMap?.unlockTarget) {
      return fromMap;
    }
    if (isMarakataShivlingName(item.name)) {
      return {
        unlockTarget: marakataTarget,
        extraJapas:
          Number(item.eligibilityCriteria || 0) || MARAKATA_SHIVLING_EXTRA_JAPAS,
      };
    }
    const extra = Number(item.eligibilityCriteria || 0);
    return {
      unlockTarget: extra > 0 ? userTotalJapas + extra : 0,
      extraJapas: extra,
    };
  };

  const eligibilityFor = (item: RewardItem) => {
    const isRelative =
      item.unlockMode === 'relative' || isMarakataShivlingName(item.name);
    const meta = isRelative ? relativeMetaFor(item) : null;
    return checkRewardEligibility(
      item.name,
      userTotalJapas,
      language,
      item.eligibilityCriteria,
      isRelative ? meta?.unlockTarget : undefined,
    );
  };

  const handleCardPress = (item: RewardItem, localized: any) => {
    const eligibility = eligibilityFor(item);
    const description = String(item.description || localized.description || '').trim();
    const title = localized.title || tt(item.name);
    const message = (line: string) =>
      description ? `${description}\n\n${line}` : line;
    const outOfStock = item.inStock === false;
    const isRelative =
      item.unlockMode === 'relative' || isMarakataShivlingName(item.name);

    if (outOfStock) {
      // OOS: description (or short OOS note) only — no present+N / count line.
      Alert.alert(
        title,
        description ||
          t('outOfStockRewardMsg') ||
          'This reward item is currently out of stock.',
        [{text: t('ok')}],
      );
      return;
    }

    if (isRelative) {
      const meta = relativeMetaFor(item);
      const extra =
        meta.extraJapas ||
        Number(item.eligibilityCriteria || 0) ||
        MARAKATA_SHIVLING_EXTRA_JAPAS;
      const lockedLine =
        t('marakataUnlockRule', {
          present: userTotalJapas.toLocaleString('en-IN'),
          extra: extra.toLocaleString('en-IN'),
          target: (meta.unlockTarget || eligibility.requiredJapas).toLocaleString(
            'en-IN',
          ),
        }) ||
        `Unlocks at present (${userTotalJapas.toLocaleString('en-IN')}) + ${extra.toLocaleString('en-IN')} = ${(meta.unlockTarget || eligibility.requiredJapas).toLocaleString('en-IN')} Japas.`;
      if (!eligibility.isEligible) {
        Alert.alert(
          title,
          message(
            `${lockedLine}\n\n${t('needMoreJapasReward', {
              count: eligibility.remainingJapas.toLocaleString('en-IN'),
            })}`,
          ),
          [{text: t('ok')}],
        );
        return;
      }
      Alert.alert(
        title,
        message(
          `${lockedLine}\n\n${t('marakataEligibleHint') || t('youAreEligibleForReward')}`,
        ),
        [
          {text: t('ok')},
          {
            text: t('clickHereToGrabReward'),
            onPress: () => {
              if (isMarakataShivlingName(item.name)) {
                navigation.navigate('MarakataShivlingClaim', {
                  rewardId: item.id,
                  rewardName: item.name,
                });
                return;
              }
              navigation.navigate('RelativeRewardClaim', {
                rewardId: item.id,
                rewardName: item.name,
                extraJapas: extra,
                unlockTarget: meta.unlockTarget,
              });
            },
          },
        ],
      );
      return;
    }

    if (!eligibility.isEligible) {
      Alert.alert(
        title,
        message(
          t('youAreNotEligibleReward', {
            count: userTotalJapas.toLocaleString('en-IN'),
            required: eligibility.requiredLabel,
          }),
        ),
        [{text: t('ok')}],
      );
      return;
    }
    Alert.alert(title, message(t('youAreEligibleForReward')), [
      {text: t('ok')},
      {
        text: t('clickHereToGrabReward'),
        onPress: () => navigation.navigate('MilestoneNotifications'),
      },
    ]);
  };

  return (
    <ScreenLayout title={t('availableRewards') || 'Available Rewards'} tab="Rewards">
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
          const eligibility = eligibilityFor(item);
          const outOfStock = item.inStock === false;
          const isLocked = !eligibility.isEligible || outOfStock;

          return (
            <TouchableOpacity
              key={String(item.id)}
              style={[styles.rewardCard, isLocked && styles.rewardCardLocked]}
              activeOpacity={0.85}
              onPress={() => handleCardPress(item, localized)}>
              <View style={styles.cardHeader}>
                <View style={[styles.dot, isLocked && styles.dotLocked]}>
                  {(() => {
                    const photo = resolveMediaUrl(item.imageUrl);
                    if (photo) {
                      return (
                        <Image source={{uri: photo}} style={styles.photo} />
                      );
                    }
                    if (localized.imageName) {
                      return <AppIcon name={localized.imageName} size={48} />;
                    }
                    return (
                      <Text style={styles.emoji}>
                        {item.emoji || localized.emoji}
                      </Text>
                    );
                  })()}
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.rewardName}>
                    {localized.title || tt(item.name)}
                  </Text>
                  {outOfStock ? (
                    <View style={styles.badgeRow}>
                      <View style={styles.oosBadge}>
                        <Text style={styles.oosText}>
                          {t('outOfStockTitle') || 'Out of Stock'}
                        </Text>
                      </View>
                    </View>
                  ) : !isLocked ? (
                    <View style={styles.badgeRow}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                          {eligibility.requiredJapas > 0
                            ? `✓ ${t('unlocked') || 'Unlocked'}`
                            : t('available') || tt('Available')}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text style={styles.description}>
                {item.description || localized.description || tt(item.description || '')}
              </Text>
              {outOfStock ? (
                // OOS: description + badge only — no present+N / count line.
                null
              ) : !eligibility.isEligible ? (
                <Text style={styles.remainingHint}>
                  {item.unlockMode === 'relative' ||
                  isMarakataShivlingName(item.name)
                    ? (() => {
                        const meta = relativeMetaFor(item);
                        const extra =
                          meta.extraJapas ||
                          Number(item.eligibilityCriteria || 0) ||
                          MARAKATA_SHIVLING_EXTRA_JAPAS;
                        const target =
                          meta.unlockTarget ||
                          eligibility.requiredJapas ||
                          userTotalJapas + extra;
                        return t('marakataUnlockRule', {
                          present: userTotalJapas.toLocaleString('en-IN'),
                          extra: extra.toLocaleString('en-IN'),
                          target: target.toLocaleString('en-IN'),
                        });
                      })()
                    : t('unlocksAt', {target: eligibility.requiredLabel}) ||
                      `Unlocks at ${eligibility.requiredLabel}`}
                  {'\n'}
                  {t('needMoreJapasReward', {
                    count: eligibility.remainingJapas.toLocaleString('en-IN'),
                  }) ||
                    `Need ${eligibility.remainingJapas.toLocaleString()} more Japas to grab this reward`}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
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
  photo: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  oosBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  oosText: {
    color: Colors.error,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
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
    lineHeight: 24,
    includeFontPadding: false,
    paddingBottom: 4,
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
