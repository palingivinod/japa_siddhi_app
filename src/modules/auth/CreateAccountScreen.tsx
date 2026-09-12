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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CreateAccountScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [mobileNumber, setMobileNumber] = useState('');

  const submit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const code = countryCode.replace(/\D/g, '') || '91';
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
    if (mobile.length < 8 || /^0+$/.test(mobile)) {
      Alert.alert(t('required'), 'Enter a valid mobile number.');
      return;
    }

    setSubmitting(true);
    try {
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
        <TextInput
          style={[styles.input, styles.codeInput]}
          value={countryCode}
          onChangeText={text =>
            setCountryCode(text.replace(/\D/g, '').slice(0, 4))
          }
          keyboardType="phone-pad"
          placeholder="91"
          placeholderTextColor={Colors.placeholder}
          maxLength={4}
        />
        <TextInput
          style={[styles.input, styles.mobileInput]}
          value={mobileNumber}
          onChangeText={text =>
            setMobileNumber(text.replace(/\D/g, '').slice(0, 15))
          }
          keyboardType="phone-pad"
          placeholder="Enter mobile number"
          placeholderTextColor={Colors.placeholder}
          maxLength={15}
        />
      </View>

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
  mobileRow: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  codeInput: {width: 72, textAlign: 'center'},
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
