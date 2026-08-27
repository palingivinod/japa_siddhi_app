import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const GeneralAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('+91');
  const [occasion, setOccasion] = useState('');
  const [amount, setAmount] = useState('1008');

  const continuePay = () => {
    if (!fullName.trim()) {
      Alert.alert('Annadanam', 'Please enter your name.');
      return;
    }
    navigation.navigate('DonationForm', {
      kind: 'GENERAL',
      amount: Number(String(amount).replace(/[^\d]/g, '')) || 1008,
      fullName,
      mobile,
      occasion,
      itemName: 'General Annadanam',
    });
  };

  return (
    <ScreenLayout title="General Annadanam" showBack tab="SevaHub">
      <FormField
        label="Name"
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <FormField
        label="Mobile"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
      />
      <FormField
        label="Occasion"
        placeholder="Birthday / Anniversary / Other"
        value={occasion}
        onChangeText={setOccasion}
      />
      <FormField
        label="Donation Amount"
        value={amount.startsWith('₹') ? amount : `₹ ${amount}`}
        onChangeText={value => setAmount(value.replace(/[^\d]/g, ''))}
        keyboardType="numeric"
      />
      <PrimaryButton title="CONTINUE TO PAYMENT" onPress={continuePay} />
    </ScreenLayout>
  );
};

export default GeneralAnnadanamScreen;
