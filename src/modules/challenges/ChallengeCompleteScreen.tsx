import React, {useCallback, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StarPicker from '../common/StarPicker';
import SuccessHero from '../common/SuccessHero';

const ChallengeCompleteScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const challengeId = Number(route.params?.id || 0);
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!challengeId) {
        return;
      }
      apiService
        .get(`/challenges/${challengeId}`)
        .then(response => {
          setRewardClaimed(Boolean(response.data?.data?.rewardClaimed));
        })
        .catch(() => undefined);
    }, [challengeId]),
  );

  const submit = async () => {
    setSaving(true);
    try {
      await apiService.post(`/challenges/${challengeId}/rate`, {
        rating,
        feedback,
      });
      navigation.navigate('ChallengeLeaderboard', {id: challengeId});
    } catch (error) {
      Alert.alert('Rating', getApiError(error, 'Could not save rating.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Challenge Complete" showBack tab="JapaHub">
      <SuccessHero
        title="Well done!"
        subtitle="You completed the challenge."
      />
      <Text style={styles.section}>Rate your experience</Text>
      <StarPicker value={rating} onChange={setRating} />
      <FormField
        label="Feedback"
        placeholder="Share your experience"
        value={feedback}
        onChangeText={setFeedback}
        multiline
        style={styles.area}
      />
      <PrimaryButton
        title={saving ? 'SUBMITTING...' : 'SUBMIT RATING'}
        onPress={submit}
        disabled={saving}
      />
      {!rewardClaimed ? (
        <>
          <View style={styles.gap} />
          <OutlineButton
            title="CHOOSE REWARD"
            onPress={() =>
              navigation.navigate('ChallengeRewardSelect', {id: challengeId})
            }
          />
        </>
      ) : null}
    </ScreenLayout>
  );
};

export default ChallengeCompleteScreen;

const styles = StyleSheet.create({
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  area: {minHeight: 90, textAlignVertical: 'top'},
  gap: {height: 12},
});
