import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import Colors from '../../theme/colors';
import DatePickerModal from '../common/DatePickerModal';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SelectField from '../common/SelectField';
import AnnadanamMembersSelector, {RATE_PER_PERSON} from './components/AnnadanamMembersSelector';
import {startAppPayment} from '../payments/startAppPayment';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const GeneralAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [occasion, setOccasion] = useState('');
  const [preferDate, setPreferDate] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [persons, setPersons] = useState(0);
  const [enabled, setEnabled] = useState(true);

  const totalAmount = persons * RATE_PER_PERSON;
  const cleanMobileReady = mobile.replace(/\D/g, '');
  const detailsReady =
    fullName.trim().length >= 2 &&
    isMobile(cleanMobileReady) &&
    !/^0+$/.test(cleanMobileReady) &&
    occasion.length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(preferDate) &&
    persons > 0;

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

          setFullName(current => current || String(name));
          setMobile(current => current || digitsOnly(String(phone)).slice(-MOBILE_DIGITS));
        } catch {
          // ignore profile load error
        }
      };

      loadProfile();
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    apiService
      .get('/annadanam/visibility')
      .then(response => setEnabled(response.data?.data?.general !== false))
      .catch(() => setEnabled(true));
  }, []);

  const continuePay = async () => {
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
    if (!occasion) {
      Alert.alert(t('validationTitle'), t('selectOccasion'));
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
      purpose: occasion,
      occasion,
      preferDate,
      seva: 'Annadanam',
      name: fullName.trim(),
      phone: cleanMobile,
    });
  };

  const occasions = [
    {label: t('occasionBirthday'), value: 'Birthday'},
    {label: t('occasionAnniversary'), value: 'Anniversary'},
    {label: t('occasionJayanthi'), value: 'Jayanthi'},
    {label: t('occasionVardhanti'), value: 'Vardhanti'},
    {label: t('occasionPuja'), value: 'Puja related'},
    {label: t('occasionOthers'), value: 'Others'},
  ];

  return (
    <ScreenLayout title={t('generalAnnadanam')} showBack tab="SevaHub">
      {!enabled ? (
        <Text style={styles.disabled}>
          General Anna Santharpana is currently unavailable.
        </Text>
      ) : (
        <>
          <FormField
            label={t('nameLabel')}
            placeholder={t('fullName')}
            value={fullName}
            onChangeText={setFullName}
          />
          <FormField
            label={t('mobileNumber')}
            placeholder={t('enterMobileNumber')}
            value={mobile}
            onChangeText={text =>
              setMobile(digitsOnly(text).slice(0, MOBILE_DIGITS))
            }
            keyboardType="phone-pad"
            maxLength={MOBILE_DIGITS}
          />
          <Text style={styles.label}>{t('occasionLabel')} *</Text>
          <SelectField
            value={occasion}
            onChange={setOccasion}
            placeholder={t('selectShort')}
            title={t('occasionLabel')}
            options={occasions}
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
                ? `CONTINUE TO PAYMENT (₹${totalAmount.toLocaleString('en-IN')})`
                : 'ENTER REQUIRED DETAILS'
            }
            disabled={!detailsReady}
            onPress={continuePay}
          />
        </>
      )}
    </ScreenLayout>
  );
};

export default GeneralAnnadanamScreen;

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
  disabled: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
