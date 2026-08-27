import React, {useState} from 'react';
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
import countries, {CountryItem} from '../../constants/countries';
import CountryPickerField from './components/CountryPickerField';
import PhoneNumberField from './components/PhoneNumberField';
import ContinueButton from './components/ContinueButton';
import AppHeader from '../common/AppHeader';
import apiService from '../../services/apiService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(
    countries.find(c => c.code === 'IN') ?? countries[0],
  );

  const handleContinue = async () => {
    const mobileNumber = phoneNumber.replace(/\D/g, '');
    const mobileCountryCode = selectedCountry.callingCode.replace(/\D/g, '');
    const trimmedEmail = email.trim().toLowerCase();

    if (mobileNumber.length < 6) {
      Alert.alert('Required', 'Please enter a valid mobile number.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert('Required', 'Enter a valid email. The 4-digit OTP is sent there.');
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
        'OTP Failed',
        error?.response?.data?.message ||
          (timedOut
            ? 'The server is waking up. Wait 10 seconds and tap SEND OTP again.'
            : 'Unable to send OTP.'),
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
        <Text style={styles.heading}>Begin your spiritual journey</Text>

        <Text style={styles.label}>Mobile Number</Text>
        <CountryPickerField
          value={selectedCountry}
          onChange={setSelectedCountry}
        />
        <PhoneNumberField
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Enter mobile number"
        />
        <Text style={styles.helper}>We will send a 4-digit OTP to your email.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.emailInput}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email address"
          placeholderTextColor={Colors.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <ContinueButton
          title={submitting ? 'SENDING OTP...' : 'SEND OTP'}
          onPress={handleContinue}
          disabled={
            phoneNumber.replace(/\D/g, '').length < 6 ||
            !EMAIL_REGEX.test(email.trim()) ||
            submitting
          }
        />

        <Text style={styles.or}>OR CONTINUE WITH</Text>
        {['Google', 'Facebook', 'Email'].map(item => (
          <TouchableOpacity
            key={item}
            style={styles.social}
            onPress={() => socialSoon(item)}>
            <Text style={styles.socialText}>{item}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Japa Siddhi?</Text>
          <TouchableOpacity onPress={handleContinue}>
            <Text style={styles.linkText}>Create an account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.privacy}>Terms & Privacy Policy</Text>
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
