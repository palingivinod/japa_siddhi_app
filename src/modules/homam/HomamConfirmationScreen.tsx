import React from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';

import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';

const HomamConfirmationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const data = route.params || {};

  return (
    <ScreenLayout title="Enrollment Confirmed" showBack tab="SevaHub">
      <SuccessHero
        title="Enrollment Confirmed"
        subtitle={`Nithya Homam • ID ${data.confirmationId || 'NH10281'}`}
      />
      <PrimaryButton
        title="VIEW DETAILS"
        onPress={() =>
          navigation.navigate('OrderDetails', {
            id: data.orderId,
            order: data,
          })
        }
      />
    </ScreenLayout>
  );
};

export default HomamConfirmationScreen;
