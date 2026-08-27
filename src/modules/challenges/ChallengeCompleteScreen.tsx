import React, {useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StarPicker from '../common/StarPicker';
import SuccessHero from '../common/SuccessHero';

const ChallengeCompleteScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await apiService.post(`/challenges/${route.params?.id}/rate`, {
        rating,
        feedback,
      });
      navigation.navigate('ChallengeLeaderboard', {id: route.params?.id});
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
    </ScreenLayout>
  );
};

export default ChallengeCompleteScreen;

const styles = StyleSheet.create({
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    textAlign: 'center',
  },
  area: {minHeight: 90, textAlignVertical: 'top'},
});
