import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const DonationFormScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const route = useRoute<any>();
  const params = route.params || {};
  const [fullName, setFullName] = useState(params.fullName || '');
  const [mobile, setMobile] = useState(params.mobile || '');
  const [occasion, setOccasion] = useState(params.occasion || 'Annadanam');
  const [amount, setAmount] = useState(String(params.amount || 1008));

  const pay = () => {
    const value = Number(String(amount).replace(/[^\d.]/g, '')) || 0;
    if (!fullName.trim() || !mobile.trim() || value < 1) {
      Alert.alert(t('donate'), t('nameMobileAmountRequired'));
      return;
    }
    navigation.navigate('DonationPayment', {
      ...params,
      kind: params.kind || 'ANNADANAM',
      title: t('proceedToPay'),
      heading: t('proceedToPay'),
      itemName: params.itemName || t('japaAnnadanam'),
      subtitle: occasion,
      amount: value,
      fullName,
      mobile,
      occasion,
      showSummary: false,
      button: t('proceedToPay'),
    });
  };

  return (
    <ScreenLayout title={t('donationForm')} showBack tab="SevaHub">
      <MenuCard
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
        value={mobile}
        onChangeText={setMobile}
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
