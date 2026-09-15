import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {pickFeedbackVideo, type PickedMedia} from '../../services/mediaPick';

const FeedbackScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [message, setMessage] = useState('');
  const [video, setVideo] = useState<PickedMedia | null>(null);

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

  return (
    <ScreenLayout title="Share Feedback" showBack tab="Profile">
      <Text style={styles.heading}>{t('howWasExperience')}</Text>
      <FormField
        label={t('comments')}
        placeholder={t('tellUsMore')}
        value={message}
        onChangeText={setMessage}
        multiline
        style={styles.area}
      />

      <Text style={styles.label}>Attach video (optional)</Text>
      <TouchableOpacity style={styles.mediaBtn} onPress={chooseVideo}>
        <Text style={styles.mediaText}>
          {video ? 'Change video' : 'Upload / record video'}
        </Text>
      </TouchableOpacity>
      {video ? (
        <View style={styles.fileRow}>
          <Text style={styles.fileName} numberOfLines={1}>
            {video.fileName}
          </Text>
          <TouchableOpacity onPress={() => setVideo(null)}>
            <Text style={styles.remove}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.hint}>
          You can attach a short video (up to about 60 seconds / 40 MB).
        </Text>
      )}

      <PrimaryButton
        title="CONTINUE TO RATING"
        onPress={() =>
          navigation.navigate('StarRating', {
            message,
            video,
          })
        }
      />
    </ScreenLayout>
  );
};

export default FeedbackScreen;

const styles = StyleSheet.create({
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
