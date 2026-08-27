import React, {useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StarPicker from '../common/StarPicker';

const StarRatingScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await apiService.post('/feedback', {
        rating,
        title: 'App feedback',
        message: route.params?.message || 'Rating only',
      });
      navigation.replace('FeedbackConfirmation');
    } catch (error) {
      Alert.alert('Rating', getApiError(error, 'Could not save rating.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Rate Your Experience" showBack tab="Profile">
      <Text style={styles.hint}>Tap a star to rate</Text>
      <StarPicker value={rating} onChange={setRating} />
      <PrimaryButton
        title={saving ? 'SUBMITTING...' : 'SUBMIT RATING'}
        onPress={submit}
        disabled={saving}
      />
    </ScreenLayout>
  );
};

export default StarRatingScreen;

const styles = StyleSheet.create({
  hint: {
    textAlign: 'center',
    color: Colors.leafGreen,
    fontWeight: '800',
    marginTop: 24,
  },
});
