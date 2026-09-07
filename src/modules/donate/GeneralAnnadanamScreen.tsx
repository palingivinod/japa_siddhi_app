import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const GeneralAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('+91');
  const [occasion, setOccasion] = useState('');
  const [amount, setAmount] = useState('1008');

  const continuePay = () => {
    if (!fullName.trim()) {
      Alert.alert(t('tileAnnadanam'), t('pleaseEnterName'));
      return;
    }
    navigation.navigate('DonationForm', {
      kind: 'GENERAL',
      amount: Number(String(amount).replace(/[^\d]/g, '')) || 1008,
      fullName,
      mobile,
      occasion,
      itemName: t('generalAnnadanam'),
    });
  };

  return (
    <ScreenLayout title={t('generalAnnadanam')} showBack tab="SevaHub">
      <FormField
        label={t('nameLabel')}
        placeholder={t('fullName')}
        value={fullName}
        onChangeText={setFullName}
      />
      <FormField
        label={t('mobileNumber')}
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
      />
      <FormField
        label={t('occasionLabel')}
        placeholder={t('occasionPlaceholder')}
        value={occasion}
        onChangeText={setOccasion}
      />
      <FormField
        label={t('donationAmount')}
        value={amount.startsWith('₹') ? amount : `₹ ${amount}`}
        onChangeText={value => setAmount(value.replace(/[^\d]/g, ''))}
        keyboardType="numeric"
      />
      <PrimaryButton title={t('continueToPayment')} onPress={continuePay} />
    </ScreenLayout>
  );
};

export default GeneralAnnadanamScreen;
