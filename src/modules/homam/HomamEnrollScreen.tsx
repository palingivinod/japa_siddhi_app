import React, {useCallback, useState} from 'react';
import {Alert, Linking} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import {getStoredUser} from '../../services/session';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const PAYMENTS_URL = 'https://japasiddhi.com/payments';

const HomamEnrollScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getStoredUser().then(user => {
        if (!active || !user) {
          return;
        }
        if (!fullName && (user.fullName || user.full_name)) {
          setFullName(user.fullName || user.full_name);
        }
        if (
          !mobile &&
          (user.mobileNumber || user.mobile_number || user.phone)
        ) {
          setMobile(
            digitsOnly(
              user.mobileNumber || user.mobile_number || user.phone,
            ).slice(0, MOBILE_DIGITS),
          );
        }
        if (!gothram && user.gothram) {
          setGothram(user.gothram);
        }
        if (!nakshatram && user.nakshatram) {
          setNakshatram(user.nakshatram);
        }
      });

      apiService
        .get('/profile')
        .then(res => {
          if (!active) {
            return;
          }
          const data = res.data?.data || res.data || {};
          if (data.fullName) {
            setFullName(prev => prev || data.fullName);
          }
          if (data.mobileNumber) {
            setMobile(prev =>
              prev || digitsOnly(data.mobileNumber).slice(0, MOBILE_DIGITS),
            );
          }
          if (data.gothram) {
            setGothram(prev => prev || data.gothram);
          }
          if (data.nakshatram) {
            setNakshatram(prev => prev || data.nakshatram);
          }
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [fullName, mobile, gothram, nakshatram]),
  );

  const continuePay = async () => {
    const cleanName = fullName.trim();
    const cleanMobile = digitsOnly(mobile);
    const cleanGothram = gothram.trim();
    const cleanNakshatram = nakshatram.trim();
    const cleanPurpose = purpose.trim();

    if (!cleanName) {
      Alert.alert(t('required'), t('nameRequired'));
      return;
    }
    if (!cleanMobile || !isMobile(cleanMobile)) {
      Alert.alert(t('required'), t('validMobile'));
      return;
    }
    if (!cleanGothram) {
      Alert.alert(t('required'), t('gothramRequired'));
      return;
    }
    if (!cleanNakshatram) {
      Alert.alert(t('required'), t('nakshatramRequired'));
      return;
    }
    if (!cleanPurpose) {
      Alert.alert(t('required'), t('purposeRequired'));
      return;
    }

    try {
      setSubmitting(true);
      await Linking.openURL(PAYMENTS_URL);
    } catch {
      Alert.alert('Payment', 'Could not open payments page.');
    } finally {
      setSubmitting(false);
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
        onChangeText={text =>
          setMobile(digitsOnly(text).slice(0, MOBILE_DIGITS))
        }
      />
      <FormField
        label="Gothram"
        placeholder="Enter Gothram"
        value={gothram}
        onChangeText={setGothram}
      />
      <FormField
        label="Nakshatram"
        placeholder="Enter Nakshatram"
        value={nakshatram}
        onChangeText={setNakshatram}
      />
      <FormField
        label="Purpose"
        placeholder="Health, peace, thanksgiving"
        value={purpose}
        onChangeText={setPurpose}
      />
      <PrimaryButton
        title="CONTINUE TO PAYMENT"
        onPress={continuePay}
        disabled={submitting}
      />
    </ScreenLayout>
  );
};

export default HomamEnrollScreen;
