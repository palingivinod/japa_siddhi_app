import React from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';

import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';

const BanaLingamReviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {
    fullName: 'Devotee',
    mobile: '+91 99999 99999',
    address: 'Temple delivery',
    amount: 1008,
  };

  return (
    <ScreenLayout title="Review Application" showBack tab="SevaHub">
      <MenuCard
        title="Baanalingam"
        subtitle={`${params.fullName || 'Devotee'} • ${params.mobile || ''}`}
      />
      <StatCards
        items={[
          {label: 'AMOUNT', value: `₹ ${Number(params.amount || 1008).toLocaleString()}`},
          {label: 'DELIVERY', value: 'Address'},
        ]}
      />
      <MenuCard title="Address" subtitle={params.address || 'Temple delivery'} />
      <PrimaryButton
        title="CONTINUE TO PAYMENT"
        onPress={() =>
          navigation.navigate('BanaLingamPayment', {
            kind: 'BANA_LINGAM',
            title: 'Baanalingam Payment',
            heading: 'Scan the UPI QR',
            itemName: 'Baanalingam',
            subtitle: 'Scan this QR to complete your offering.',
            amount: params.amount || 1008,
            fullName: params.fullName,
            mobile: params.mobile,
            address: params.address,
            nakshatram: params.nakshatram,
            showSummary: true,
            methodLabel: 'METHOD',
            button: 'I HAVE PAID',
          })
        }
      />
    </ScreenLayout>
  );
};

export default BanaLingamReviewScreen;
