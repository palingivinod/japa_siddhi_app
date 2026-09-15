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
      const video = route.params?.video;
      const formData = new FormData();
      formData.append('rating', String(rating));
      formData.append('title', 'App feedback');
      formData.append('message', route.params?.message || 'Rating only');
      if (video?.uri) {
        formData.append('video', {
          uri: video.uri,
          type: video.type || 'video/mp4',
          name: video.fileName || 'feedback.mp4',
        } as any);
      }
      await apiService.post('/feedback', formData);
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
      {route.params?.video ? (
        <Text style={styles.videoNote}>Video attached with this feedback</Text>
      ) : null}
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
  videoNote: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
});
