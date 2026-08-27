import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const HomamEnrollScreen = () => {
  const navigation = useNavigation<any>();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [purpose, setPurpose] = useState('');

  const continuePay = () => {
    if (!fullName.trim() || !mobile.trim()) {
      Alert.alert('Nithya Homam', 'Name and mobile are required.');
      return;
    }
    navigation.navigate('HomamPayment', {
      kind: 'NITHYA_HOMAM',
      amount: 1008,
      fullName,
      mobile,
      gothram,
      nakshatram,
      purpose,
      title: 'Homam Payment',
      heading: 'Scan the UPI QR',
      itemName: 'Nithya Homam Enrollment',
      subtitle: 'Scan this QR to complete enrollment.',
      showSummary: true,
      methodLabel: 'METHOD',
      button: 'I HAVE PAID',
    });
  };

  return (
    <ScreenLayout title="Homam Enrollment" showBack tab="SevaHub">
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
        label="Gothram"
        placeholder="Optional"
        value={gothram}
        onChangeText={setGothram}
      />
      <FormField
        label="Nakshatram"
        placeholder="Optional"
        value={nakshatram}
        onChangeText={setNakshatram}
      />
      <FormField
        label="Purpose"
        placeholder="Health, peace, thanksgiving"
        value={purpose}
        onChangeText={setPurpose}
      />
      <PrimaryButton title="CONTINUE TO PAYMENT" onPress={continuePay} />
    </ScreenLayout>
  );
};

export default HomamEnrollScreen;
