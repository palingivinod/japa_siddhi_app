import React from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';

import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';

const DonationConfirmationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const data = route.params || {};

  return (
    <ScreenLayout title="Donation Confirmed" showBack tab="SevaHub">
      <SuccessHero
        title="Donation received"
        subtitle={`ID ${data.confirmationId || data.orderNumber || 'ANN10281'}`}
      />
      <MenuCard
        title={data.itemName || 'Annadanam'}
        subtitle="Your offering supports food service."
      />
      <PrimaryButton title="BACK TO HOME" onPress={() => navigation.navigate('Home')} />
    </ScreenLayout>
  );
};

export default DonationConfirmationScreen;
