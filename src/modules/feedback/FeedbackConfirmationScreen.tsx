import React from 'react';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';

const FeedbackConfirmationScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();

  return (
    <ScreenLayout title={t('thankYou')} showBack tab="Home">
      <SuccessHero
        title={t('thankYouForFeedback')}
        subtitle={t('feedbackHelpsImprove')}
      />
      <PrimaryButton
        title={t('backToHome')}
        onPress={() => navigation.navigate('Home')}
      />
    </ScreenLayout>
  );
};

export default FeedbackConfirmationScreen;
