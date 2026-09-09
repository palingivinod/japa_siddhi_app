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

const OtpScreen = ({route, navigation}: any) => {
  const {phoneNumber, mobileCountryCode, mobileNumber, email, sentTo} =
    route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const goAfterVerify = async (data: any) => {
    if (data?.token && data?.user) {
      await saveSession(data.token, data.user);
      resetAuthGate();
      const profileCompleted = [1, '1', true, 'true'].includes(
        data.user?.profileCompleted ?? data.user?.profile_completed,
      );
      if (profileCompleted) {
        navigation.reset({
          index: 0,
          routes: [{name: 'Home'}],
        });
        return;
      }
      // Incomplete profile for THIS email account only — never reuse another phone's name.
      navigation.replace('CompleteProfile', {
        phoneNumber,
        mobileCountryCode,
        mobileNumber,
        email: data.user?.email || email,
        fullName: data.user?.fullName || data.user?.full_name || '',
      });
      return;
    }

    navigation.replace('SignupPersonal', {
      phoneNumber,
      mobileCountryCode,
      mobileNumber,
      email,
      fullName: '',
    });
  };

  const verifyOTP = async () => {
    if (otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/auth/otp/verify', {
        mobileCountryCode,
        mobileNumber,
        email,
        otp,
      });
      await goAfterVerify(response.data.data);
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
      });
      setOtp('');
      Alert.alert(
        'OTP Sent',
        `A new 4-digit code was sent to ${response.data?.data?.sentTo || email}.`,
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
        Enter the 4-digit OTP sent to your email
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
          Change mobile / email
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
