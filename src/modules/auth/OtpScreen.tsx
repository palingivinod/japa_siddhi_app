import React, {useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import OTPInput from './components/OTPInput';
import ResendTimer from './components/ResendTimer';
import ContinueButton from './components/ContinueButton';
import AppHeader from '../common/AppHeader';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';

const OtpScreen = ({route, navigation}: any) => {
  const {
    phoneNumber,
    mobileCountryCode,
    mobileNumber,
    email,
    sentTo,
    password,
    mode = 'register',
  } = route.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyOTP = async () => {
    if (mode !== 'register') {
      Alert.alert(
        'Sign in',
        'Existing accounts must sign in with email and password.',
      );
      navigation.navigate('Login', {forceLoginForm: true});
      return;
    }

    if (otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit OTP.');
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
      const response = await apiService.post('/auth/otp/send', {
        mobileCountryCode,
        mobileNumber,
        email,
        mode: 'register',
      });
      setOtp('');
      Alert.alert(
        'OTP Sent',
        `A new 4-digit code was sent to ${
          response.data?.data?.sentTo || email
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppHeader title="Verify Email OTP" showBack />
      <Text style={styles.subtitle}>
        Enter the 4-digit OTP sent to your email to create your account
      </Text>
      <Text style={styles.mobile}>{sentTo || email || phoneNumber}</Text>
      <OTPInput value={otp} onChange={setOtp} length={4} />
      <ResendTimer onResend={resendOTP} />
      <View style={styles.action}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.templeGold} />
        ) : (
          <ContinueButton title="VERIFY & CONTINUE" onPress={verifyOTP} />
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
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.sacredBrown,
    marginBottom: 8,
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
