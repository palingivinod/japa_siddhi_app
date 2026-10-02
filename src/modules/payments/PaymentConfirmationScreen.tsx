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
        title={data.kind === 'BANA_LINGAM' ? 'Order Under Review' : 'Order Placed'}
        subtitle={
          data.orderNumber
            ? data.orderNumber.startsWith('BL-')
              ? `Order ${data.orderNumber}`
              : `Order #${data.orderNumber}`
            : `Order #${data.confirmationId || 'BL-0001'}`
        }
      />
      <MenuCard
        emoji="✅"
        title={data.itemName || 'Baanalingam'}
        subtitle={
          data.kind === 'BANA_LINGAM'
            ? 'Your application has been submitted and is under review.'
            : 'Your order has been created successfully.'
        }
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
