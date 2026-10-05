import React, {useCallback, useState} from 'react';
import {Alert, Linking} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
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
      const load = async () => {
        try {
          const [stored, profile] = await Promise.all([
            getStoredUser(),
            ProfileApi.getProfile().catch(() => null),
          ]);
          if (!active) {
            return;
          }
          const name = profile?.fullName || stored?.fullName || stored?.full_name || '';
          const phone =
            profile?.mobileNumber ||
            stored?.mobileNumber ||
            stored?.mobile_number ||
            stored?.phone ||
            '';
          const got = profile?.gothram || stored?.gothram || '';
          const nak = profile?.nakshatram || stored?.nakshatram || '';

          if (name) {
            setFullName(prev => prev || String(name));
          }
          if (phone) {
            setMobile(prev => prev || digitsOnly(String(phone)).slice(0, MOBILE_DIGITS));
          }
          if (got) {
            setGothram(prev => prev || String(got));
          }
          if (nak) {
            setNakshatram(prev => prev || String(nak));
          }
        } catch {
          // ignore profile load error
        }
      };

      load();
      return () => {
        active = false;
      };
    }, []),
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
