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
  const sevaName = String(data.seva || '').trim() || 'your offering';

  return (
    <ScreenLayout title={data.kind === 'RAZORPAY' ? 'Payment successful' : 'Placed Successful'} showBack tab="Orders">
      <SuccessHero
        title={
          data.kind === 'BANA_LINGAM'
            ? 'Order Under Review'
            : data.kind === 'RAZORPAY'
              ? 'Payment successful'
              : 'Order Placed'
        }
        subtitle={
          data.kind === 'RAZORPAY'
            ? `Thank you for ${sevaName}.`
            : data.orderNumber
            ? data.orderNumber.startsWith('BL-')
              ? `Order ${data.orderNumber}`
              : `Order #${data.orderNumber}`
            : `Order #${data.confirmationId || 'BL-0001'}`
        }
      />
      <MenuCard
        emoji="✅"
        title={data.kind === 'RAZORPAY' ? 'Request submitted successfully' : data.itemName || 'Baanalingam'}
        subtitle={
          data.kind === 'BANA_LINGAM'
            ? 'Your application has been submitted and is under review.'
            : data.kind === 'RAZORPAY'
              ? 'We will get back to you soon.'
              : 'Your order has been created successfully.'
        }
      />
      <PrimaryButton
        title={data.kind === 'RAZORPAY' ? 'CONTINUE' : 'VIEW ORDER'}
        onPress={() =>
          data.kind === 'RAZORPAY'
            ? navigation.navigate('Home')
            : navigation.navigate('OrderDetails', {
                id: data.orderId,
                order: data,
              })
        }
      />
    </ScreenLayout>
  );
};

export default PaymentConfirmationScreen;
