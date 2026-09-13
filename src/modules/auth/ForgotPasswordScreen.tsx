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
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import {
  resetAdminPassword,
  sendAdminForgotOtp,
} from '../admin/adminCredentials';

type Step = 'identifier' | 'otp';
type AccountKind = 'user' | 'admin';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState(
    String(route.params?.identifier || route.params?.email || ''),
  );
  const [accountEmail, setAccountEmail] = useState('');
  const [accountKind, setAccountKind] = useState<AccountKind>('user');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const sendOtp = async () => {
    const value = identifier.trim();
    if (!value) {
      Alert.alert('Required', 'Enter your email or mobile number.');
      return;
    }

    setBusy(true);
    try {
      // Prefer devotee reset; fall back to admin when email matches an admin.
      try {
        const response = await apiService.post('/auth/forgot/send-otp', {
          identifier: value,
          email: value.includes('@') ? value.toLowerCase() : undefined,
        });
        const data = response.data?.data || {};
        setAccountKind('user');
        setAccountEmail(String(data.email || value).toLowerCase());
        setSentTo(data.sentTo || value);
        setStep('otp');
        Alert.alert(
          'OTP sent',
          `A 4-digit code was sent to ${data.sentTo || value}.`,
        );
        return;
      } catch (userError: any) {
        if (!value.includes('@')) {
          throw userError;
        }
        const result = await sendAdminForgotOtp(value.toLowerCase());
        setAccountKind('admin');
        setAccountEmail(value.toLowerCase());
        setSentTo(result?.sentTo || value);
        setStep('otp');
        Alert.alert(
          'OTP sent',
          `A 4-digit code was sent to ${result?.sentTo || value}.`,
        );
      }
    } catch (error) {
      Alert.alert('OTP failed', getApiError(error, 'Could not send OTP.'));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (otp.trim().length !== 4) {
      Alert.alert('Required', 'Enter the 4-digit OTP from email.');
      return;
    }
    if (newPassword.trim().length < 6) {
      Alert.alert('Required', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Required', 'Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (accountKind === 'admin') {
        await resetAdminPassword(
          accountEmail,
          otp.trim(),
          newPassword.trim(),
        );
      } else {
        await apiService.post('/auth/forgot/reset', {
          email: accountEmail,
          otp: otp.trim(),
          newPassword: newPassword.trim(),
        });
      }
      Alert.alert('Password updated', 'Login with your new password.', [
        {
          text: 'OK',
          onPress: () =>
            navigation.navigate('Login', {forceLoginForm: true}),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Reset failed',
        getApiError(error, 'Could not update password.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout title="Forgot Password" showBack>
      <Text style={styles.heading}>Reset password</Text>
      <Text style={styles.sub}>
        Enter your email or mobile number. We will send a 4-digit OTP to the
        registered email so you can set a new password.
      </Text>

      <Text style={styles.label}>Email / Mobile number</Text>
      <TextInput
        style={[styles.input, step === 'otp' && styles.disabled]}
        value={identifier}
        onChangeText={setIdentifier}
        editable={step === 'identifier'}
        placeholder="email@example.com or 9876543210"
        placeholderTextColor={Colors.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {step === 'otp' ? (
        <>
          {sentTo ? <Text style={styles.hint}>OTP sent to {sentTo}</Text> : null}

          <Text style={styles.label}>OTP</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="4-digit OTP"
            placeholderTextColor={Colors.placeholder}
          />

          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="New password"
            placeholderTextColor={Colors.placeholder}
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirm password"
            placeholderTextColor={Colors.placeholder}
          />

          <PrimaryButton
            title={busy ? 'UPDATING...' : 'UPDATE PASSWORD'}
            onPress={resetPassword}
            disabled={busy}
          />
          <View style={styles.gap} />
          <PrimaryButton
            title={busy ? 'PLEASE WAIT...' : 'RESEND OTP'}
            onPress={sendOtp}
            disabled={busy}
          />
        </>
      ) : (
        <PrimaryButton
          title={busy ? 'SENDING...' : 'SEND OTP'}
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
