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
import {useBottomNavPad} from '../../utils/safeArea';
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
import {BODY_PAD} from '../../utils/layoutSpacing';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginMethod = 'password' | 'otp';
type OtpChannel = 'email' | 'phone';

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const bottomPad = useBottomNavPad();
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('email');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpMobile, setOtpMobile] = useState('');
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
    const value = identifier.trim();
    if (!value) {
      Alert.alert(t('required'), 'Enter your email or mobile number.');
      return;
    }
    if (!password.trim()) {
      Alert.alert(t('required'), 'Enter your password.');
      return;
    }

    const isEmail = value.includes('@');
    if (isEmail && !EMAIL_REGEX.test(value.toLowerCase())) {
      Alert.alert(t('required'), 'Enter a valid email address.');
      return;
    }
    if (!isEmail) {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 8) {
        Alert.alert(t('required'), 'Enter a valid mobile number.');
        return;
      }
    }

    setSubmitting(true);
    try {
      try {
        const admin = await verifyAdminCredentials(value, password);
        resetAdminAuthGate();
        await saveAdminSession(admin.email || value.toLowerCase());
        navigation.reset({
          index: 0,
          routes: [{name: 'AdminDashboard'}],
        });
        return;
      } catch {
        // Not an admin account — continue with devotee password login.
      }

      const payload = {
        identifier: value,
        email: isEmail ? value.toLowerCase() : undefined,
        password: password.trim(),
      };

      let response;
      try {
        response = await apiService.post('/auth/password-login', payload);
      } catch (firstError: any) {
        const status = firstError?.response?.status;
        const msg = String(firstError?.response?.data?.message || '');
        // Only fall back when the password-login route itself is missing on older APIs.
        const routeMissing =
          status === 404 &&
          !/account|password|email|mobile|otp/i.test(msg);
        if (routeMissing) {
          response = await apiService.post('/auth/login', payload);
        } else {
          throw firstError;
        }
      }
      const data = response.data?.data;
      if (!data?.token || !data?.user) {
        throw new Error('Login did not return a session');
      }
      await saveSession(data.token, data.user);
      // Re-hydrate profile from server after logout/uninstall so local session matches DB.
      try {
        const profileResponse = await apiService.get('/auth/profile');
        const profile = profileResponse.data?.data;
        if (profile) {
          await saveSession(data.token, {...data.user, ...profile});
        }
      } catch {
        // Token + user from login is enough if profile refresh fails.
      }
      resetAuthGate();
      navigation.reset({
        index: 0,
        routes: [{name: 'Home'}],
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const rawMessage = error?.response?.data?.message;
      let serverMessage = Array.isArray(rawMessage)
        ? rawMessage
            .map((item: any) => item?.msg || item)
            .filter(Boolean)
            .join('\n')
        : typeof rawMessage === 'string'
          ? rawMessage
          : '';
      if (/no admin account/i.test(serverMessage)) {
        serverMessage = 'No account found for this email or mobile number.';
      }
      Alert.alert(
        'Login failed',
        serverMessage ||
          (status === 404
            ? 'No account found for this email or mobile number.'
            : error?.message ||
              'Unable to login. Check your email/number and password.'),
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

  const handleSendLoginOtp = async () => {
    setSubmitting(true);
    try {
      if (otpChannel === 'email') {
        const email = otpEmail.trim().toLowerCase();
        if (!EMAIL_REGEX.test(email)) {
          Alert.alert(t('required'), 'Enter a valid email address.');
          return;
        }
        const response = await apiService.post('/auth/otp/send', {
          mode: 'login',
          channel: 'email',
          email,
        });
        const data = response.data?.data || {};
        navigation.navigate('OtpScreen', {
          mode: 'login',
          channel: 'email',
          email,
          sentTo: data.sentTo || email,
        });
      } else {
        const mobile = otpMobile.replace(/\D/g, '');
        if (mobile.length < 8) {
          Alert.alert(t('required'), 'Enter a valid mobile number.');
          return;
        }
        const response = await apiService.post('/auth/otp/send', {
          mode: 'login',
          channel: 'phone',
          mobileCountryCode: '91',
          mobileNumber: mobile,
        });
        const data = response.data?.data || {};
        navigation.navigate('OtpScreen', {
          mode: 'login',
          channel: 'phone',
          mobileCountryCode: '91',
          mobileNumber: mobile,
          phoneNumber: `91${mobile}`,
          sentTo: data.sentTo || `+91${mobile}`,
        });
      }
    } catch (error: any) {
      Alert.alert(
        t('otpFailed') || 'OTP Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to send OTP. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const Segment = ({
    options,
    value,
    onChange,
  }: {
    options: {id: string; label: string}[];
    value: string;
    onChange: (id: any) => void;
  }) => (
    <View style={styles.segmentRow}>
      {options.map(option => {
        const active = option.id === value;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
            onPress={() => onChange(option.id)}
            activeOpacity={0.85}>
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
              numberOfLines={1}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          {paddingHorizontal: BODY_PAD, paddingBottom: 30 + bottomPad},
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
            <Text style={styles.label}>Login with</Text>
            <Segment
              value={loginMethod}
              onChange={setLoginMethod}
              options={[
                {id: 'password', label: 'Password'},
                {id: 'otp', label: 'OTP'},
              ]}
            />

            {loginMethod === 'password' ? (
              <>
                <Text style={styles.label}>Email / Mobile number</Text>
                <TextInput
                  style={styles.emailInput}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="email@example.com or 9876543210"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  underlineColorAndroid="transparent"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.emailInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.placeholder}
                  secureTextEntry
                  underlineColorAndroid="transparent"
                />

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('ForgotPassword', {
                      identifier: identifier.trim(),
                    })
                  }>
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>

                <ContinueButton
                  title={submitting ? 'Logging in...' : 'Login'}
                  onPress={handlePasswordLogin}
                  loading={submitting}
                  disabled={submitting}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Send OTP to</Text>
                <Segment
                  value={otpChannel}
                  onChange={setOtpChannel}
                  options={[
                    {id: 'email', label: 'Email'},
                    {id: 'phone', label: 'Phone'},
                  ]}
                />

                {otpChannel === 'email' ? (
                  <>
                    <Text style={styles.label}>{t('email')}</Text>
                    <TextInput
                      style={styles.emailInput}
                      value={otpEmail}
                      onChangeText={setOtpEmail}
                      placeholder={t('enterEmailAddress')}
                      placeholderTextColor={Colors.placeholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      underlineColorAndroid="transparent"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>{t('mobileNumber')}</Text>
                    <View style={styles.phoneRow}>
                      <View style={styles.countryBox}>
                        <Text style={styles.countryText}>🇮🇳 +91</Text>
                      </View>
                      <TextInput
                        style={[styles.emailInput, styles.phoneInput]}
                        value={otpMobile}
                        onChangeText={text =>
                          setOtpMobile(text.replace(/\D/g, '').slice(0, 10))
                        }
                        placeholder="10-digit mobile"
                        placeholderTextColor={Colors.placeholder}
                        keyboardType="phone-pad"
                        maxLength={10}
                        underlineColorAndroid="transparent"
                      />
                    </View>
                  </>
                )}

                <ContinueButton
                  title={
                    submitting
                      ? t('sendingOtp') || 'SENDING OTP...'
                      : t('sendOtp') || 'SEND OTP'
                  }
                  onPress={handleSendLoginOtp}
                  loading={submitting}
                  disabled={submitting}
                />
              </>
            )}

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
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentBtnActive: {
    borderColor: Colors.templeGold,
    backgroundColor: '#FFF8EC',
  },
  segmentText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 14,
  },
  segmentTextActive: {
    color: Colors.templeGold,
    fontWeight: '800',
  },
  emailInput: {
    height: 55,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  countryBox: {
    height: 55,
    minWidth: 88,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countryText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
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
