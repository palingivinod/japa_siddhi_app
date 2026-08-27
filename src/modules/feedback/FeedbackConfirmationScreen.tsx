import React from 'react';
import {useNavigation} from '@react-navigation/native';

import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';

const FeedbackConfirmationScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout title="Thank You" showBack tab="Home">
      <SuccessHero
        title="Thank you for your feedback"
        subtitle="Your feedback helps us improve Japa Siddhi."
      />
      <PrimaryButton
        title="BACK TO HOME"
        onPress={() => navigation.navigate('Home')}
      />
    </ScreenLayout>
  );
};

export default FeedbackConfirmationScreen;
