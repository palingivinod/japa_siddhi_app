import React from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';

import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SuccessHero from '../common/SuccessHero';

const PaymentConfirmationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const data = route.params || {};

  return (
    <ScreenLayout title="Placed Successful" showBack tab="Orders">
      <SuccessHero
        title="Order Confirmed"
        subtitle={`Order #${data.orderNumber || data.confirmationId || 'JS10028'}`}
      />
      <MenuCard
        emoji="✅"
        title={data.itemName || 'Baanalingam'}
        subtitle="Your order has been created automatically."
      />
      <PrimaryButton
        title="VIEW ORDER"
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

export default PaymentConfirmationScreen;
