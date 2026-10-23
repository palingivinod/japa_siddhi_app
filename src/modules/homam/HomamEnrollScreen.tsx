import React, {useCallback, useState} from 'react';
import {Alert, Linking, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {paymentsPageUrl} from '../payments/paymentsPageUrl';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const HOMAM_AMOUNT = 500;

const HomamEnrollScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [purpose, setPurpose] = useState('');

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

    Linking.openURL(
      paymentsPageUrl({
        amount: HOMAM_AMOUNT,
        purpose: `Nithya Homam: ${cleanPurpose}`.slice(0, 80),
        seva: 'Nithya Homam',
        name: cleanName,
        phone: cleanMobile,
      }),
    ).catch(() => {
      Alert.alert('Payment', 'Could not open payments page.');
    });
  };

  const detailsReady =
    fullName.trim().length > 0 &&
    isMobile(digitsOnly(mobile)) &&
    gothram.trim().length > 0 &&
    nakshatram.trim().length > 0 &&
    purpose.trim().length > 0;

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
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Nithya Homam</Text>
        <Text style={styles.amountValue}>₹{HOMAM_AMOUNT.toLocaleString('en-IN')}</Text>
      </View>
      <PrimaryButton
        title={
          detailsReady
            ? `CONTINUE TO PAYMENT (₹${HOMAM_AMOUNT.toLocaleString('en-IN')})`
            : 'ENTER REQUIRED DETAILS'
        }
        onPress={continuePay}
        disabled={!detailsReady}
      />
    </ScreenLayout>
  );
};

export default HomamEnrollScreen;

const styles = StyleSheet.create({
  amountCard: {
    marginTop: 8,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    backgroundColor: '#FFF4E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    color: Colors.sacredBrown,
    fontSize: 15,
    fontWeight: '700',
  },
  amountValue: {
    color: Colors.sacredBrown,
    fontSize: 22,
    fontWeight: '800',
  },
});
