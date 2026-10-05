import React, {useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import apiService from '../../services/apiService';
import {clearSession} from '../../services/session';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';
import CountrySelector from './components/CountrySelector';
import countries, {CountryItem} from '../../constants/countries';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const defaultIndia: CountryItem =
  countries.find(c => c.code === 'IN') || {
    name: 'India',
    code: 'IN',
    callingCode: '+91',
    flag: '🇮🇳',
  };

const CreateAccountScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCountry, setSelectedCountry] =
    useState<CountryItem>(defaultIndia);
  const [countryCode, setCountryCode] = useState('91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const submit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const code =
      selectedCountry.callingCode.replace(/\D/g, '') ||
      countryCode.replace(/\D/g, '') ||
      '91';
    const mobile = mobileNumber.replace(/\D/g, '');

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert(t('required'), 'Enter a valid email address.');
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert(t('required'), 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('required'), 'Passwords do not match.');
      return;
    }
    if (code === '91') {
      if (!isMobile(mobile) || /^0+$/.test(mobile)) {
        Alert.alert(
          t('required'),
          `Enter your ${MOBILE_DIGITS}-digit mobile number.`,
        );
        return;
      }
    } else {
      if (mobile.length < 6 || mobile.length > 15 || /^0+$/.test(mobile)) {
        Alert.alert(t('required'), 'Enter a valid mobile number.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Drop any leftover session so nothing in signup is sent as that devotee.
      // A storage failure here must not block signing up.
      await clearSession().catch(() => undefined);
      const response = await apiService.post('/auth/otp/send', {
        email: trimmedEmail,
        mobileCountryCode: code,
        mobileNumber: mobile,
        mode: 'register',
      });
      const data = response.data?.data || {};
      navigation.navigate('OtpScreen', {
        mode: 'register',
        email: trimmedEmail,
        password: password.trim(),
        phoneNumber: `${code}${mobile}`,
        mobileCountryCode: code,
        mobileNumber: mobile,
        sentTo: data.sentTo || trimmedEmail,
      });
    } catch (error: any) {
      Alert.alert(
        'Create account',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to send OTP. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout title="Create Account" showBack>
      <Text style={styles.heading}>Create your account</Text>
      <Text style={styles.helper}>
        Email, password and mobile are required. We will send an OTP to verify
        your email.
      </Text>

      <Text style={styles.label}>{t('email')}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder={t('enterEmailAddress')}
        placeholderTextColor={Colors.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Enter password (min 6 characters)"
        placeholderTextColor={Colors.placeholder}
        secureTextEntry
      />

      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter password"
        placeholderTextColor={Colors.placeholder}
        secureTextEntry
      />

      <Text style={styles.label}>Mobile Number</Text>
      <View style={styles.mobileRow}>
        <TouchableOpacity
          style={styles.countryBtn}
          activeOpacity={0.7}
          onPress={() => setShowCountryPicker(true)}>
          <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
          <Text style={styles.countryCallingCode}>
            {selectedCountry.callingCode}
          </Text>
          <Text style={styles.countryChevron}>▾</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, styles.mobileInput]}
          value={mobileNumber}
          onChangeText={text =>
            setMobileNumber(
              digitsOnly(text).slice(
                0,
                selectedCountry.code === 'IN' ? MOBILE_DIGITS : 15,
              ),
            )
          }
          keyboardType="phone-pad"
          placeholder={
            selectedCountry.code === 'IN'
              ? `Enter ${MOBILE_DIGITS}-digit mobile number`
              : 'Enter mobile number'
          }
          placeholderTextColor={Colors.placeholder}
          maxLength={selectedCountry.code === 'IN' ? MOBILE_DIGITS : 15}
        />
      </View>
      {selectedCountry.code === 'IN' &&
      mobileNumber.length > 0 &&
      !isMobile(mobileNumber) ? (
        <Text style={styles.fieldError}>
          Mobile number must be {MOBILE_DIGITS} digits — {mobileNumber.length}{' '}
          entered.
        </Text>
      ) : null}

      <CountrySelector
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={item => {
          setSelectedCountry(item);
          setCountryCode(item.callingCode.replace(/\D/g, ''));
        }}
      />

      <View style={styles.actions}>
        <PrimaryButton
          title={submitting ? 'SENDING OTP...' : 'SEND OTP'}
          onPress={submit}
          disabled={submitting}
        />
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
          disabled={submitting}>
          <Text style={styles.signInText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};

export default CreateAccountScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  helper: {
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 20,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 18,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  fieldError: {
    color: Colors.error,
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 10,
  },
  mobileRow: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  countryBtn: {
    height: 55,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCallingCode: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  countryChevron: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  mobileInput: {flex: 1},
  actions: {marginTop: 16, marginBottom: 24},
  signInBtn: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 10,
  },
  signInText: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 16,
  },
});
