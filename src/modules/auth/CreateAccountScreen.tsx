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
import {dismissKeyboardThen} from '../../utils/keyboard';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import PasswordField from '../common/PasswordField';
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
  const [otpChannel, setOtpChannel] = useState<'email' | 'phone'>('email');

  const submit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const code =
      selectedCountry.callingCode.replace(/\D/g, '') ||
      countryCode.replace(/\D/g, '') ||
      '91';
    const mobile = mobileNumber.replace(/\D/g, '');

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert(t('required'), t('enterValidEmail'));
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert(t('required'), t('passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('required'), t('passwordsDoNotMatch'));
      return;
    }
    if (code === '91') {
      if (!isMobile(mobile) || /^0+$/.test(mobile)) {
        Alert.alert(
          t('required'),
          t('enterMobileDigits', {digits: MOBILE_DIGITS}),
        );
        return;
      }
    } else {
      if (mobile.length < 6 || mobile.length > 15 || /^0+$/.test(mobile)) {
        Alert.alert(t('required'), t('enterValidMobileNumber'));
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
        channel: otpChannel,
      });
      const data = response.data?.data || {};
      if (otpChannel === 'phone' && data.phoneOtpAvailable === false) {
        setOtpChannel('email');
        Alert.alert(
          t('phoneOtpComingSoonTitle'),
          data.message || t('phoneOtpComingSoon'),
          [{text: t('useEmailOtp'), onPress: () => setOtpChannel('email')}],
        );
        return;
      }

      let phoneE164 = `+${code}${mobile}`;
      let verificationId = '';
      if (otpChannel === 'phone') {
        const {default: firebaseAuthService} = await import(
          './services/firebaseAuthService'
        );
        const fb = await firebaseAuthService.sendOTP(phoneE164, {
          countryCode: code,
        });
        if (!fb.success || !fb.verificationId) {
          throw new Error(fb.message || t('unableSendOtpRetry'));
        }
        phoneE164 = fb.e164 || phoneE164;
        verificationId = fb.verificationId;
      }

      navigation.navigate('OtpScreen', {
        mode: 'register',
        channel: otpChannel,
        email: trimmedEmail,
        password: password.trim(),
        phoneNumber: phoneE164,
        mobileCountryCode: code,
        mobileNumber: mobile,
        verificationId,
        sentTo:
          data.sentTo ||
          (otpChannel === 'phone' ? phoneE164 : trimmedEmail),
      });
    } catch (error: any) {
      if (otpChannel === 'phone') {
        const phoneMessage =
          error?.response?.data?.message ||
          error?.message ||
          t('unableSendOtpRetry');
        Alert.alert(t('createAccountAlertTitle'), phoneMessage, [
          {text: t('ok')},
          {text: t('useEmailOtp'), onPress: () => setOtpChannel('email')},
        ]);
      } else {
        const serverMessage =
          error?.response?.data?.message ||
          error?.message ||
          t('unableSendOtpRetry');
        const addressMissing = /address not found/i.test(String(serverMessage));
        Alert.alert(
          addressMissing ? 'Address not found' : t('createAccountAlertTitle'),
          addressMissing
            ? String(serverMessage).replace(/^Address not found\.\s*/i, '')
            : serverMessage,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout title={t('createAccountTitle')} showBack>
      <Text style={styles.heading}>{t('createYourAccount')}</Text>
      <Text style={styles.helper}>{t('createAccountHelper')}</Text>

      <Text style={styles.label}>{t('sendOtpTo')}</Text>
      <View style={styles.segmentRow}>
        {(
          [
            {id: 'email' as const, label: t('email')},
            {id: 'phone' as const, label: t('channelPhone')},
          ] as const
        ).map(option => {
          const active = otpChannel === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setOtpChannel(option.id)}
              activeOpacity={0.85}>
              <Text
                style={[
                  styles.segmentText,
                  active && styles.segmentTextActive,
                ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
        underlineColorAndroid="transparent"
      />

      <Text style={styles.label}>{t('password')}</Text>
      <PasswordField
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder={t('passwordMinPlaceholder')}
        placeholderTextColor={Colors.placeholder}
      />

      <Text style={styles.label}>{t('confirmPassword')}</Text>
      <PasswordField
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('reenterPassword')}
        placeholderTextColor={Colors.placeholder}
      />

      <Text style={styles.label}>{t('mobileNumber')} *</Text>
      <View style={styles.mobileRow}>
        <TouchableOpacity
          style={styles.countryBtn}
          activeOpacity={0.7}
          onPress={() =>
            dismissKeyboardThen(() => setShowCountryPicker(true))
          }>
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
              ? t('mobileDigitsPlaceholder', {digits: MOBILE_DIGITS})
              : t('enterMobileNumber')
          }
          placeholderTextColor={Colors.placeholder}
          maxLength={selectedCountry.code === 'IN' ? MOBILE_DIGITS : 15}
          underlineColorAndroid="transparent"
        />
      </View>
      {selectedCountry.code === 'IN' &&
      mobileNumber.length > 0 &&
      !isMobile(mobileNumber) ? (
        <Text style={styles.fieldError}>
          {t('mobileMustBeDigits', {
            digits: MOBILE_DIGITS,
            entered: mobileNumber.length,
          })}
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
          title={submitting ? t('sendingOtp') : t('sendOtp')}
          onPress={submit}
          disabled={submitting}
        />
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
          disabled={submitting}>
          <Text style={styles.signInText}>{t('signInLink')}</Text>
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
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  fieldError: {
    color: Colors.error,
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 10,
  },
  mobileRow: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  countryBtn: {
    height: 55,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    flexShrink: 0,
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
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    borderColor: Colors.templeGold,
    backgroundColor: Colors.templeGold,
  },
  segmentText: {
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  segmentTextActive: {
    color: Colors.white,
  },
});
