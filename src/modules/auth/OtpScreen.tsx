import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useLanguage} from '../../i18n/LanguageContext';
import OTPInput from './components/OTPInput';
import ResendTimer from './components/ResendTimer';
import ContinueButton from './components/ContinueButton';
import AppHeader from '../common/AppHeader';
import apiService from '../../services/apiService';
import {saveSession} from '../../services/session';
import {resetAuthGate} from '../common/AuthGate';
import Colors from '../../theme/colors';
import {useBottomNavPad} from '../../utils/safeArea';
import {BODY_PAD} from '../../utils/layoutSpacing';
import firebaseAuthService from './services/firebaseAuthService';

const OtpScreen = ({route, navigation}: any) => {
  const {
    phoneNumber,
    mobileCountryCode,
    mobileNumber,
    email,
    sentTo,
    password,
    channel = 'email',
    mode = 'register',
  } = route.params || {};
  const {t} = useLanguage();
  const bottomPad = useBottomNavPad();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState(
    String(route?.params?.verificationId || ''),
  );
  const isLogin = mode === 'login';
  const otpChannel = channel === 'phone' ? 'phone' : 'email';
  // Firebase SMS codes are 6 digits; email OTP from our backend is 4.
  const otpLength = otpChannel === 'phone' ? 6 : 4;

  const verifyOTP = async (autoCode?: string) => {
    const entered = String(autoCode || otp);
    if (entered.length !== otpLength) {
      Alert.alert(
        t('invalidOtp'),
        otpChannel === 'phone' ? t('enterSixDigitOtp') : t('enterFourDigitOtp'),
      );
      return;
    }

    if (otpChannel === 'phone') {
      setLoading(true);
      try {
        if (autoCode) {
          setOtp(autoCode);
        }
        const fb = await firebaseAuthService.verifyCode(entered, verificationId);
        if (!fb.success || !fb.idToken) {
          throw new Error(fb.message || t('otpVerificationFailed'));
        }

        if (isLogin) {
          const response = await apiService.post('/auth/otp/verify', {
            mode: 'login',
            channel: 'phone',
            mobileCountryCode: mobileCountryCode || '91',
            mobileNumber,
            firebaseToken: fb.idToken,
          });
          const data = response.data?.data || {};
          if (!data?.token || !data?.user) {
            throw new Error('Login did not return a session');
          }
          await saveSession(data.token, data.user);
          try {
            const profileResponse = await apiService.get('/auth/profile');
            const profile = profileResponse.data?.data;
            if (profile) {
              await saveSession(data.token, {...data.user, ...profile});
            }
          } catch {
            // Token + user from verify is enough if profile refresh fails.
          }
          resetAuthGate();
          const {resetToHomeAfterAuth} = await import(
            '../../navigation/goHomeAfterAuth'
          );
          await resetToHomeAfterAuth(navigation);
          return;
        }

        if (!password || String(password).length < 6) {
          Alert.alert(
            t('createAccountAlertTitle'),
            t('passwordMissingSignup'),
          );
          return;
        }

        const response = await apiService.post('/auth/otp/verify', {
          mobileCountryCode,
          mobileNumber,
          email,
          mode: 'register',
          channel: 'phone',
          firebaseToken: fb.idToken,
        });
        const data = response.data?.data || {};
        navigation.replace('SignupPersonal', {
          phoneNumber:
            phoneNumber ||
            `${data.mobileCountryCode || mobileCountryCode}${
              data.mobileNumber || mobileNumber
            }`,
          mobileCountryCode: data.mobileCountryCode || mobileCountryCode,
          mobileNumber: data.mobileNumber || mobileNumber,
          email: data.email || email,
          password,
          fullName: '',
          firebaseToken: fb.idToken,
          firebaseUid: data.firebaseUid,
        });
      } catch (error: any) {
        Alert.alert(
          t('verificationFailed'),
          error?.response?.data?.message ||
            error?.message ||
            t('otpVerificationFailed'),
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isLogin) {
      setLoading(true);
      try {
        const response = await apiService.post('/auth/otp/verify', {
          mode: 'login',
          channel: 'email',
          email,
          otp,
        });
        const data = response.data?.data || {};
        if (!data?.token || !data?.user) {
          throw new Error('Login did not return a session');
        }
        await saveSession(data.token, data.user);
        try {
          const profileResponse = await apiService.get('/auth/profile');
          const profile = profileResponse.data?.data;
          if (profile) {
            await saveSession(data.token, {...data.user, ...profile});
          }
        } catch {
          // Token + user from verify is enough if profile refresh fails.
        }
        resetAuthGate();
        const {resetToHomeAfterAuth} = await import(
          '../../navigation/goHomeAfterAuth'
        );
        await resetToHomeAfterAuth(navigation);
      } catch (error: any) {
        Alert.alert(
          t('verificationFailed'),
          error?.response?.data?.message || t('otpVerificationFailed'),
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || String(password).length < 6) {
      Alert.alert(
        t('createAccountAlertTitle'),
        t('passwordMissingSignup'),
      );
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/auth/otp/verify', {
        mobileCountryCode,
        mobileNumber,
        email,
        otp,
        mode: 'register',
        channel: 'email',
      });
      const data = response.data?.data || {};
      navigation.replace('SignupPersonal', {
        phoneNumber:
          phoneNumber ||
          `${data.mobileCountryCode || mobileCountryCode}${
            data.mobileNumber || mobileNumber
          }`,
        mobileCountryCode: data.mobileCountryCode || mobileCountryCode,
        mobileNumber: data.mobileNumber || mobileNumber,
        email: data.email || email,
        password,
        fullName: '',
      });
    } catch (error: any) {
      Alert.alert(
        t('verificationFailed'),
        error?.response?.data?.message || t('otpVerificationFailed'),
      );
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    try {
      if (otpChannel === 'phone') {
        const e164 =
          phoneNumber?.startsWith('+')
            ? phoneNumber
            : `+${mobileCountryCode || '91'}${mobileNumber}`;
        // Re-check account / uniqueness on backend, then force a new Firebase SMS.
        const gate = await apiService.post('/auth/otp/send', {
          mode: isLogin ? 'login' : 'register',
          channel: 'phone',
          mobileCountryCode: mobileCountryCode || '91',
          mobileNumber,
          email,
        });
        if (gate.data?.data?.phoneOtpAvailable === false) {
          Alert.alert(
            t('phoneOtpComingSoonTitle'),
            gate.data?.data?.message || t('phoneOtpComingSoon'),
            [{text: t('useEmailOtp'), onPress: () => navigation.goBack()}],
          );
          return;
        }
        const fb = await firebaseAuthService.sendOTP(e164, {
          forceResend: true,
        });
        if (!fb.success || !fb.verificationId) {
          throw new Error(fb.message || t('unableResendOtp'));
        }
        setVerificationId(fb.verificationId);
        navigation.setParams?.({verificationId: fb.verificationId});
        setOtp('');
        Alert.alert(
          t('otpSentTitle'),
          t('otpSentToPhone', {to: fb.e164 || sentTo || e164}),
        );
        return;
      }

      const payload = isLogin
        ? {mode: 'login', channel: 'email', email}
        : {
            mobileCountryCode,
            mobileNumber,
            email,
            mode: 'register',
            channel: 'email',
          };
      const response = await apiService.post('/auth/otp/send', payload);
      setOtp('');
      Alert.alert(
        t('otpSentTitle'),
        t('otpSentToValue', {
          to: response.data?.data?.sentTo || sentTo || email || phoneNumber,
        }),
      );
    } catch (error: any) {
      if (otpChannel === 'phone') {
        const phoneMessage =
          error?.response?.data?.message ||
          error?.message ||
          t('unableResendOtp');
        const alreadyInUse =
          /already (registered|exists|in use)|belongs to another|please sign in|is already/i.test(
            String(phoneMessage),
          );
        Alert.alert(
          t('otpFailed'),
          phoneMessage,
          alreadyInUse
            ? [{text: t('ok')}]
            : [
                {text: t('ok')},
                {
                  text: t('useEmailOtp'),
                  onPress: () => navigation.goBack(),
                },
              ],
        );
      } else {
        Alert.alert(
          t('errorTitle'),
          error?.response?.data?.message || t('unableResendOtp'),
        );
      }
    }
  };

  const verifyRef = useRef(verifyOTP);
  verifyRef.current = verifyOTP;
  const autoHandled = useRef(false);

  useEffect(() => {
    if (otpChannel !== 'phone') {
      return;
    }
    return firebaseAuthService.subscribeAutoCode(code => {
      if (autoHandled.current || code.length !== otpLength) {
        return;
      }
      autoHandled.current = true;
      setOtp(code);
      verifyRef.current(code);
    });
  }, [otpChannel, otpLength]);

  const headerTitle = isLogin
    ? t('verifyOtpTitle')
    : otpChannel === 'phone'
      ? t('verifyPhoneOtp')
      : t('verifyEmailOtp');

  const subtitle = isLogin
    ? otpChannel === 'phone'
      ? t('otpEnterMobile')
      : t('otpEnterEmail')
    : otpChannel === 'phone'
      ? t('otpEnterPhoneRegister')
      : t('otpEnterEmailRegister');

  return (
    <SafeAreaView
      style={[styles.container, {paddingHorizontal: BODY_PAD}]}
      edges={['top', 'left', 'right']}>
      <AppHeader title={headerTitle} showBack />
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.mobile}>{sentTo || email || phoneNumber}</Text>
      <OTPInput value={otp} onChange={setOtp} length={otpLength} />
      <ResendTimer seconds={60} onResend={resendOTP} />
      <View style={[styles.action, {paddingBottom: bottomPad}]}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.templeGold} />
        ) : (
          <ContinueButton
            title={isLogin ? t('verifyAndLogin') : t('verifyAndContinue')}
            onPress={() => verifyOTP()}
          />
        )}
        <Text style={styles.change} onPress={() => navigation.goBack()}>
          {t('changeDetails')}
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default OtpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.sacredBrown,
    marginBottom: 8,
    paddingBottom: 2,
  },
  mobile: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.leafGreen,
    marginBottom: 20,
  },
  action: {
    marginTop: 28,
    paddingTop: 8,
  },
  change: {
    marginTop: 16,
    textAlign: 'center',
    color: Colors.templeGold,
    fontWeight: '700',
  },
});
