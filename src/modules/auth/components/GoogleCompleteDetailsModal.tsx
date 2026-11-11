import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../../theme/colors';
import countries, {CountryItem} from '../../../constants/countries';
import {useLanguage} from '../../../i18n/LanguageContext';
import {formatDobDisplay, maskDob, parseDob} from '../../../utils/dobUtils';
import {
  isValidProfileMobile,
  resolveProfilePhone,
} from '../../../utils/profilePhone';
import DatePickerModal from '../../common/DatePickerModal';
import PrimaryButton from '../../common/PrimaryButton';
import MobileWithCountryField from './MobileWithCountryField';

const defaultIndia: CountryItem =
  countries.find(c => c.code === 'IN') || {
    name: 'India',
    code: 'IN',
    callingCode: '+91',
    flag: '🇮🇳',
  };

export type GoogleTitle = 'Mr' | 'Mrs' | '';

export type GoogleDetailsPayload = {
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  mobileCountryCode: string;
  mobileNumber: string;
};

/** True when Gmail signup/login still needs DOB, Mr/Mrs, or a real phone. */
export const googleAccountNeedsDetails = (user: any): boolean => {
  const dob = String(
    user?.dateOfBirth || user?.date_of_birth || user?.dob || '',
  ).slice(0, 10);
  const gender = String(user?.gender || '').trim();
  const phone = resolveProfilePhone(user);
  const hasDob = /^\d{4}-\d{2}-\d{2}$/.test(dob);
  const hasGender = gender === 'Male' || gender === 'Female';
  const hasPhone = isValidProfileMobile(phone.countryCode, phone.mobile);
  return !hasDob || !hasGender || !hasPhone;
};

export const googleDetailsPrefill = (user: any) => {
  const dob = String(
    user?.dateOfBirth || user?.date_of_birth || user?.dob || '',
  ).slice(0, 10);
  const gender = String(user?.gender || '').trim();
  const phone = resolveProfilePhone(user);
  const hasPhone = isValidProfileMobile(phone.countryCode, phone.mobile);
  return {
    dobIso: /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : '',
    dobText: /^\d{4}-\d{2}-\d{2}$/.test(dob) ? formatDobDisplay(dob) : '',
    title: (gender === 'Female'
      ? 'Mrs'
      : gender === 'Male'
        ? 'Mr'
        : '') as GoogleTitle,
    country: hasPhone ? phone.country : defaultIndia,
    mobile: hasPhone ? phone.mobile : '',
  };
};

type Props = {
  visible: boolean;
  saving?: boolean;
  initialUser?: any;
  onSubmit: (payload: GoogleDetailsPayload) => void;
  /** Optional validation error shown above the button. */
  errorText?: string;
};

const GoogleCompleteDetailsModal = ({
  visible,
  saving = false,
  initialUser,
  onSubmit,
  errorText,
}: Props) => {
  const {t} = useLanguage();
  const [dobText, setDobText] = useState('');
  const [dobIso, setDobIso] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [title, setTitle] = useState<GoogleTitle>('');
  const [country, setCountry] = useState<CountryItem>(defaultIndia);
  const [mobile, setMobile] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const prefill = googleDetailsPrefill(initialUser);
    setDobIso(prefill.dobIso);
    setDobText(prefill.dobText);
    setTitle(prefill.title);
    setCountry(prefill.country);
    setMobile(prefill.mobile);
    setLocalError('');
  }, [visible, initialUser]);

  const handleContinue = () => {
    const parsed = parseDob(dobText) || dobIso;
    if (!parsed) {
      setLocalError(t('enterDateOfBirth') || 'Please enter Date of Birth');
      return;
    }
    if (!title) {
      setLocalError(t('selectMrOrMrs') || 'Please select Mr or Mrs');
      return;
    }
    const code =
      country.callingCode.replace(/\D/g, '') ||
      String(country.code === 'IN' ? '91' : '') ||
      '91';
    const number = String(mobile || '').replace(/\D/g, '');
    if (!isValidProfileMobile(code, number)) {
      setLocalError(
        code === '91'
          ? t('enterValidIndianMobile') ||
              'Enter a valid 10-digit Indian mobile number'
          : t('enterValidMobileNumber') || 'Enter a valid mobile number',
      );
      return;
    }
    setLocalError('');
    onSubmit({
      dateOfBirth: parsed,
      gender: title === 'Mrs' ? 'Female' : 'Male',
      mobileCountryCode: code,
      mobileNumber: number,
    });
  };

  const message = errorText || localError;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              {t('completeDetailsTitle') || 'Complete Details'}
            </Text>
            <Text style={styles.subtitle}>
              {t('completeDetailsSubtitle') ||
                'Please provide your phone number, Date of Birth, and Mr or Mrs to continue.'}
            </Text>

            <MobileWithCountryField
              label={`${t('mobileNumber') || 'Mobile Number'} *`}
              country={country}
              mobile={mobile}
              onCountryChange={item => {
                setCountry(item);
                setMobile('');
              }}
              onMobileChange={setMobile}
            />

            <Text style={styles.label}>
              {t('dateOfBirth') || 'Date of Birth'} *
            </Text>
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
                const picked = parseDob(dobText) || dobIso;
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

            <Text style={styles.label}>{t('mrOrMrs') || 'Mr or Mrs'} *</Text>
            <View style={styles.titleRow}>
              <TouchableOpacity
                style={[styles.titleBtn, title === 'Mr' && styles.titleBtnActive]}
                onPress={() => setTitle('Mr')}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.titleBtnText,
                    title === 'Mr' && styles.titleBtnTextActive,
                  ]}>
                  Mr
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.titleBtn,
                  title === 'Mrs' && styles.titleBtnActive,
                ]}
                onPress={() => setTitle('Mrs')}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.titleBtnText,
                    title === 'Mrs' && styles.titleBtnTextActive,
                  ]}>
                  Mrs
                </Text>
              </TouchableOpacity>
            </View>

            {message ? <Text style={styles.error}>{message}</Text> : null}

            <View style={styles.actions}>
              {saving ? (
                <ActivityIndicator color={Colors.templeGold} size="large" />
              ) : (
                <PrimaryButton
                  title={t('continueToHome') || 'CONTINUE TO HOME'}
                  onPress={handleContinue}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default GoogleCompleteDetailsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
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
  },
  dobRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  dobInput: {
    flex: 1,
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
    marginBottom: 8,
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
  error: {
    color: Colors.error,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  actions: {
    marginTop: 12,
    marginBottom: 4,
  },
});
