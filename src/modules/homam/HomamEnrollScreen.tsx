import React, {useState} from 'react';
import {Alert, Linking} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {MOBILE_DIGITS, digitsOnly} from '../../utils/validators';

const PAYMENTS_URL = 'https://japasiddhi.com/payments';

const HomamEnrollScreen = () => {
  const navigation = useNavigation<any>();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [purpose, setPurpose] = useState('');

  const continuePay = async () => {
    try {
      await Linking.openURL(PAYMENTS_URL);
    } catch {
      Alert.alert('Payment', 'Could not open payments page.');
    }
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
        maxLength={MOBILE_DIGITS}
        value={mobile}
        onChangeText={text => setMobile(digitsOnly(text).slice(0, MOBILE_DIGITS))}
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
