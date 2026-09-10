import React, {useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const ChallengeRewardConfirmScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const challengeId = Number(route.params?.id || 0);
  const rewardId = Number(route.params?.rewardId || 0);
  const rewardName = String(route.params?.rewardName || 'Reward');
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!challengeId || !rewardId) {
      Alert.alert('Reward', 'Missing reward details.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post(`/challenges/${challengeId}/rewards/claim`, {
        rewardId,
      });
      navigation.replace('ChallengeRewardClaimed', {
        id: challengeId,
        rewardId,
        rewardName,
      });
    } catch (err) {
      Alert.alert('Reward', getApiError(err, 'Could not confirm reward.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Reward Selected" showBack tab="JapaHub">
      <View style={styles.checkWrap}>
        <View style={styles.checkCircle}>
          <Text style={styles.check}>✓</Text>
        </View>
      </View>
      <Text style={styles.name}>{rewardName}</Text>
      <Text style={styles.sub}>Your selected Mala</Text>

      <View style={styles.card}>
        <View style={styles.dot}>
          <View style={styles.dotInner} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.policyTitle}>Reward Policy</Text>
          <Text style={styles.policy}>One user • One Mala</Text>
          <Text style={styles.policy}>
            Reward selection cannot be changed after confirmation.
          </Text>
        </View>
      </View>

      <PrimaryButton
        title={saving ? 'CONFIRMING...' : 'CONFIRM SELECTION'}
        onPress={confirm}
        disabled={saving}
      />
    </ScreenLayout>
  );
};

export default ChallengeRewardConfirmScreen;

const styles = StyleSheet.create({
  checkWrap: {alignItems: 'center', marginTop: 28, marginBottom: 16},
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: Colors.sacredBrown,
    fontSize: 42,
    fontWeight: '700',
  },
  name: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
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
  policyTitle: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  policy: {
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
});
