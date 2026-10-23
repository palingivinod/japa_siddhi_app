import React, {useCallback, useState} from 'react';
import {Alert, Linking} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import AnnadanamMembersSelector, {RATE_PER_PERSON} from './components/AnnadanamMembersSelector';
import {paymentsPageUrl} from '../payments/paymentsPageUrl';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const DonationFormScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const route = useRoute<any>();
  const params = route.params || {};
  const [fullName, setFullName] = useState(params.fullName || '');
  const [mobile, setMobile] = useState(
    digitsOnly(params.mobile || '').slice(-MOBILE_DIGITS),
  );
  const [occasion, setOccasion] = useState(params.occasion || 'Anna Santharpana');
  const [persons, setPersons] = useState(
    Number(params.persons) || (params.amount ? Math.max(1, Math.round(Number(params.amount) / RATE_PER_PERSON)) : 0),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadProfile = async () => {
        try {
          const [stored, profile] = await Promise.all([
            getStoredUser(),
            ProfileApi.getProfile().catch(() => null),
          ]);
          if (!active) return;
          const name = profile?.fullName || stored?.fullName || stored?.full_name || '';
          const phone = profile?.mobileNumber || stored?.mobileNumber || stored?.mobile_number || stored?.phone || '';

          if (!fullName && name) {
            setFullName(String(name));
          }
          if (!mobile && phone) {
            setMobile(digitsOnly(String(phone)).slice(-MOBILE_DIGITS));
          }
        } catch {
          // ignore profile load error
        }
      };

      loadProfile();
      return () => {
        active = false;
      };
    }, [fullName, mobile]),
  );

  const totalAmount = persons * RATE_PER_PERSON;
  const cleanMobile = mobile.replace(/\D/g, '');
  const detailsReady =
    fullName.trim().length >= 2 &&
    isMobile(cleanMobile) &&
    !/^0+$/.test(cleanMobile) &&
    persons > 0;

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

    Linking.openURL(
      paymentsPageUrl({
        amount: totalAmount,
        purpose: occasion.trim() || params.itemName || 'Anna Santharpana',
        seva: 'Annadanam',
        name: fullName.trim(),
        phone: cleanMobile,
      }),
    ).catch(() => {
      Alert.alert('Payment', 'Could not open payments page.');
    });
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
        title={
          detailsReady
            ? `PROCEED TO PAY (₹${totalAmount.toLocaleString('en-IN')})`
            : 'ENTER REQUIRED DETAILS'
        }
        disabled={!detailsReady}
        onPress={pay}
      />
    </ScreenLayout>
  );
};

export default DonationFormScreen;
