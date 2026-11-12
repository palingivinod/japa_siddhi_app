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
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import AppIcon from '../../components/icons/AppIcon';
import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import {getStoredUser} from '../../services/session';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {
  checkRewardEligibility,
  getLocalizedReward,
  MARAKATA_SHIVLING_EXTRA_JAPAS,
} from '../../utils/rewardContent';
import {
  MARAKATA_SHIVLING_CLAIM_TARGET,
  MARAKATA_SHIVLING_REWARD_NAME,
  resolveMarakataUnlockTarget,
} from '../../utils/marakataShivling';

const MarakataShivlingClaimScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t, language} = useLanguage();
  const paramRewardId = Number(route.params?.rewardId || 0);
  const paramRewardName = String(
    route.params?.rewardName || MARAKATA_SHIVLING_REWARD_NAME,
  );

  const [loading, setLoading] = useState(true);
  const [rewardId, setRewardId] = useState(paramRewardId);
  const [rewardName, setRewardName] = useState(paramRewardName);
  const [totalJapas, setTotalJapas] = useState(0);
  const [unlockTarget, setUnlockTarget] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [isRetry, setIsRetry] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [showSankalp, setShowSankalp] = useState(false);
  const [sankalpChecks, setSankalpChecks] = useState([
    false,
    false,
    false,
    false,
    false,
  ]);

  const sankalpItems = [
    t('banaSankalp1'),
    t('banaSankalp2'),
    t('banaSankalp3'),
    t('banaSankalp4'),
    t('banaSankalp5'),
  ];
  const allSankalpAccepted = sankalpChecks.every(Boolean);
  const localized = getLocalizedReward(rewardName, language);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getStoredUser();
      const userId = stored?.id || stored?.userId || 'anon';
      let serverTarget = 0;
      let serverTotal = 0;
      let serverRewardId = paramRewardId;
      let serverRewardName = paramRewardName;
      let serverClaimed = false;
      let serverInStock = true;

      try {
        const res = await apiService.get(
          '/japa/relative-rewards/marakata-shivling',
        );
        const data = res.data?.data || {};
        serverTotal = Number(data.total || 0);
        serverTarget = Number(data.unlockTarget || data.target || 0);
        serverRewardId = Number(data.rewardId || serverRewardId || 0);
        serverRewardName = String(data.rewardName || serverRewardName);
        serverClaimed = Boolean(data.claimed);
        setIsRetry(Boolean(data.isRetry));
        // Stock qty is a label only — unavailable only when admin marked OOS.
        if (
          data.adminMarkedOos === true ||
          data.adminMarkedOos === 1 ||
          data.inStock === false
        ) {
          serverInStock = false;
        } else {
          serverInStock = true;
        }
      } catch {
        setIsRetry(false);
        const milestoneRes = await apiService
          .get('/japa/milestones')
          .catch(() => null);
        const milestoneData = milestoneRes?.data?.data || {};
        serverTotal = Number(
          milestoneData.total || milestoneData.milestoneTotal || 0,
        );
      }

      const locked = await resolveMarakataUnlockTarget(
        userId,
        serverTotal,
        serverTarget > 0 ? serverTarget : undefined,
      );
      setTotalJapas(serverTotal);
      setUnlockTarget(locked);
      setClaimed(serverClaimed);
      setInStock(serverInStock);
      if (serverRewardId) {
        setRewardId(serverRewardId);
      }
      if (serverRewardName) {
        setRewardName(serverRewardName);
      }
    } catch (err) {
      Alert.alert(
        t('rewards') || 'Rewards',
        getApiError(err, t('couldNotLoadRewards')),
      );
    } finally {
      setLoading(false);
    }
  }, [paramRewardId, paramRewardName, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const eligibility = checkRewardEligibility(
    rewardName,
    totalJapas,
    language,
    undefined,
    unlockTarget,
  );

  const toggleSankalp = (index: number) => {
    setSankalpChecks(prev =>
      prev.map((value, i) => (i === index ? !value : value)),
    );
  };

  const onGrab = () => {
    if (claimed) {
      Alert.alert(
        t('rewards'),
        t('marakataAlreadyClaimed') ||
          'You have already grabbed Marakata Shivling. It can be claimed only once.',
      );
      return;
    }
    if (!inStock) {
      Alert.alert(
        t('outOfStockTitle') || 'Out of Stock',
        t('outOfStockRewardMsg') ||
          'This reward item is currently out of stock.',
      );
      return;
    }
    if (!eligibility.isEligible) {
      Alert.alert(
        localized.title || rewardName,
        t('marakataNotEligibleYet', {
          present: totalJapas.toLocaleString('en-IN'),
          target: unlockTarget.toLocaleString('en-IN'),
          remaining: eligibility.remainingJapas.toLocaleString('en-IN'),
          extra: MARAKATA_SHIVLING_EXTRA_JAPAS.toLocaleString('en-IN'),
        }) ||
          `You can grab this after present + ${MARAKATA_SHIVLING_EXTRA_JAPAS} Japas.`,
      );
      return;
    }
    setShowSankalp(true);
  };

  const continueToAddress = () => {
    if (!allSankalpAccepted) {
      Alert.alert(t('baanalingamSeva') || 'Sankalp', t('banaSankalpRequired'));
      return;
    }
    if (!rewardId) {
      Alert.alert(t('rewards'), t('missingRewardDetails'));
      return;
    }
    navigation.navigate('MilestoneRewardAddress', {
      target: MARAKATA_SHIVLING_CLAIM_TARGET,
      rewardId,
      rewardName,
      claimKind: 'marakata_shivling',
    });
  };

  return (
    <ScreenLayout
      title={localized.title || rewardName}
      showBack
      tab="Rewards">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {localized.imageName ? (
            <AppIcon name={localized.imageName} size={96} />
          ) : (
            <Text style={styles.emoji}>{localized.emoji || '🕉️'}</Text>
          )}
        </View>
        <Text style={styles.title}>{localized.title || rewardName}</Text>
        <Text style={styles.description}>
          {localized.description}
        </Text>

        {loading ? (
          <ActivityIndicator color={Colors.templeGold} style={styles.loader} />
        ) : (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {t('marakataUnlockRule', {
                  present: totalJapas.toLocaleString('en-IN'),
                  extra: MARAKATA_SHIVLING_EXTRA_JAPAS.toLocaleString('en-IN'),
                  target: unlockTarget.toLocaleString('en-IN'),
                }) ||
                  `You can grab this reward after your present japa count + ${MARAKATA_SHIVLING_EXTRA_JAPAS} (${totalJapas.toLocaleString('en-IN')} + ${MARAKATA_SHIVLING_EXTRA_JAPAS} = ${unlockTarget.toLocaleString('en-IN')}).`}
              </Text>
              {eligibility.isEligible ? (
                <Text style={styles.eligibleText}>
                  {t('marakataEligibleHint') ||
                    'You have completed the required japas. Tap Grab to continue.'}
                </Text>
              ) : (
                <Text style={styles.remainingText}>
                  {t('needMoreJapasReward', {
                    count: eligibility.remainingJapas.toLocaleString('en-IN'),
                  })}
                </Text>
              )}
            </View>

            {claimed ? (
              <Text style={styles.claimed}>
                {t('marakataAlreadyClaimed') || t('rewardClaimed')}
              </Text>
            ) : null}
            {isRetry && !claimed ? (
              <Text style={styles.retryBanner}>
                {t('retryRewardNotice') ||
                  'Previous order was cancelled. You have 1 final chance to grab this reward.'}
              </Text>
            ) : null}
            {!claimed && !inStock ? (
              <Text style={styles.oosBanner}>
                {t('outOfStockRewardMsg') ||
                  'This reward item is currently out of stock.'}
              </Text>
            ) : null}

            {!claimed &&
            inStock &&
            eligibility.isEligible &&
            !showSankalp ? (
              <PrimaryButton
                title={t('clickHereToGrabReward') || 'Grab'}
                onPress={onGrab}
              />
            ) : null}

            {!claimed && inStock && showSankalp ? (
              <View style={styles.sankalpSection}>
                <Text style={styles.sankalpHeading}>
                  {t('banaSankalpHeading')}
                </Text>
                {sankalpItems.map((label, index) => {
                  const checked = sankalpChecks[index];
                  return (
                    <TouchableOpacity
                      key={`sankalp-${index}`}
                      style={styles.sankalpRow}
                      activeOpacity={0.85}
                      onPress={() => toggleSankalp(index)}>
                      <View
                        style={[
                          styles.sankalpCheckbox,
                          checked && styles.sankalpCheckboxOn,
                        ]}>
                        {checked ? (
                          <Text style={styles.sankalpCheckMark}>✓</Text>
                        ) : null}
                      </View>
                      <Text style={styles.sankalpText}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
                <PrimaryButton
                  title={
                    allSankalpAccepted
                      ? t('clickHereToGrabReward') || 'Grab'
                      : t('banaSankalpRequired')
                  }
                  onPress={continueToAddress}
                  disabled={!allSankalpAccepted}
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

export default MarakataShivlingClaimScreen;

const styles = StyleSheet.create({
  scroll: {paddingBottom: 32},
  hero: {
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    backgroundColor: '#FFF4E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emoji: {fontSize: 42},
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 22,
    color: '#3E3024',
    marginBottom: 16,
  },
  loader: {marginVertical: 20},
  infoBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: 14,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '600',
    color: '#92400E',
  },
  eligibleText: {
    marginTop: 8,
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  remainingText: {
    marginTop: 8,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#B45309',
  },
  claimed: {
    marginBottom: 12,
    color: Colors.leafGreen,
    fontWeight: '700',
    textAlign: 'center',
  },
  oosBanner: {
    marginBottom: 12,
    color: Colors.error,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  retryBanner: {
    marginBottom: 12,
    color: '#92400E',
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
    lineHeight: 18,
  },
  sankalpSection: {
    marginTop: 8,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  sankalpHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  sankalpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sankalpCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    marginRight: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sankalpCheckboxOn: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  sankalpCheckMark: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  sankalpText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
});
