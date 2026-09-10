import React, {useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AppHeader from '../common/AppHeader';
import PrimaryButton from '../common/PrimaryButton';
import {
  getApiError,
  resetAdminPassword,
  sendAdminForgotOtp,
} from './adminCredentials';

type Step = 'email' | 'otp';

const AdminForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(
    String(route.params?.email || '').toLowerCase(),
  );
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const sendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      Alert.alert('Required', 'Enter the admin email address.');
      return;
    }
    setBusy(true);
    try {
      const result = await sendAdminForgotOtp(trimmed);
      setSentTo(result?.sentTo || trimmed);
      setStep('otp');
      Alert.alert(
        'OTP sent',
        `A 4-digit code was sent to ${result?.sentTo || trimmed}.`,
      );
    } catch (error) {
      Alert.alert('OTP failed', getApiError(error, 'Could not send OTP.'));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const trimmed = email.trim().toLowerCase();
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
      await resetAdminPassword(trimmed, otp.trim(), newPassword.trim());
      Alert.alert(
        'Password updated',
        'Sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('AdminLogin'),
          },
        ],
      );
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title="Forgot Password" showBack />
        <Text style={styles.heading}>Reset admin password</Text>
        <Text style={styles.sub}>
          We will email a 4-digit OTP so you can set a new password.
        </Text>

        <Text style={styles.label}>Admin email</Text>
        <TextInput
          style={[styles.input, step === 'otp' && styles.disabled]}
          value={email}
          onChangeText={setEmail}
          editable={step === 'email'}
          placeholder="admin@email.com"
          placeholderTextColor={Colors.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {step === 'otp' ? (
          <>
            {sentTo ? (
              <Text style={styles.hint}>OTP sent to {sentTo}</Text>
            ) : null}

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
      </View>
    </SafeAreaView>
  );
};

export default AdminForgotPasswordScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 20},
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
