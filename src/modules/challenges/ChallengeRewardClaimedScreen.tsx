import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';

const ChallengeRewardClaimedScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const challengeId = Number(route.params?.id || 0);
  const rewardName = String(route.params?.rewardName || 'Reward');

  return (
    <ScreenLayout title="Reward Claimed" showBack tab="JapaHub">
      <SuccessHero
        title="Reward claimed successfully"
        subtitle={rewardName}
      />

      <View style={styles.card}>
        <View style={styles.dot}>
          <View style={styles.dotInner} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.cardTitle}>Claim details</Text>
          <Text style={styles.cardBody}>
            One Mala • Eligibility consumed. Stock updated automatically.
          </Text>
        </View>
      </View>

      <PrimaryButton
        title="VIEW REWARD STATUS"
        onPress={() =>
          navigation.replace('ChallengeRewardDelivery', {
            id: challengeId,
            rewardName,
          })
        }
      />
    </ScreenLayout>
  );
};

export default ChallengeRewardClaimedScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.white,
  },
  copy: {flex: 1},
  cardTitle: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  cardBody: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
