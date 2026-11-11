import React, {useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import {dismissKeyboardThen} from '../../utils/keyboard';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import DatePickerModal from '../common/DatePickerModal';
import apiService from '../../services/apiService';
import {clearSession, saveSession, getValidSession} from '../../services/session';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';
import CountrySelector from './components/CountrySelector';
import countries, {CountryItem} from '../../constants/countries';
import {signInWithGoogle, explainGoogleSignInError} from './services/googleAuthService';
import {resetAuthGate} from '../common/AuthGate';
import {resetToHomeAfterAuth} from '../../navigation/goHomeAfterAuth';
import ProfileApi from './services/profileApi';
import AuthLoadingOverlay, {
  waitForLoadingPaint,
} from './components/AuthLoadingOverlay';
import GoogleCompleteDetailsModal, {
  googleAccountNeedsDetails,
  GoogleDetailsPayload,
} from './components/GoogleCompleteDetailsModal';

const defaultIndia: CountryItem =
  countries.find(c => c.code === 'IN') || {
    name: 'India',
    code: 'IN',
    callingCode: '+91',
    flag: '🇮🇳',
  };

const formatDobDisplay = (iso: string) => {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};

const parseDob = (raw: string): string | null => {
  const text = String(raw || '').trim();
  const dmy = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const day = Number(dmy?.[1] || iso?.[3] || 0);
  const month = Number(dmy?.[2] || iso?.[2] || 0);
  const year = Number(dmy?.[3] || iso?.[1] || 0);
  if (!dmy && !iso) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > new Date()
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const maskDob = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

const CreateAccountScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Mobile signup fields
  const [selectedCountry, setSelectedCountry] =
    useState<CountryItem>(defaultIndia);
  const [countryCode, setCountryCode] = useState('91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [dobText, setDobText] = useState('');
  const [dobIso, setDobIso] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [title, setTitle] = useState<'Mr' | 'Mrs' | ''>('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Google signup post-step (phone + DOB + Mr/Mrs)
  const [showGoogleDetailsModal, setShowGoogleDetailsModal] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleSaving, setGoogleSaving] = useState(false);

  const handleGoogleSignup = async () => {
    if (googleBusy || submitting) {
      return;
    }
    setGoogleBusy(true);
    await waitForLoadingPaint();
    try {
      const signedIn = await signInWithGoogle();
      const user = signedIn.user || {};

      // Returning Google users with phone + DOB + title go straight Home.
      if (!googleAccountNeedsDetails(user)) {
        resetAuthGate();
        await resetToHomeAfterAuth(navigation);
        return;
      }

      setGoogleUser(user);
      setShowGoogleDetailsModal(true);
    } catch (error: any) {
      const message = explainGoogleSignInError(error);
      if (String(error?.message || '').includes('CANCELLED')) {
        return;
      }
      Alert.alert(t('googleSignInTitle') || 'Google Sign-In', message);
    } finally {
      setGoogleBusy(false);
    }
  };

  const submitGoogleDetails = async (payload: GoogleDetailsPayload) => {
    setGoogleSaving(true);
    try {
      const updated = await ProfileApi.updateProfile({
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        mobileCountryCode: payload.mobileCountryCode,
        mobileNumber: payload.mobileNumber,
      });
      const session = await getValidSession();
      if (session.token) {
        await saveSession(session.token, {
          ...(session.user || {}),
          ...(updated || {}),
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender,
          mobileCountryCode: payload.mobileCountryCode,
          mobileNumber: payload.mobileNumber,
        });
      }
      setShowGoogleDetailsModal(false);
      resetAuthGate();
      await resetToHomeAfterAuth(navigation);
    } catch (error: any) {
      Alert.alert(
        t('updateFailedTitle') || 'Error',
        error?.response?.data?.message || 'Could not save details',
      );
    } finally {
      setGoogleSaving(false);
    }
  };

  const submitMobileSignup = async () => {
    const code =
      selectedCountry.callingCode.replace(/\D/g, '') ||
      countryCode.replace(/\D/g, '') ||
      '91';
    const mobile = mobileNumber.replace(/\D/g, '');
    const trimmedName = fullName.trim();
    const parsedDob = parseDob(dobText) || dobIso;

    // Validate 4 mandatory fields:
    if (code === '91') {
      if (!isMobile(mobile) || /^0+$/.test(mobile)) {
        Alert.alert(
          t('required') || 'Required',
          t('enterMobileDigits', {digits: MOBILE_DIGITS}) || `Enter ${MOBILE_DIGITS}-digit mobile number`,
        );
        return;
      }
    } else {
      if (mobile.length < 6 || mobile.length > 15 || /^0+$/.test(mobile)) {
        Alert.alert(t('required') || 'Required', t('enterValidMobileNumber') || 'Enter a valid mobile number');
        return;
      }
    }

    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert(
        t('required') || 'Required',
        (t as any)('enterFullName') || 'Please enter your name',
      );
      return;
    }

    if (!parsedDob) {
      Alert.alert(
        t('required') || 'Required',
        t('enterDateOfBirth') || 'Please enter Date of Birth (DD-MM-YYYY)',
      );
      return;
    }

    if (!title) {
      Alert.alert(
        t('required') || 'Required',
        'Please select Mr or Mrs',
      );
      return;
    }

    setSubmitting(true);
    await waitForLoadingPaint();
    try {
      await clearSession().catch(() => undefined);
      const response = await apiService.post('/auth/otp/send', {
        mobileCountryCode: code,
        mobileNumber: mobile,
        mode: 'register',
        channel: 'phone',
      });
      const data = response.data?.data || {};
      if (data.phoneOtpAvailable === false) {
        Alert.alert(
          t('phoneOtpComingSoonTitle') || 'Notice',
          data.message || t('phoneOtpComingSoon') || 'Phone OTP unavailable',
        );
        return;
      }

      let phoneE164 = `+${code}${mobile}`;
      let verificationId = '';
      const {default: firebaseAuthService} = await import(
        './services/firebaseAuthService'
      );
      const fb = await firebaseAuthService.sendOTP(phoneE164, {
        countryCode: code,
      });
      if (!fb.success || !fb.verificationId) {
        throw new Error(fb.message || t('unableSendOtpRetry'));
      }
      phoneE164 = fb.e164 || phoneE164;
      verificationId = fb.verificationId;

      navigation.navigate('OtpScreen', {
        mode: 'register',
        channel: 'phone',
        phoneNumber: phoneE164,
        mobileCountryCode: code,
        mobileNumber: mobile,
        fullName: trimmedName,
        dateOfBirth: parsedDob,
        gender: title === 'Mrs' ? 'Female' : 'Male',
        title,
        verificationId,
        sentTo: phoneE164,
      });
    } catch (error: any) {
      const phoneMessage =
        error?.response?.data?.message ||
        error?.message ||
        t('unableSendOtpRetry');
      Alert.alert(
        t('createAccountAlertTitle') || 'Account Notice',
        phoneMessage,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout title={t('createAccountTitle') || 'Create Account'} showBack>
      <AuthLoadingOverlay
        visible={googleBusy || submitting}
        title={
          googleBusy
            ? t('loggingIn') || 'Signing in...'
            : t('sendingOtp') || 'Sending OTP...'
        }
        subtitle={
          googleBusy
            ? 'Connecting your Google account'
            : 'Sending SMS code to your phone'
        }
      />
      <Text style={styles.heading}>{t('createYourAccount') || 'Create your account'}</Text>
      <Text style={styles.helper}>
        Sign up with Google or enter your mobile number to get started.
      </Text>

      {/* 1. Sign up with Google */}
      <TouchableOpacity
        style={styles.googleBtn}
        onPress={handleGoogleSignup}
        disabled={googleBusy || submitting}
        activeOpacity={0.85}>
        <View style={styles.googleBtnContent}>
          <Text style={styles.googleLogo}>G</Text>
          <Text style={styles.googleBtnText}>
            {t('continueWithGoogleBtn') || 'Sign up with Google'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 2. OR divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('or') || 'or'}</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* 3. Sign up with mobile number heading */}
      <Text style={styles.sectionTitle}>
        {t('signUpWithMobile')}
      </Text>

      {/* Mobile Number * */}
      <Text style={styles.label}>{t('mobileNumber') || 'Mobile Number'} *</Text>
      <View style={styles.mobileRow}>
        <TouchableOpacity
          style={styles.countryBtn}
          activeOpacity={0.7}
          onPress={() =>
            dismissKeyboardThen(() => setShowCountryPicker(true))
          }>
          <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
          <Text style={styles.countryCallingCode}>
            {selectedCountry.callingCode}
          </Text>
          <Text style={styles.countryChevron}>▾</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, styles.mobileInput]}
          value={mobileNumber}
          onChangeText={text =>
            setMobileNumber(
              digitsOnly(text).slice(
                0,
                selectedCountry.code === 'IN' ? MOBILE_DIGITS : 15,
              ),
            )
          }
          keyboardType="phone-pad"
          placeholder={
            selectedCountry.code === 'IN'
              ? t('mobileDigitsPlaceholder', {digits: MOBILE_DIGITS}) || '10-digit mobile number'
              : t('enterMobileNumber') || 'Mobile number'
          }
          placeholderTextColor={Colors.placeholder}
          maxLength={selectedCountry.code === 'IN' ? MOBILE_DIGITS : 15}
          underlineColorAndroid="transparent"
        />
      </View>
      {selectedCountry.code === 'IN' &&
      mobileNumber.length > 0 &&
      !isMobile(mobileNumber) ? (
        <Text style={styles.fieldError}>
          {t('mobileMustBeDigits', {
            digits: MOBILE_DIGITS,
            entered: mobileNumber.length,
          }) || `Mobile must be ${MOBILE_DIGITS} digits`}
        </Text>
      ) : null}

      {/* Name * */}
      <Text style={styles.label}>{t('fullName') || 'Name'} *</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder={t('enterFullName') || 'Enter your name'}
        placeholderTextColor={Colors.placeholder}
        autoCapitalize="words"
      />

      {/* Date of Birth * */}
      <Text style={styles.label}>{t('dateOfBirth') || 'Date of Birth'} *</Text>
      <View style={styles.dobRow}>
        <TextInput
          style={[styles.input, styles.dobInput]}
          value={dobText}
          onChangeText={value => {
            const masked = maskDob(value);
            setDobText(masked);
            const parsed = parseDob(masked);
            if (parsed) {
              setDobIso(parsed);
            }
          }}
          placeholder={t('dobFormatPlaceholder') || 'DD-MM-YYYY'}
          placeholderTextColor={Colors.placeholder}
          keyboardType="number-pad"
          maxLength={10}
        />
        <TouchableOpacity
          style={styles.dobButton}
          onPress={() => setShowDobPicker(true)}>
          <Text style={styles.dobButtonText}>📅</Text>
        </TouchableOpacity>
      </View>
      <DatePickerModal
        visible={showDobPicker}
        value={(() => {
          const picked = parseDob(dobText);
          return picked
            ? new Date(
                Number(picked.slice(0, 4)),
                Number(picked.slice(5, 7)) - 1,
                Number(picked.slice(8, 10)),
              )
            : new Date(1995, 0, 1);
        })()}
        maximumDate={new Date()}
        onCancel={() => setShowDobPicker(false)}
        onConfirm={selected => {
          const month = String(selected.getMonth() + 1).padStart(2, '0');
          const day = String(selected.getDate()).padStart(2, '0');
          const iso = `${selected.getFullYear()}-${month}-${day}`;
          setDobIso(iso);
          setDobText(formatDobDisplay(iso));
          setShowDobPicker(false);
        }}
      />

      {/* Mr or Mrs * */}
      <Text style={styles.label}>Mr or Mrs *</Text>
      <View style={styles.titleRow}>
        <TouchableOpacity
          style={[styles.titleBtn, title === 'Mr' && styles.titleBtnActive]}
          onPress={() => setTitle('Mr')}
          activeOpacity={0.85}>
          <Text style={[styles.titleBtnText, title === 'Mr' && styles.titleBtnTextActive]}>
            Mr
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.titleBtn, title === 'Mrs' && styles.titleBtnActive]}
          onPress={() => setTitle('Mrs')}
          activeOpacity={0.85}>
          <Text style={[styles.titleBtnText, title === 'Mrs' && styles.titleBtnTextActive]}>
            Mrs
          </Text>
        </TouchableOpacity>
      </View>

      <CountrySelector
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={item => {
          setSelectedCountry(item);
          setCountryCode(item.callingCode.replace(/\D/g, ''));
        }}
      />

      <View style={styles.actions}>
        <PrimaryButton
          title={submitting ? t('sendingOtp') || 'Sending OTP...' : t('sendOtp') || 'SEND OTP'}
          onPress={submitMobileSignup}
          disabled={submitting || googleBusy}
        />

        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
          disabled={submitting || googleBusy}>
          <Text style={styles.signInText}>{t('signInLink') || 'Already have an account? Sign in'}</Text>
        </TouchableOpacity>
      </View>

      <GoogleCompleteDetailsModal
        visible={showGoogleDetailsModal}
        saving={googleSaving}
        initialUser={googleUser}
        onSubmit={submitGoogleDetails}
      />
    </ScreenLayout>
  );
};

export default CreateAccountScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  helper: {
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
    fontSize: 14,
  },
  googleBtn: {
    backgroundColor: Colors.templeGold,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: Colors.templeGold,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleLogo: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    width: 26,
    height: 26,
    textAlign: 'center',
    lineHeight: 26,
  },
  googleBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
  dividerText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  fieldError: {
    color: Colors.error,
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 8,
  },
  mobileRow: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  countryBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    flexShrink: 0,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCallingCode: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  countryChevron: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  mobileInput: {flex: 1},
  dobRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  dobInput: {
    flex: 1,
    marginBottom: 0,
  },
  dobButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobButtonText: {
    fontSize: 22,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  titleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBtnActive: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  titleBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  titleBtnTextActive: {
    color: Colors.white,
  },
  actions: {marginTop: 10, marginBottom: 24},
  signInBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  signInText: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 15,
  },
});
