import React, {useCallback, useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import Colors from '../../theme/colors';
import DatePickerModal from '../common/DatePickerModal';
import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import AnnadanamMembersSelector, {RATE_PER_PERSON} from './components/AnnadanamMembersSelector';
import {startAppPayment} from '../payments/startAppPayment';
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
  const [preferDate, setPreferDate] = useState('');
  const [showDate, setShowDate] = useState(false);
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
    /^\d{4}-\d{2}-\d{2}$/.test(preferDate) &&
    persons > 0;

  const pay = async () => {
    if (fullName.trim().length < 2) {
      Alert.alert(t('validationTitle'), t('enterDevoteeName'));
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!isMobile(cleanMobile) || /^0+$/.test(cleanMobile)) {
      Alert.alert(
        t('validationTitle'),
        t('enterValidMobileDigits', {digits: String(MOBILE_DIGITS)}),
      );
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferDate)) {
      Alert.alert(t('validationTitle'), t('selectPreferDate'));
      return;
    }
    if (persons <= 0) {
      Alert.alert(t('validationTitle'), t('enterPersonsCount'));
      return;
    }

    await startAppPayment({
      amount: totalAmount,
      purpose: occasion.trim() || params.itemName || 'Anna Santharpana',
      occasion: occasion.trim(),
      preferDate,
      seva: 'Annadanam',
      name: fullName.trim(),
      phone: cleanMobile,
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
      <Text style={styles.label}>{t('preferDate')} *</Text>
      <TouchableOpacity style={styles.dateField} onPress={() => setShowDate(true)}>
        <Text style={preferDate ? styles.dateValue : styles.datePlaceholder}>
          {preferDate || t('selectDate')}
        </Text>
      </TouchableOpacity>
      <DatePickerModal
        visible={showDate}
        value={
          /^\d{4}-\d{2}-\d{2}$/.test(preferDate)
            ? new Date(
                Number(preferDate.slice(0, 4)),
                Number(preferDate.slice(5, 7)) - 1,
                Number(preferDate.slice(8, 10)),
              )
            : new Date()
        }
        minimumDate={new Date()}
        onCancel={() => setShowDate(false)}
        onConfirm={selected => {
          const month = String(selected.getMonth() + 1).padStart(2, '0');
          const day = String(selected.getDate()).padStart(2, '0');
          setPreferDate(`${selected.getFullYear()}-${month}-${day}`);
          setShowDate(false);
        }}
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

const styles = StyleSheet.create({
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  dateField: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  dateValue: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  datePlaceholder: {
    color: Colors.placeholder,
    fontSize: 16,
  },
});
