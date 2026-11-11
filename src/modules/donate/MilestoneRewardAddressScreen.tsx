import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
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
import {promptRewardAddressDisclaimer} from '../../utils/rewardAddressDisclaimer';

const Field = ({
  label,
  value,
  onChangeText,
  keyboardType,
  maxLength,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  maxLength?: number;
  editable?: boolean;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Enter here"
      placeholderTextColor={Colors.textSecondary}
      style={[styles.input, !editable && styles.inputReadonly]}
      keyboardType={keyboardType}
      maxLength={maxLength}
      editable={editable}
    />
  </View>
);

const MilestoneRewardAddressScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const target = Number(route.params?.target || 0);
  const rewardId = Number(route.params?.rewardId || 0);
  const rewardName = String(route.params?.rewardName || 'Reward');
  const claimKind = String(route.params?.claimKind || '');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(
    Boolean(route.params?.rewardAddressDisclaimerAccepted),
  );

  const [fullName, setFullName] = useState('');
  const [mobileCountry, setMobileCountry] = useState<CountryItem>(
    resolveCallingCountry('91'),
  );
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [detectingPin, setDetectingPin] = useState(false);

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
        const name = profile?.fullName || stored?.fullName || stored?.full_name || '';
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
              setStateName(String(found.stateName));
            }
          } catch {
            // Devotee must enter a valid PIN.
          }
        }
      } catch {
        // The devotee can type the details.
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
      setStateName('');
      return;
    }
    setDetectingPin(true);
    try {
      const found = await ProfileApi.lookupPin(digits);
      setCity(String(found?.cityName || ''));
      setStateName(String(found?.stateName || ''));
      if (!found?.cityName || !found?.stateName) {
        Alert.alert(t('pinCode'), t('pinNotFound'));
      }
    } catch {
      setCity('');
      setStateName('');
      Alert.alert(t('pinCode'), t('pinNotFound'));
    } finally {
      setDetectingPin(false);
    }
  };

  const continueNext = () => {
    if (
      !fullName.trim() ||
      !mobile.trim() ||
      !address.trim() ||
      !city.trim() ||
      !stateName.trim() ||
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
    const goOverview = () => {
      setDisclaimerAccepted(true);
      navigation.navigate('MilestoneRewardOverview', {
        target,
        rewardId,
        rewardName,
        claimKind: claimKind || undefined,
        rewardAddressDisclaimerAccepted: true,
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        mobileCountryCode: countryCode,
        address: address.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pinCode: pinCode.trim(),
      });
    };
    if (disclaimerAccepted) {
      goOverview();
      return;
    }
    promptRewardAddressDisclaimer(t, goOverview);
  };

  return (
    <ScreenLayout title={t('deliveryDetailsTitle')} showBack tab="SevaHub">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.heading}>{rewardName}</Text>
        <Text style={styles.hint}>{t('deliveryPrefillHint')}</Text>
        <Field label={t('fullName')} value={fullName} onChangeText={setFullName} />
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
        <Field label={t('address')} value={address} onChangeText={setAddress} />
        <Field
          label={`${t('pinCode')} *`}
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
        <Field
          label={t('city')}
          value={city}
          onChangeText={setCity}
          editable={false}
        />
        <Field
          label={t('state')}
          value={stateName}
          onChangeText={setStateName}
          editable={false}
        />
        <PrimaryButton
          title="CONTINUE"
          onPress={continueNext}
          disabled={detectingPin}
        />
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

export default MilestoneRewardAddressScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  hint: {
    marginTop: 6,
    marginBottom: 16,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  field: {marginBottom: 14},
  label: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  inputReadonly: {
    backgroundColor: '#F7F5F2',
  },
  detectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
    marginBottom: 12,
  },
  detectingText: {
    fontSize: 12,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
});
