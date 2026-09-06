import React, {useEffect, useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import countries, {CountryItem} from '../../constants/countries';
import CountryPickerField from './components/CountryPickerField';
import PhoneNumberField from './components/PhoneNumberField';
import ContinueButton from './components/ContinueButton';
import AppHeader from '../common/AppHeader';
import apiService from '../../services/apiService';
import {hydrateSession, saveSession} from '../../services/session';
import PrimaryButton from '../common/PrimaryButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(
    countries.find(c => c.code === 'IN') ?? countries[0],
  );
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    hydrateSession().then(session => {
      setHasSession(Boolean(session.token));
    });
  }, []);

  const handleContinue = async () => {
    const mobileNumber = phoneNumber.replace(/\D/g, '');
    const mobileCountryCode = selectedCountry.callingCode.replace(/\D/g, '');
    const trimmedEmail = email.trim().toLowerCase();

    if (mobileNumber.length < 6) {
      Alert.alert(t('required'), t('validMobile'));
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert(t('required'), t('validEmailOtp'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiService.post('/auth/otp/send', {
        mobileCountryCode,
        mobileNumber,
        email: trimmedEmail,
      });

      navigation.navigate('OtpScreen', {
        phoneNumber: `${mobileCountryCode}${mobileNumber}`,
        mobileCountryCode,
        mobileNumber,
        email: trimmedEmail,
        sentTo: response.data?.data?.sentTo,
      });
    } catch (error: any) {
      const timedOut =
        error?.code === 'ECONNABORTED' ||
        String(error?.message || '').toLowerCase().includes('timeout');
      Alert.alert(
        t('otpFailed'),
        error?.response?.data?.message ||
          (timedOut ? t('serverWaking') : t('unableSendOtp')),
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
      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert(
        'Test login failed',
        error?.response?.data?.message || error?.message || 'Unable to sign in.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const socialSoon = (name: string) => {
    navigation.navigate('SocialAuth', {provider: name});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <AppHeader title="Welcome to Japa Siddhi" showBack />
        <Text style={styles.heading}>{t('beginSpiritualJourney')}</Text>
        {hasSession ? (
          <>
            <PrimaryButton
              title={t('continueToHome')}
              onPress={() => navigation.replace('Home')}
            />
            <Text style={styles.or}>{t('orLoginAgain')}</Text>
          </>
        ) : null}

        <Text style={styles.label}>{t('mobileNumber')}</Text>
        <CountryPickerField
          value={selectedCountry}
          onChange={setSelectedCountry}
        />
        <PhoneNumberField
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder={t('enterMobileNumber')}
        />
        <Text style={styles.helper}>{t('otpEmailHelper')}</Text>

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

        <ContinueButton
          title={submitting ? t('sendingOtp') : t('sendOtp')}
          onPress={handleContinue}
          disabled={
            phoneNumber.replace(/\D/g, '').length < 6 ||
            !EMAIL_REGEX.test(email.trim()) ||
            submitting
          }
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

        {__DEV__ ? (
          <>
            <Text style={styles.or}>{t('orContinueWith')}</Text>
            {['Google', 'Facebook', 'Email'].map(item => (
              <TouchableOpacity
                key={item}
                style={styles.social}
                onPress={() => socialSoon(item)}>
                <Text style={styles.socialText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('newToJapaSiddhi')}</Text>
          <TouchableOpacity onPress={handleContinue}>
            <Text style={styles.linkText}>{t('createAnAccount')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.privacy}>{t('termsPrivacy')}</Text>
          </TouchableOpacity>
        </View>
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
    marginTop: -8,
    marginBottom: 16,
    fontSize: 13,
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
