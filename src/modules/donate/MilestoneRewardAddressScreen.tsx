import React, {useEffect, useState} from 'react';
import {
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
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const Field = ({
  label,
  value,
  onChangeText,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  maxLength?: number;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Enter here"
      placeholderTextColor={Colors.textSecondary}
      style={styles.input}
      keyboardType={keyboardType}
      maxLength={maxLength}
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

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pinCode, setPinCode] = useState('');

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
        const phone =
          profile?.mobileNumber ||
          stored?.mobileNumber ||
          stored?.mobile_number ||
          stored?.phone ||
          '';
        const addr = profile?.address || stored?.address || '';
        const cityName = profile?.cityName || stored?.cityName || '';
        const region = profile?.stateName || stored?.stateName || '';
        const pin =
          profile?.pinCode ||
          profile?.postalCode ||
          stored?.pinCode ||
          stored?.postalCode ||
          '';
        if (name) {
          setFullName(String(name));
        }
        if (phone) {
          setMobile(digitsOnly(String(phone)).slice(-MOBILE_DIGITS));
        }
        if (addr) {
          setAddress(String(addr));
        }
        if (cityName) {
          setCity(String(cityName));
        }
        if (region) {
          setStateName(String(region));
        }
        if (pin) {
          setPinCode(digitsOnly(String(pin)).slice(0, 6));
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

  const continueNext = () => {
    if (
      !fullName.trim() ||
      !mobile.trim() ||
      !address.trim() ||
      !city.trim() ||
      !stateName.trim() ||
      !pinCode.trim()
    ) {
      Alert.alert('Required', 'Enter all delivery details.');
      return;
    }
    if (!isMobile(mobile)) {
      Alert.alert('Required', `Enter a valid ${MOBILE_DIGITS}-digit mobile number.`);
      return;
    }
    if (!/^[0-9]{6}$/.test(pinCode)) {
      Alert.alert('Required', 'Enter a valid 6-digit PIN code.');
      return;
    }
    navigation.navigate('MilestoneRewardOverview', {
      target,
      rewardId,
      rewardName,
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      address: address.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pinCode: pinCode.trim(),
    });
  };

  return (
    <ScreenLayout title="Delivery details" showBack tab="SevaHub">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.heading}>{rewardName}</Text>
        <Text style={styles.hint}>
          Your saved details are filled in. Change anything before you continue.
        </Text>
        <Field label={t('fullName')} value={fullName} onChangeText={setFullName} />
        <Field
          label={t('mobileNumber')}
          value={mobile}
          onChangeText={text => setMobile(digitsOnly(text).slice(0, MOBILE_DIGITS))}
          keyboardType="phone-pad"
          maxLength={MOBILE_DIGITS}
        />
        <Field label={t('address')} value={address} onChangeText={setAddress} />
        <Field label={t('city')} value={city} onChangeText={setCity} />
        <Field label={t('state')} value={stateName} onChangeText={setStateName} />
        <Field
          label={t('pinCode')}
          value={pinCode}
          onChangeText={text => setPinCode(digitsOnly(text).slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
        />
        <PrimaryButton title="CONTINUE" onPress={continueNext} />
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
});
