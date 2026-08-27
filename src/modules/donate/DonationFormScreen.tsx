import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const DonationFormScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};
  const [fullName, setFullName] = useState(params.fullName || '');
  const [mobile, setMobile] = useState(params.mobile || '');
  const [occasion, setOccasion] = useState(params.occasion || 'Annadanam');
  const [amount, setAmount] = useState(String(params.amount || 1008));

  const pay = () => {
    const value = Number(String(amount).replace(/[^\d.]/g, '')) || 0;
    if (!fullName.trim() || !mobile.trim() || value < 1) {
      Alert.alert('Donation', 'Name, mobile and amount are required.');
      return;
    }
    navigation.navigate('DonationPayment', {
      ...params,
      kind: params.kind || 'ANNADANAM',
      title: 'Scan to Pay',
      heading: 'Scan the UPI QR',
      itemName: params.itemName || 'Annadanam Donation',
      subtitle: occasion,
      amount: value,
      fullName,
      mobile,
      occasion,
      showSummary: false,
      button: 'I HAVE PAID',
    });
  };

  return (
    <ScreenLayout title="Donation Form" showBack tab="SevaHub">
      <MenuCard
        title="Donation details"
        subtitle={params.itemName || 'General Annadanam'}
      />
      <FormField
        label="Name"
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <FormField
        label="Mobile"
        placeholder="Mobile number"
        keyboardType="phone-pad"
        value={mobile}
        onChangeText={setMobile}
      />
      <FormField
        label="Occasion"
        placeholder="Birthday, festival, thanksgiving"
        value={occasion}
        onChangeText={setOccasion}
      />
      <FormField
        label="Donation amount"
        placeholder="1008"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <PrimaryButton title="SCAN TO PAY" onPress={pay} />
    </ScreenLayout>
  );
};

export default DonationFormScreen;
