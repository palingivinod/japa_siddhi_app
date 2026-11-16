import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
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
  BAANALINGAM_JAPAS,
  checkRewardEligibility,
  getLocalizedReward,
  isBaanalingamRewardName,
  isCanonicalReward,
  isMarakataShivlingName,
  MARAKATA_SHIVLING_JAPAS,
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

const RewardThumb = ({
  imageUrl,
  imageName,
  emoji,
  locked,
}: {
  imageUrl?: string | null;
  imageName?: string;
  emoji?: string;
  locked?: boolean;
}) => {
  const photo = resolveMediaUrl(imageUrl);
  const [loading, setLoading] = useState(Boolean(photo));
  const [failed, setFailed] = useState(false);

  if (photo && !failed) {
    return (
      <View style={[styles.dot, locked && styles.dotLocked]}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={Colors.templeGold}
            style={styles.photoLoader}
          />
        ) : null}
        <Image
          source={{uri: photo, cache: 'force-cache'}}
          style={[styles.photo, loading && styles.photoHidden]}
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      </View>
    );
  }
  return (
    <View style={[styles.dot, locked && styles.dotLocked]}>
      {imageName ? (
        <AppIcon name={imageName as any} size={48} />
      ) : (
        <Text style={styles.emoji}>{emoji || '🎁'}</Text>
      )}
    </View>
  );
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
  const [hasBaanalingamOrder, setHasBaanalingamOrder] = useState(false);
  const [hasMarakataOrder, setHasMarakataOrder] = useState(false);
  const [banaPopupStep, setBanaPopupStep] = useState<0 | 1 | 2>(0);
  const [pendingBanaItem, setPendingBanaItem] = useState<RewardItem | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setRawError(null);
    try {
      const stored = await getStoredUser();
      const userId = stored?.id || stored?.userId || 'anon';

      const [response, milestoneRes, marakataRes, relativeRes, ordersRes] =
        await Promise.all([
          apiService
            .get('/challenges/rewards')
            .catch(() => apiService.get('/admin/rewards')),
          apiService.get('/japa/milestones').catch(() => null),
          apiService
            .get('/japa/relative-rewards/marakata-shivling')
            .catch(() => null),
          apiService.get('/japa/relative-rewards').catch(() => null),
          apiService.get('/orders').catch(() => null),
        ]);

      const orderRows = Array.isArray(ordersRes?.data?.data)
        ? ordersRes.data.data
        : Array.isArray(ordersRes?.data)
          ? ordersRes.data
          : [];
      const activeOrders = orderRows.filter((row: any) => {
        const status = String(
          row?.orderStatus || row?.order_status || '',
        ).toUpperCase();
        return status !== 'CANCELLED' && status !== 'CANCELED';
      });
      setHasBaanalingamOrder(
        activeOrders.some((row: any) => {
          const type = String(row?.orderType || row?.order_type || '').toUpperCase();
          const name = String(
            row?.itemName || row?.item_name || row?.product || '',
          ).toLowerCase();
          const num = String(row?.orderNumber || row?.order_number || '');
          return (
            type === 'BANA_LINGAM' ||
            name.includes('baanalingam') ||
            name.includes('banalingam') ||
            num.startsWith('BL-') ||
            num.startsWith('#BL-')
          );
        }),
      );
      setHasMarakataOrder(
        activeOrders.some((row: any) => {
          const name = String(
            row?.itemName || row?.item_name || row?.product || '',
          ).toLowerCase();
          if (name.includes('chakra') || name.includes('yantra')) {
            return false;
          }
          return (
            ((name.includes('marakata') || name.includes('marakatha')) &&
              (name.includes('shiv') || name.includes('ling'))) ||
            (name.includes('aventurine') && name.includes('shiv'))
          );
        }),
      );

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
            const name = String(row.name || '');
            // Baanalingam / Markata are absolute fixed unlocks (5k / 8k).
            const unlockMode =
              isMarakataShivlingName(name) || isBaanalingamRewardName(name)
                ? 'fixed'
                : String(row.unlockMode || row.unlock_mode || '')
                      .toLowerCase() === 'relative'
                  ? 'relative'
                  : 'fixed';
            let eligibilityCriteria = Number(
              row.eligibilityCriteria ?? row.eligibility_criteria ?? 0,
            );
            if (isBaanalingamRewardName(name) && eligibilityCriteria <= 0) {
              eligibilityCriteria = BAANALINGAM_JAPAS;
            }
            if (isMarakataShivlingName(name) && eligibilityCriteria <= 0) {
              eligibilityCriteria = MARAKATA_SHIVLING_JAPAS;
            }
            return {
              id: row.id,
              name,
              stock,
              inStock: !explicitOut,
              emoji: row.emoji,
              description: row.description,
              eligibilityCriteria,
              unlockMode: unlockMode as 'fixed' | 'relative',
              imageUrl: row.imageUrl || row.image_url || null,
            };
          })
          .filter(row => row.name && (isCanonicalReward(row.name) || Boolean(row.id)));

        setRewards(sortRewardsCanonical(mapped));
        // Prefetch admin photos so thumbs appear faster on scroll.
        mapped.forEach(row => {
          const uri = resolveMediaUrl(row.imageUrl);
          if (uri) {
            Image.prefetch(uri).catch(() => undefined);
          }
        });
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
        setMarakataTarget(MARAKATA_SHIVLING_JAPAS);
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
    const extra = Number(item.eligibilityCriteria || 0);
    return {
      unlockTarget: extra > 0 ? userTotalJapas + extra : 0,
      extraJapas: extra,
    };
  };

  const eligibilityFor = (item: RewardItem) => {
    // Markata never unlocks if Baanalingam already ordered (even at 8k).
    if (isMarakataShivlingName(item.name) && hasBaanalingamOrder) {
      return {
        requiredJapas: MARAKATA_SHIVLING_JAPAS,
        requiredLabel: '8,000 (8k)',
        isEligible: false,
        remainingJapas: 0,
        blockedByBaanalingam: true as const,
      };
    }
    if (isBaanalingamRewardName(item.name) && hasMarakataOrder) {
      return {
        requiredJapas: BAANALINGAM_JAPAS,
        requiredLabel: '5,000',
        isEligible: false,
        remainingJapas: 0,
        blockedByMarakata: true as const,
      };
    }
    const isRelative = item.unlockMode === 'relative';
    const meta = isRelative ? relativeMetaFor(item) : null;
    const criteria =
      Number(item.eligibilityCriteria || 0) ||
      (isBaanalingamRewardName(item.name)
        ? BAANALINGAM_JAPAS
        : isMarakataShivlingName(item.name)
          ? MARAKATA_SHIVLING_JAPAS
          : 0);
    return checkRewardEligibility(
      item.name,
      userTotalJapas,
      language,
      criteria,
      isRelative ? meta?.unlockTarget : undefined,
    );
  };

  const openBanaOrderForm = (item: RewardItem) => {
    setBanaPopupStep(0);
    setPendingBanaItem(null);
    navigation.navigate('BanaLingam');
  };

  const handleCardPress = (item: RewardItem, localized: any) => {
    const eligibility = eligibilityFor(item) as ReturnType<
      typeof checkRewardEligibility
    > & {
      blockedByBaanalingam?: boolean;
      blockedByMarakata?: boolean;
    };
    const description = String(item.description || localized.description || '').trim();
    const title = localized.matched
      ? localized.title || tt(item.name)
      : String(item.name || localized.title || '').trim();
    const message = (line: string) =>
      description ? `${description}\n\n${line}` : line;
    const outOfStock = item.inStock === false;
    const isRelative = item.unlockMode === 'relative';
    const isBaanalingam = isBaanalingamRewardName(item.name);
    const isMarakata = isMarakataShivlingName(item.name);

    if (outOfStock) {
      Alert.alert(
        title,
        description ||
          t('outOfStockRewardMsg') ||
          'This reward item is currently out of stock.',
        [{text: t('ok')}],
      );
      return;
    }

    if (eligibility.blockedByBaanalingam) {
      Alert.alert(
        title,
        message(
          t('marakataBlockedByBaanalingam') ||
            'You already ordered/received Baanalingam, so Markata Shivalinga is not available — even at 8,000 Japas.',
        ),
        [{text: t('ok')}],
      );
      return;
    }
    if (eligibility.blockedByMarakata) {
      Alert.alert(
        title,
        message(
          t('shivaLingaAlreadyOrderedMessage', {
            item: t('marakataShivlingItemName') || 'Marakata Shivling',
          }) ||
            'You have already ordered/received Marakata Shivling, so you are not eligible to order Baanalingam.',
        ),
        [{text: t('ok')}],
      );
      return;
    }

    if (isRelative) {
      const meta = relativeMetaFor(item);
      const extra = meta.extraJapas || Number(item.eligibilityCriteria || 0);
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
      Alert.alert(title, message(t('youAreEligibleForReward')), [
        {text: t('ok')},
        {
          text: t('clickHereToGrabReward'),
          onPress: () =>
            navigation.navigate('RelativeRewardClaim', {
              rewardId: item.id,
              rewardName: item.name,
              extraJapas: extra,
              unlockTarget: meta.unlockTarget,
            }),
        },
      ]);
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

    if (isBaanalingam) {
      setPendingBanaItem(item);
      setBanaPopupStep(1);
      return;
    }

    if (isMarakata) {
      Alert.alert(title, message(t('youAreEligibleForReward')), [
        {text: t('ok')},
        {
          text: t('clickHereToGrabReward'),
          onPress: () =>
            navigation.navigate('MarakataShivlingClaim', {
              rewardId: item.id,
              rewardName: item.name,
            }),
        },
      ]);
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
                <RewardThumb
                  imageUrl={item.imageUrl}
                  imageName={localized.matched ? localized.imageName : undefined}
                  emoji={item.emoji || localized.emoji}
                  locked={isLocked}
                />
                <View style={styles.headerInfo}>
                  <Text style={styles.rewardName}>
                    {localized.matched
                      ? localized.title || tt(item.name)
                      : String(item.name || localized.title || '').trim()}
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
              {outOfStock ? null : !eligibility.isEligible ? (
                <Text style={styles.remainingHint}>
                  {(eligibility as any).blockedByBaanalingam
                    ? t('marakataBlockedByBaanalingam') ||
                      'Already ordered Baanalingam — Markata Shivalinga is not available.'
                    : (eligibility as any).blockedByMarakata
                      ? t('shivaLingaAlreadyOrderedMessage', {
                          item:
                            t('marakataShivlingItemName') || 'Marakata Shivling',
                        })
                      : item.unlockMode === 'relative'
                        ? (() => {
                            const meta = relativeMetaFor(item);
                            const extra =
                              meta.extraJapas ||
                              Number(item.eligibilityCriteria || 0);
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
                  {!(eligibility as any).blockedByBaanalingam &&
                  !(eligibility as any).blockedByMarakata ? (
                    <>
                      {'\n'}
                      {t('needMoreJapasReward', {
                        count: eligibility.remainingJapas.toLocaleString('en-IN'),
                      }) ||
                        `Need ${eligibility.remainingJapas.toLocaleString()} more Japas to grab this reward`}
                    </>
                  ) : null}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={banaPopupStep > 0}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setBanaPopupStep(0);
          setPendingBanaItem(null);
        }}>
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            <ScrollView
              style={styles.popupScroll}
              showsVerticalScrollIndicator={false}>
              {banaPopupStep === 1 ? (
                <>
                  <Text style={styles.popupTitle}>
                    {t('baanalingamEligibilityNoteTitle') ||
                      'Note: Reward Eligibility – Important'}
                  </Text>
                  <Text style={styles.popupBody}>
                    {t('baanalingamEligibilityNoteBody') ||
                      t('baanalingamMarkataWarning')}
                  </Text>
                  <TouchableOpacity
                    style={styles.popupPrimaryBtn}
                    activeOpacity={0.85}
                    onPress={() => setBanaPopupStep(2)}>
                    <Text style={styles.popupPrimaryBtnText}>
                      {t('ok') || 'OK'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.popupTitle}>
                    {t('baanalingamTeamAdviceTitle') ||
                      'Note: An Advice by Team Japa Siddhi'}
                  </Text>
                  <Text style={styles.popupAdviceBody}>
                    {t('baanalingamTeamAdviceBody')}
                  </Text>
                  <View style={styles.popupBtnRow}>
                    <TouchableOpacity
                      style={styles.popupSecondaryBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        setBanaPopupStep(0);
                        setPendingBanaItem(null);
                      }}>
                      <Text style={styles.popupSecondaryBtnText}>
                        {t('goBack') || t('skipForNow') || 'Back'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.popupPrimaryBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (pendingBanaItem) {
                          openBanaOrderForm(pendingBanaItem);
                        } else {
                          setBanaPopupStep(0);
                          navigation.navigate('BanaLingam');
                        }
                      }}>
                      <Text style={styles.popupPrimaryBtnText}>
                        {t('continueAnyway') || 'Continue'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  photoHidden: {
    opacity: 0,
  },
  photoLoader: {
    position: 'absolute',
    zIndex: 1,
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
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 18, 9, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  popupCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.templeGold,
    maxHeight: '88%',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  popupScroll: {
    flexGrow: 0,
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  popupBody: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.sacredBrown,
    lineHeight: 22,
    marginBottom: 16,
  },
  popupAdviceBody: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.leafGreen,
    lineHeight: 23,
    marginBottom: 16,
    backgroundColor: '#F0F7EC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C5DDB8',
  },
  popupBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  popupPrimaryBtn: {
    flex: 1,
    backgroundColor: Colors.templeGold,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  popupPrimaryBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  popupSecondaryBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
  },
  popupSecondaryBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
  },
});
