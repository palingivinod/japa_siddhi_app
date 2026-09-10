import React, {useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AppHeader from '../common/AppHeader';
import PrimaryButton from '../common/PrimaryButton';
import {saveAdminSession} from './adminSession';
import {resetAdminAuthGate} from './AdminAuthGate';
import {getApiError, verifyAdminCredentials} from './adminCredentials';

const AdminLoginScreen = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password.trim()) {
      Alert.alert('Required', 'Enter admin email and password.');
      return;
    }
    setBusy(true);
    try {
      const admin = await verifyAdminCredentials(trimmed, password);
      resetAdminAuthGate();
      await saveAdminSession(admin.email || trimmed);
      navigation.reset({
        index: 0,
        routes: [{name: 'AdminDashboard'}],
      });
    } catch (error: any) {
      Alert.alert(
        'Sign in failed',
        getApiError(error, 'Invalid admin email or password.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <AppHeader title="Admin Login" showBack />
        <Text style={styles.heading}>Admin Login</Text>
        <Text style={styles.sub}>Secure administrator access.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter here"
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
          placeholder="Enter here"
          placeholderTextColor={Colors.placeholder}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={() =>
            navigation.navigate('AdminForgotPassword', {
              email: email.trim().toLowerCase(),
            })
          }>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <PrimaryButton
          title={busy ? 'SIGNING IN...' : 'SIGN IN'}
          onPress={signIn}
          disabled={busy}
        />
      </View>
    </SafeAreaView>
  );
};

export default AdminLoginScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, paddingHorizontal: 20},
  heading: {
    marginTop: 8,
    fontSize: 28,
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
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 18,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
});
