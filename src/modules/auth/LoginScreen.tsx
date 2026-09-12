import React, {useCallback, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import ContinueButton from './components/ContinueButton';
import AppHeader from '../common/AppHeader';
import apiService from '../../services/apiService';
import {
  clearSession,
  getValidSession,
  saveSession,
} from '../../services/session';
import {resetAuthGate} from '../common/AuthGate';
import PrimaryButton from '../common/PrimaryButton';
import {saveAdminSession} from '../admin/adminSession';
import {resetAdminAuthGate} from '../admin/AdminAuthGate';
import {verifyAdminCredentials} from '../admin/adminCredentials';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasValidSession, setHasValidSession] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const forceForm = Boolean(route.params?.forceLoginForm);

      setCheckingSession(true);
      getValidSession().then(session => {
        if (!alive) {
          return;
        }
        const valid = Boolean(session.token) && !forceForm;
        setHasValidSession(valid);
        setCheckingSession(false);
      });

      return () => {
        alive = false;
      };
    }, [route.params?.forceLoginForm]),
  );

  const goHome = async () => {
    const session = await getValidSession();
    if (!session.token) {
      setHasValidSession(false);
      Alert.alert('Session expired', 'Please login again.');
      return;
    }
    resetAuthGate();
    navigation.reset({
      index: 0,
      routes: [{name: 'Home'}],
    });
  };

  const handlePasswordLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert(t('required'), t('validEmailOtp'));
      return;
    }
    if (!password.trim()) {
      Alert.alert(t('required'), 'Enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      try {
        const admin = await verifyAdminCredentials(trimmedEmail, password);
        resetAdminAuthGate();
        await saveAdminSession(admin.email || trimmedEmail);
        navigation.reset({
          index: 0,
          routes: [{name: 'AdminDashboard'}],
        });
        return;
      } catch {
        // Not an admin account — continue with devotee password login.
      }

      const response = await apiService.post('/auth/password-login', {
        email: trimmedEmail,
        password: password.trim(),
      });
      const data = response.data?.data;
      if (!data?.token || !data?.user) {
        throw new Error('Login did not return a session');
      }
      await saveSession(data.token, data.user);
      resetAuthGate();
      navigation.reset({
        index: 0,
        routes: [{name: 'Home'}],
      });
    } catch (error: any) {
      Alert.alert(
        'Login failed',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to sign in. Check your email and password.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestLogin = async () => {
    setSubmitting(true);
    try {
      const response = await apiService.post('/auth/dev-login', {
        email: 'test@japasiddhi.local',
        password: 'test1234',
      });
      const data = response.data?.data;
      if (!data?.token || !data?.user) {
        throw new Error('Test login did not return a session');
      }
      await saveSession(data.token, data.user);
      resetAuthGate();
      navigation.reset({
        index: 0,
        routes: [{name: 'Home'}],
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to sign in.';
      const isNetwork =
        !error?.response &&
        /network|timeout|econnrefused|failed to connect/i.test(String(message));
      Alert.alert(
        'Test login failed',
        isNetwork
          ? 'Cannot reach local API at 127.0.0.1:5000. Keep USB connected and run:\nadb reverse tcp:5000 tcp:5000\nadb reverse tcp:8081 tcp:8081\nAlso keep the backend running.'
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const loginAgain = async () => {
    await clearSession();
    resetAuthGate();
    setHasValidSession(false);
    navigation.setParams({forceLoginForm: true});
  };

  const socialContinue = (name: string) => {
    navigation.navigate('SocialAuth', {provider: name});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          hasValidSession && styles.contentSession,
        ]}>
        <AppHeader title="Welcome to Japa Siddhi" showBack={false} />
        <Text style={styles.heading}>{t('beginSpiritualJourney')}</Text>

        {checkingSession ? (
          <Text style={styles.helper}>Checking session...</Text>
        ) : hasValidSession ? (
          <View style={styles.sessionCenter}>
            <PrimaryButton title={t('continueToHome')} onPress={goHome} />
            <TouchableOpacity style={styles.againBtn} onPress={loginAgain}>
              <Text style={styles.againText}>{t('orLoginAgain')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.label}>{t('email')}</Text>
            <TextInput
              style={styles.emailInput}
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
              style={styles.emailInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={Colors.placeholder}
              secureTextEntry
            />

            <TouchableOpacity
              onPress={() =>
                navigation.navigate('AdminForgotPassword', {
                  email: email.trim().toLowerCase(),
                })
              }>
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>

            <ContinueButton
              title={submitting ? 'SIGNING IN...' : 'SIGN IN'}
              onPress={handlePasswordLogin}
              loading={submitting}
              disabled={submitting}
            />

            {__DEV__ ? (
              <View style={styles.testBox}>
                <Text style={styles.testTitle}>Test login (SMTP off)</Text>
                <Text style={styles.testHint}>
                  test@japasiddhi.local / test1234
                </Text>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={handleTestLogin}
                  disabled={submitting}>
                  <Text style={styles.testButtonText}>
                    {submitting ? 'SIGNING IN...' : 'ENTER AS TEST USER'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.or}>{t('orContinueWith')}</Text>
            {['Google', 'Facebook'].map(item => (
              <TouchableOpacity
                key={item}
                style={styles.social}
                onPress={() => socialContinue(item)}>
                <Text style={styles.socialText}>{item}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('newToJapaSiddhi')}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateAccount')}
                disabled={submitting}>
                <Text style={styles.linkText}>{t('createAnAccount')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('PrivacyPolicy')}>
                <Text style={styles.privacy}>{t('termsPrivacy')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  contentSession: {
    flexGrow: 1,
  },
  sessionCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 280,
    paddingBottom: 48,
  },
  againBtn: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 8,
  },
  againText: {
    color: Colors.leafGreen,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heading: {
    textAlign: 'center',
    color: Colors.leafGreen,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  helper: {
    color: Colors.textSecondary,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 18,
  },
  emailInput: {
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 14,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  or: {
    textAlign: 'center',
    marginVertical: 18,
    color: Colors.leafGreen,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  social: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  socialText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 16,
  },
  testBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  testTitle: {
    color: Colors.leafGreen,
    fontWeight: '800',
    textAlign: 'center',
  },
  testHint: {
    marginTop: 6,
    marginBottom: 12,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 13,
  },
  testButton: {
    backgroundColor: Colors.templeGold,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: Colors.white,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.sacredBrown,
  },
  linkText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.templeGold,
  },
  privacy: {
    marginTop: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
});
