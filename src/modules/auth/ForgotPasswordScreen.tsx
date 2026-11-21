import React, {useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import PasswordField from '../common/PasswordField';
import apiService, {getApiError} from '../../services/apiService';

type Step = 'identifier' | 'otp';
type ResetChannel = 'email' | 'phone';

const friendlyForgotError = (
  error: any,
  fallback: string,
  noAccount: string,
) => {
  const raw = String(getApiError(error, fallback) || '');
  if (/no admin account/i.test(raw)) {
    return noAccount;
  }
  if (/cannot post|not found|404/i.test(raw) && /forgot|admin/i.test(raw)) {
    return noAccount;
  }
  // Hide server filesystem noise (e.g. EACCES mkdir '/var/data') from devotees.
  if (/EACCES|permission denied|mkdir|\/var\/data|SQLITE_PATH/i.test(raw)) {
    return fallback;
  }
  return raw || fallback;
};

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState(
    String(route.params?.identifier || route.params?.email || ''),
  );
  const [accountEmail, setAccountEmail] = useState('');
  const [resetChannel, setResetChannel] = useState<ResetChannel>('email');
  const [mobileCountryCode, setMobileCountryCode] = useState('91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const otpLength = resetChannel === 'phone' ? 6 : 4;

  const sendOtp = async () => {
    const value = identifier.trim();
    if (!value) {
      Alert.alert(t('required'), t('enterEmailOrMobile'));
      return;
    }

    const isPhone = !value.includes('@');
    if (isPhone) {
      const digits = value.replace(/\D/g, '');
      const mobile = digits.length > 10 ? digits.slice(-10) : digits;
      if (mobile.length < 8 || /^0+$/.test(mobile)) {
        Alert.alert(t('required'), t('enterValidMobileNumber'));
        return;
      }
    }

    setBusy(true);
    try {
      // Devotee reset only. Admins use AdminForgotPassword from Admin Login.
      const response = await apiService.post('/auth/forgot/send-otp', {
        identifier: value,
        email: value.includes('@') ? value.toLowerCase() : undefined,
        mobileCountryCode: isPhone ? '91' : undefined,
      });
      const data = response.data?.data || {};

      if (data.phoneOtpAvailable === false) {
        Alert.alert(
          t('phoneOtpComingSoonTitle'),
          data.message || t('phoneOtpComingSoon'),
          [{text: t('useEmailOtp')}],
        );
        return;
      }

      if (data.channel === 'phone' || data.provider === 'firebase') {
        const cc = String(data.mobileCountryCode || '91').replace(/\D/g, '') || '91';
        const mobile = String(data.mobileNumber || value.replace(/\D/g, ''))
          .replace(/\D/g, '')
          .slice(-10);
        const e164 = `+${cc}${mobile}`;
        const {default: firebaseAuthService} = await import(
          './services/firebaseAuthService'
        );
        const fb = await firebaseAuthService.sendOTP(e164, {
          forceResend: step === 'otp',
        });
        if (!fb.success || !fb.verificationId) {
          throw new Error(fb.message || t('couldNotSendOtp'));
        }
        setResetChannel('phone');
        setMobileCountryCode(cc);
        setMobileNumber(mobile);
        setVerificationId(fb.verificationId);
        setAccountEmail(String(data.email || '').toLowerCase());
        setSentTo(data.sentTo || fb.e164 || e164);
        setOtp('');
        setStep('otp');
        Alert.alert(
          t('otpSentTitle'),
          t('otpSentToPhone', {to: data.sentTo || fb.e164 || e164}),
        );
        return;
      }

      setResetChannel('email');
      setVerificationId('');
      setMobileNumber('');
      setAccountEmail(String(data.email || value).toLowerCase());
      setSentTo(data.sentTo || value);
      setOtp('');
      setStep('otp');
      Alert.alert(
        t('otpSentTitle'),
        t('otpSentToValue', {to: data.sentTo || value}),
      );
    } catch (error: any) {
      Alert.alert(
        t('otpFailed'),
        friendlyForgotError(
          error,
          error?.message || t('couldNotSendOtp'),
          t('noAccountFound'),
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (otp.trim().length !== otpLength) {
      Alert.alert(
        t('required'),
        resetChannel === 'phone'
          ? t('enterSixDigitOtp')
          : t('enterFourDigitOtpFromEmail'),
      );
      return;
    }
    if (newPassword.trim().length < 6) {
      Alert.alert(t('required'), t('newPasswordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('required'), t('passwordsDoNotMatch'));
      return;
    }

    setBusy(true);
    try {
      if (resetChannel === 'phone') {
        const {default: firebaseAuthService} = await import(
          './services/firebaseAuthService'
        );
        const fb = await firebaseAuthService.verifyCode(
          otp.trim(),
          verificationId,
        );
        if (!fb.success || !fb.idToken) {
          throw new Error(fb.message || t('otpVerificationFailed'));
        }
        await apiService.post('/auth/forgot/reset', {
          channel: 'phone',
          firebaseToken: fb.idToken,
          mobileCountryCode,
          mobileNumber,
          newPassword: newPassword.trim(),
        });
      } else {
        await apiService.post('/auth/forgot/reset', {
          channel: 'email',
          email: accountEmail,
          otp: otp.trim(),
          newPassword: newPassword.trim(),
        });
      }
      Alert.alert(t('passwordUpdated'), t('loginWithNewPassword'), [
        {
          text: t('ok'),
          onPress: () =>
            navigation.navigate('Login', {forceLoginForm: true}),
        },
      ]);
    } catch (error) {
      Alert.alert(
        t('resetFailed'),
        friendlyForgotError(
          error,
          t('couldNotUpdatePassword'),
          t('noAccountFound'),
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout title={t('forgotPasswordTitle')} showBack>
      <Text style={styles.heading}>{t('resetPasswordHeading')}</Text>
      <Text style={styles.sub}>{t('forgotPasswordHelper')}</Text>

      <Text style={styles.label}>{t('emailOrMobile')}</Text>
      <TextInput
        style={[styles.input, step === 'otp' && styles.disabled]}
        value={identifier}
        onChangeText={setIdentifier}
        editable={step === 'identifier'}
        placeholder={t('emailOrMobilePlaceholder')}
        placeholderTextColor={Colors.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        underlineColorAndroid="transparent"
      />

      {step === 'otp' ? (
        <>
          {sentTo ? (
            <Text style={styles.hint}>
              {t('otpSentToHint', {to: sentTo})}
            </Text>
          ) : null}

          <Text style={styles.label}>{t('loginMethodOtp')}</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={otpLength}
            placeholder={
              resetChannel === 'phone' ? t('sixDigitOtp') : t('fourDigitOtp')
            }
            placeholderTextColor={Colors.placeholder}
            underlineColorAndroid="transparent"
          />

          <Text style={styles.label}>{t('newPassword')}</Text>
          <PasswordField
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('newPassword')}
            placeholderTextColor={Colors.placeholder}
          />

          <Text style={styles.label}>{t('confirmPassword')}</Text>
          <PasswordField
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('confirmPassword')}
            placeholderTextColor={Colors.placeholder}
          />

          <PrimaryButton
            title={busy ? t('updating') : t('updatePassword')}
            onPress={resetPassword}
            disabled={busy}
          />
          <View style={styles.gap} />
          <PrimaryButton
            title={busy ? t('pleaseWait') : t('resendOtp')}
            onPress={sendOtp}
            disabled={busy}
          />
        </>
      ) : (
        <PrimaryButton
          title={busy ? t('sending') : t('sendOtp')}
          onPress={sendOtp}
          disabled={busy}
        />
      )}
    </ScreenLayout>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  heading: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 22,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  disabled: {
    backgroundColor: '#F3F1EC',
    color: '#8A8174',
  },
  hint: {
    marginTop: -8,
    marginBottom: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  gap: {height: 12},
});
