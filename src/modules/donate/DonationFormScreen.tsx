import React, {useState} from 'react';
import {Alert, Linking} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {MOBILE_DIGITS, digitsOnly} from '../../utils/validators';

const PAYMENTS_URL = 'https://japasiddhi.com/payments';

const DonationFormScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const route = useRoute<any>();
  const params = route.params || {};
  const [fullName, setFullName] = useState(params.fullName || '');
  const [mobile, setMobile] = useState(
    digitsOnly(params.mobile || '').slice(-MOBILE_DIGITS),
  );
  const [occasion, setOccasion] = useState(params.occasion || 'Annadanam');
  const [amount, setAmount] = useState(String(params.amount || 1008));

  const pay = async () => {
    try {
      await Linking.openURL(PAYMENTS_URL);
    } catch {
      Alert.alert('Payment', 'Could not open payments page.');
    }
  };

  return (
    <ScreenLayout title={t('donationForm')} showBack tab="SevaHub">
      <MenuCard
        emoji="🍲"
        title={t('donationDetails')}
        subtitle={params.itemName || t('generalAnnadanam')}
      />
      <FormField
        label={t('nameLabel')}
        placeholder={t('fullName')}
        value={fullName}
        onChangeText={setFullName}
      />
      <FormField
        label={t('mobileNumber')}
        placeholder={t('enterMobileNumber')}
        keyboardType="phone-pad"
        maxLength={MOBILE_DIGITS}
        value={mobile}
        onChangeText={text => setMobile(digitsOnly(text).slice(0, MOBILE_DIGITS))}
      />
      <FormField
        label={t('occasionLabel')}
        placeholder={t('occasionPlaceholder')}
        value={occasion}
        onChangeText={setOccasion}
      />
      <FormField
        label={t('donationAmount')}
        placeholder="1008"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <PrimaryButton title={t('proceedToPay')} onPress={pay} />
    </ScreenLayout>
  );
};

export default DonationFormScreen;
