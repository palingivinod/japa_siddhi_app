import React, {useCallback, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
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
  const {t} = useLanguage();
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
      Alert.alert(t('ratingTitle'), getApiError(error, t('couldNotSaveRating')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('challengeComplete')} showBack tab="JapaHub">
      <SuccessHero
        title={t('wellDone')}
        subtitle={t('youCompletedChallenge')}
      />
      <Text style={styles.section}>{t('rateYourExperience')}</Text>
      <StarPicker value={rating} onChange={setRating} />
      <FormField
        label={t('feedback')}
        placeholder={t('shareYourExperience')}
        value={feedback}
        onChangeText={setFeedback}
        multiline
        style={styles.area}
      />
      <PrimaryButton
        title={saving ? t('submitting') : t('submitRating')}
        onPress={submit}
        disabled={saving}
      />
      {!rewardClaimed ? (
        <>
          <View style={styles.gap} />
          <OutlineButton
            title={t('chooseReward')}
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
