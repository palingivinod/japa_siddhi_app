import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {MOBILE_DIGITS, digitsOnly} from '../../utils/validators';
import {isValidPin} from '../../utils/deliveryAddress';
import {
  isValidProfileMobile,
  resolveCallingCountry,
  resolveProfilePhone,
} from '../../utils/profilePhone';
import MobileWithCountryField from '../auth/components/MobileWithCountryField';
import {CountryItem} from '../../constants/countries';

const ChallengeRewardDeliveryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const challengeId = Number(route.params?.id || 0);
  const rewardName = String(route.params?.rewardName || 'Reward');

  const [fullName, setFullName] = useState('');
  const [mobileCountry, setMobileCountry] = useState<CountryItem>(
    resolveCallingCountry('91'),
  );
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [detectingPin, setDetectingPin] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const [stored, profile] = await Promise.all([
          getStoredUser(),
          ProfileApi.getProfile().catch(() => null),
        ]);
        if (!active) {
          return;
        }
        const name =
          profile?.fullName || stored?.fullName || stored?.full_name || '';
        const phone = resolveProfilePhone(profile, stored);
        const addr = profile?.address || stored?.address || '';
        const pin =
          profile?.pinCode ||
          profile?.postalCode ||
          stored?.pinCode ||
          stored?.postalCode ||
          '';

        if (name) {
          setFullName(String(name));
        }
        if (isValidProfileMobile(phone.countryCode, phone.mobile)) {
          setMobileCountry(phone.country);
          setMobile(phone.mobile);
        }
        if (addr) {
          setAddress(String(addr));
        }
        const pinDigits = digitsOnly(String(pin)).slice(0, 6);
        if (isValidPin(pinDigits)) {
          setPinCode(pinDigits);
          try {
            const found = await ProfileApi.lookupPin(pinDigits);
            if (!active) {
              return;
            }
            if (found?.cityName) {
              setCity(String(found.cityName));
            }
            if (found?.stateName) {
              setState(String(found.stateName));
            }
          } catch {
            // User must enter a valid PIN.
          }
        }
      } catch {
        // User can enter details manually.
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const onPinChange = async (text: string) => {
    const digits = digitsOnly(text).slice(0, 6);
    setPinCode(digits);
    if (digits.length !== 6) {
      setCity('');
      setState('');
      return;
    }
    setDetectingPin(true);
    try {
      const found = await ProfileApi.lookupPin(digits);
      setCity(String(found?.cityName || ''));
      setState(String(found?.stateName || ''));
      if (!found?.cityName || !found?.stateName) {
        Alert.alert(t('pinCode'), t('pinNotFound'));
      }
    } catch {
      setCity('');
      setState('');
      Alert.alert(t('pinCode'), t('pinNotFound'));
    } finally {
      setDetectingPin(false);
    }
  };

  const submit = async () => {
    if (
      !fullName.trim() ||
      !mobile.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pinCode.trim()
    ) {
      Alert.alert(t('required'), t('enterAllDeliveryDetails'));
      return;
    }
    const countryCode =
      mobileCountry.callingCode.replace(/\D/g, '') || '91';
    if (!isValidProfileMobile(countryCode, mobile)) {
      Alert.alert(
        t('required'),
        countryCode === '91'
          ? t('enterValidMobileDigits', {digits: MOBILE_DIGITS})
          : t('enterValidMobileNumber'),
      );
      return;
    }
    if (!isValidPin(pinCode)) {
      Alert.alert(t('required'), t('pinCodeMandatory'));
      return;
    }
    if (!challengeId) {
      Alert.alert(t('rewards'), t('missingChallengeDetails'));
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.post(
        `/challenges/${challengeId}/rewards/delivery`,
        {
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          mobileCountryCode: countryCode,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pinCode: pinCode.trim(),
        },
      );
      const data = response.data?.data || {};
      navigation.replace('ChallengeRewardOrderCreated', {
        id: challengeId,
        rewardName: data.rewardName || rewardName,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
      });
    } catch (err) {
      Alert.alert(
        t('deliveryTitle'),
        getApiError(err, t('couldNotSaveDelivery')),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('rewardDeliveryTitle')} showBack tab="JapaHub">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <Text style={styles.heading}>{t('enterDeliveryDetailsHeading')}</Text>
        <Text style={styles.hint}>{t('deliveryPrefillHint')}</Text>

        <FormField
          label={t('fullName')}
          placeholder={t('enterHere')}
          value={fullName}
          onChangeText={setFullName}
        />
        <MobileWithCountryField
          label={t('mobileNumber')}
          country={mobileCountry}
          mobile={mobile}
          onCountryChange={item => {
            setMobileCountry(item);
            const code = item.callingCode.replace(/\D/g, '') || '91';
            if (code === '91') {
              setMobile(prev => prev.replace(/\D/g, '').slice(-MOBILE_DIGITS));
            }
          }}
          onMobileChange={setMobile}
        />
        <FormField
          label={t('address')}
          placeholder={t('enterHere')}
          value={address}
          onChangeText={setAddress}
        />
        <FormField
          label={t('pinCode')}
          placeholder={t('enterHere')}
          value={pinCode}
          onChangeText={onPinChange}
          keyboardType="number-pad"
          maxLength={6}
        />
        {detectingPin ? (
          <View style={styles.detectingRow}>
            <ActivityIndicator size="small" color={Colors.leafGreen} />
            <Text style={styles.detectingText}>{t('pinCodeAutoDetect')}</Text>
          </View>
        ) : null}
        <FormField
          label={t('city')}
          placeholder={t('pinCodeAutoDetect')}
          value={city}
          onChangeText={setCity}
          editable={false}
        />
        <FormField
          label={t('state')}
          placeholder={t('pinCodeAutoDetect')}
          value={state}
          onChangeText={setState}
          editable={false}
        />

        <PrimaryButton
          title={saving ? t('submitting') : t('submitDeliveryDetails')}
          onPress={submit}
          disabled={saving || detectingPin}
        />
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

export default ChallengeRewardDeliveryScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  detectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 12,
  },
  detectingText: {
    fontSize: 12,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
});
