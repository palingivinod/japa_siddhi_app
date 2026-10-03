import React, {useState} from 'react';
import {Alert, Linking} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import AnnadanamMembersSelector, {RATE_PER_PERSON} from './components/AnnadanamMembersSelector';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

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
  const [persons, setPersons] = useState(
    Number(params.persons) || (params.amount ? Math.max(1, Math.round(Number(params.amount) / RATE_PER_PERSON)) : 5),
  );

  const totalAmount = persons * RATE_PER_PERSON;

  const pay = async () => {
    if (fullName.trim().length < 2) {
      Alert.alert('Required', 'Please enter devotee name.');
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!isMobile(cleanMobile) || /^0+$/.test(cleanMobile)) {
      Alert.alert('Required', `Please enter a valid ${MOBILE_DIGITS}-digit mobile number.`);
      return;
    }
    if (persons <= 0) {
      Alert.alert('Required', 'Please select or enter the number of persons.');
      return;
    }

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
      <AnnadanamMembersSelector
        persons={persons}
        onChangePersons={setPersons}
        title={t('selectNoOfPersons')}
      />
      <PrimaryButton
        title={persons > 0 ? `PROCEED TO PAY (₹${totalAmount.toLocaleString()})` : 'ENTER NUMBER OF PERSONS'}
        disabled={persons <= 0}
        onPress={pay}
      />
    </ScreenLayout>
  );
};

export default DonationFormScreen;
