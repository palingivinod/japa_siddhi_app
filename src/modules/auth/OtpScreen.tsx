import React, {useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

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
  const bottomPad = useBottomNavPad();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const isLogin = mode === 'login';
  const otpChannel = channel === 'phone' ? 'phone' : 'email';

  const verifyOTP = async () => {
    if (otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit OTP.');
      return;
    }

    if (isLogin) {
      setLoading(true);
      try {
        const payload =
          otpChannel === 'phone'
            ? {
                mode: 'login',
                channel: 'phone',
                mobileCountryCode: mobileCountryCode || '91',
                mobileNumber,
                otp,
              }
            : {
                mode: 'login',
                channel: 'email',
                email,
                otp,
              };
        const response = await apiService.post('/auth/otp/verify', payload);
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
          'Verification Failed',
          error?.response?.data?.message || 'OTP verification failed.',
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || String(password).length < 6) {
      Alert.alert(
        'Create account',
        'Password is missing. Go back and create your account again.',
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
        'Verification Failed',
        error?.response?.data?.message || 'OTP verification failed.',
      );
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    try {
      const payload = isLogin
        ? otpChannel === 'phone'
          ? {
              mode: 'login',
              channel: 'phone',
              mobileCountryCode: mobileCountryCode || '91',
              mobileNumber,
            }
          : {
              mode: 'login',
              channel: 'email',
              email,
            }
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
        'OTP Sent',
        `A new 4-digit code was sent to ${
          response.data?.data?.sentTo || sentTo || email || phoneNumber
        }.`,
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Unable to resend OTP.',
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, {paddingHorizontal: BODY_PAD}]}
      edges={['top', 'left', 'right']}>
      <AppHeader
        title={isLogin ? 'Verify OTP' : 'Verify Email OTP'}
        showBack
      />
      <Text style={styles.subtitle}>
        {isLogin
          ? otpChannel === 'phone'
            ? 'Enter the 4-digit OTP sent to your mobile number'
            : 'Enter the 4-digit OTP sent to your email'
          : 'Enter the 4-digit OTP sent to your email to create your account'}
      </Text>
      <Text style={styles.mobile}>{sentTo || email || phoneNumber}</Text>
      <OTPInput value={otp} onChange={setOtp} length={4} />
      <ResendTimer onResend={resendOTP} />
      <View style={[styles.action, {paddingBottom: bottomPad}]}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.templeGold} />
        ) : (
          <ContinueButton
            title={isLogin ? 'VERIFY & LOGIN' : 'VERIFY & CONTINUE'}
            onPress={verifyOTP}
          />
        )}
        <Text style={styles.change} onPress={() => navigation.goBack()}>
          Change details
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.templeGold,
    marginBottom: 8,
  },
  action: {
    marginTop: 32,
  },
  change: {
    marginTop: 18,
    textAlign: 'center',
    color: Colors.templeGold,
    fontWeight: '800',
  },
});
