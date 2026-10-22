import React, {useState} from 'react';
import {Alert, Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import {PLAYSTORE_URL} from '../../constants/app';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {pickFeedbackVideo, type PickedMedia} from '../../services/mediaPick';

const PLAY_STORE_APP = 'market://details?id=com.japasiddhi';

const openPlayStoreRating = async () => {
  try {
    await Linking.openURL(PLAY_STORE_APP);
  } catch {
    await Linking.openURL(PLAYSTORE_URL);
  }
};

const FeedbackScreen = () => {
  const {t} = useLanguage();
  const [message, setMessage] = useState('');
  const [video, setVideo] = useState<PickedMedia | null>(null);
  const [saving, setSaving] = useState(false);

  const chooseVideo = async () => {
    try {
      const picked = await pickFeedbackVideo();
      if (picked) {
        setVideo(picked);
      }
    } catch (error: any) {
      const code = String(error?.message || '');
      if (code === 'permission') {
        Alert.alert(
          'Feedback video',
          'Please allow camera / gallery access to attach a video.',
        );
        return;
      }
      Alert.alert('Feedback video', 'Could not pick a video. Please try again.');
    }
  };

  const submitFeedback = async () => {
    if (saving) {
      return;
    }
    const text = message.trim();
    if (!text && !video) {
      Alert.alert('Feedback', 'Add a comment or a video, then submit.');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', 'App feedback');
      formData.append('message', text || 'Video attached');
      if (video?.uri) {
        formData.append('video', {
          uri: video.uri,
          type: video.type || 'video/mp4',
          name: video.fileName || 'feedback.mp4',
        } as any);
      }
      await apiService.post('/feedback', formData);
      setMessage('');
      setVideo(null);
      Alert.alert('Feedback', 'Thank you. Your feedback was sent.');
    } catch (error) {
      Alert.alert('Feedback', getApiError(error, 'Could not send feedback.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('shareFeedback')} showBack tab="Profile">
      <Text style={styles.heading}>{t('howWasExperience')}</Text>
      <View style={styles.rateWrap}>
        <PrimaryButton title={t('rateUs')} onPress={openPlayStoreRating} />
      </View>
      <FormField
        label={t('comments')}
        placeholder={t('tellUsMore')}
        value={message}
        onChangeText={setMessage}
        multiline
        style={styles.area}
      />

      <Text style={styles.label}>{t('attachVideoOptional')}</Text>
      <TouchableOpacity style={styles.mediaBtn} onPress={chooseVideo}>
        <Text style={styles.mediaText}>
          {video ? t('changeVideo') : t('uploadRecordVideo')}
        </Text>
      </TouchableOpacity>
      {video ? (
        <View style={styles.fileRow}>
          <Text style={styles.fileName} numberOfLines={1}>
            {video.fileName}
          </Text>
          <TouchableOpacity onPress={() => setVideo(null)}>
            <Text style={styles.remove}>{t('remove')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.hint}>{t('feedbackVideoHint')}</Text>
      )}

      <PrimaryButton
        title={saving ? t('submittingTicket') : t('submit')}
        onPress={submitFeedback}
        disabled={saving}
      />
    </ScreenLayout>
  );
};

export default FeedbackScreen;

const styles = StyleSheet.create({
  rateWrap: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  area: {minHeight: 100, textAlignVertical: 'top'},
  label: {
    marginTop: 8,
    marginBottom: 8,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  mediaBtn: {
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginBottom: 8,
  },
  mediaText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileName: {
    flex: 1,
    color: Colors.textSecondary,
    marginRight: 10,
  },
  remove: {
    color: Colors.error,
    fontWeight: '700',
  },
  hint: {
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
});
