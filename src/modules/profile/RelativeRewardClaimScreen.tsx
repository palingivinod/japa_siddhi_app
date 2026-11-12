import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {checkRewardEligibility, getLocalizedReward} from '../../utils/rewardContent';

const RelativeRewardClaimScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t, language} = useLanguage();

  const paramRewardId = Number(route.params?.rewardId || 0);
  const paramRewardName = String(route.params?.rewardName || 'Reward');
  const paramExtra = Number(route.params?.extraJapas || 0);
  const paramTarget = Number(route.params?.unlockTarget || 0);

  const [loading, setLoading] = useState(true);
  const [rewardId, setRewardId] = useState(paramRewardId);
  const [rewardName, setRewardName] = useState(paramRewardName);
  const [totalJapas, setTotalJapas] = useState(0);
  const [unlockTarget, setUnlockTarget] = useState(paramTarget);
  const [extraJapas, setExtraJapas] = useState(paramExtra);
  const [claimTarget, setClaimTarget] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [inStock, setInStock] = useState(true);

  const localized = getLocalizedReward(rewardName, language);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get(
        `/japa/relative-rewards/id/${paramRewardId || rewardId}`,
      );
      const data = res.data?.data || {};
      setRewardId(Number(data.rewardId || paramRewardId || 0));
      setRewardName(String(data.rewardName || paramRewardName));
      setTotalJapas(Number(data.total || 0));
      setUnlockTarget(Number(data.unlockTarget || data.target || paramTarget || 0));
      setExtraJapas(Number(data.extraJapas || paramExtra || 0));
      setClaimTarget(Number(data.claimTarget || 0));
      setClaimed(Boolean(data.claimed));
      setInStock(data.inStock !== false);
    } catch (err) {
      Alert.alert(
        t('rewards') || 'Rewards',
        getApiError(err, t('couldNotLoadRewards')),
      );
    } finally {
      setLoading(false);
    }
  }, [paramExtra, paramRewardId, paramRewardName, paramTarget, rewardId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const eligibility = checkRewardEligibility(
    rewardName,
    totalJapas,
    language,
    extraJapas,
    unlockTarget,
  );

  const onGrab = () => {
    if (claimed) {
      Alert.alert(
        t('rewards') || 'Rewards',
        t('marakataAlreadyClaimed') ||
          'You have already grabbed this reward.',
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
          extra: extraJapas.toLocaleString('en-IN'),
        }) ||
          `You can grab this after present + ${extraJapas.toLocaleString('en-IN')} Japas.`,
      );
      return;
    }
    if (!rewardId) {
      Alert.alert(t('rewards'), t('missingRewardDetails'));
      return;
    }
    navigation.navigate('MilestoneRewardAddress', {
      target: claimTarget || unlockTarget,
      rewardId,
      rewardName,
      claimKind: 'relative',
    });
  };

  return (
    <ScreenLayout
      title={localized.title || rewardName}
      showBack
      tab="Rewards">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{localized.title || rewardName}</Text>
        <Text style={styles.description}>
          {localized.description ||
            'Complete your personal present + count target to grab this reward.'}
        </Text>

        {loading ? (
          <ActivityIndicator color={Colors.templeGold} style={styles.loader} />
        ) : (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Your japas: {totalJapas.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.infoText}>
                Unlock rule: present + {extraJapas.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.infoText}>
                Your target: {unlockTarget.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.infoText}>
                {eligibility.isEligible
                  ? t('youAreEligibleForReward') || 'You are eligible to grab this reward.'
                  : t('needMoreJapasReward', {
                      count: eligibility.remainingJapas.toLocaleString('en-IN'),
                    }) ||
                    `Need ${eligibility.remainingJapas.toLocaleString('en-IN')} more Japas.`}
              </Text>
              {!inStock ? (
                <Text style={[styles.infoText, styles.oos]}>
                  {t('outOfStockRewardMsg') || 'Currently out of stock.'}
                </Text>
              ) : null}
              {claimed ? (
                <Text style={[styles.infoText, styles.claimed]}>
                  Already claimed for this reward track.
                </Text>
              ) : null}
            </View>

            <PrimaryButton
              title={
                claimed
                  ? t('rewardClaimed') || 'CLAIMED'
                  : t('clickHereToGrabReward') || 'GRAB REWARD'
              }
              onPress={onGrab}
              disabled={claimed || !inStock || !eligibility.isEligible}
            />
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

export default RelativeRewardClaimScreen;

const styles = StyleSheet.create({
  scroll: {paddingBottom: 40},
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  description: {
    color: '#4A3B2C',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  loader: {marginVertical: 24},
  infoBox: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 18,
    gap: 6,
  },
  infoText: {
    color: Colors.sacredBrown,
    fontSize: 14,
    fontWeight: '600',
  },
  oos: {color: '#B45309'},
  claimed: {color: Colors.leafGreen},
});
