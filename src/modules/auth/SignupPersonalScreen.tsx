import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import {dismissKeyboardThen} from '../../utils/keyboard';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import DatePickerModal from '../common/DatePickerModal';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';
import CountrySelector from './components/CountrySelector';
import countries, {CountryItem} from '../../constants/countries';

const defaultIndia: CountryItem =
  countries.find(c => c.code === 'IN') || {
    name: 'India',
    code: 'IN',
    callingCode: '+91',
    flag: '🇮🇳',
  };

/** Matches typed DOB mask (slashes). Always show format in the field. */
const DATE_PLACEHOLDER = 'DD/MM/YYYY';

/** The next steps expect DD/MM/YYYY, so the picker writes that shape back. */
const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const isValidDdMmYyyy = (value: string) => {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) {
    return false;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
    return false;
  }
  const parsed = new Date(year, month - 1, day);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

/** Keep typing friendly: digits + auto / separators → DD/MM/YYYY */
const maskDdMmYyyy = (raw: string) => {
  const digits = String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const parseDate = (value: string, fallbackYear: number) => {
  const parts = String(value || '').split(/[/-]/).map(part => Number(part.trim()));
  const [day, month, year] = parts;
  if (day > 0 && month > 0 && year > 1000) {
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date(fallbackYear, 0, 1);
};

type DateField = 'dob' | 'spouseDob' | 'anniversary';

const SignupPersonalScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  // Option values stay in English for the API; only the labels are translated.
  const optionLabel = (value: string) =>
    (
      {
        Male: t('male'),
        Female: t('female'),
        Other: t('otherGender'),
        Bachelor: t('bachelor'),
        Married: t('married'),
      } as Record<string, string>
    )[value] || value;
  const [fullName, setFullName] = useState(route.params?.fullName || '');
  const [email, setEmail] = useState(route.params?.email || '');
  const initialCountryCode =
    String(route.params?.mobileCountryCode || '91').replace(/\D/g, '') || '91';
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(() => {
    const matched = countries.find(
      c => c.callingCode.replace(/\D/g, '') === initialCountryCode,
    );
    return matched || defaultIndia;
  });
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [mobileNumber, setMobileNumber] = useState(() => {
    const raw = String(route.params?.mobileNumber || '').replace(/\D/g, '');
    return raw === '0000000000' ? '' : raw;
  });
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('India');
  const [maritalStatus, setMaritalStatus] = useState('Bachelor');
  const [spouseName, setSpouseName] = useState('');
  const [spouseDob, setSpouseDob] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [picker, setPicker] = useState<DateField | null>(null);

  const dateValues: Record<DateField, string> = {
    dob,
    spouseDob,
    anniversary,
  };

  const setDateValue = (field: DateField, value: string) => {
    if (field === 'dob') {
      setDob(value);
      return;
    }
    if (field === 'spouseDob') {
      setSpouseDob(value);
      return;
    }
    setAnniversary(value);
  };

  const renderDateField = (field: DateField, label: string) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.input, styles.dateField]}>
        <TextInput
          style={styles.dateInput}
          value={dateValues[field]}
          onChangeText={text => setDateValue(field, maskDdMmYyyy(text))}
          placeholder={DATE_PLACEHOLDER}
          placeholderTextColor={Colors.placeholder}
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.dateIconBtn}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          onPress={() => dismissKeyboardThen(() => setPicker(field))}
          accessibilityLabel={t('selectDate')}>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const next = () => {
    if (fullName.trim().length < 3) {
      Alert.alert(t('required'), t('enterFullName'));
      return;
    }
    const code =
      selectedCountry.callingCode.replace(/\D/g, '') ||
      countryCode.replace(/\D/g, '') ||
      '91';
    const mobile = mobileNumber.replace(/\D/g, '');
    if (code === '91') {
      if (!isMobile(mobile) || /^0+$/.test(mobile)) {
        Alert.alert(
          t('required'),
          t('enterMobileDigits', {digits: MOBILE_DIGITS}),
        );
        return;
      }
    } else {
      if (mobile.length < 6 || mobile.length > 15 || /^0+$/.test(mobile)) {
        Alert.alert(t('required'), t('enterValidMobileNumber'));
        return;
      }
    }
    if (!dob.trim()) {
      Alert.alert(t('required'), t('enterDateOfBirth'));
      return;
    }
    if (!isValidDdMmYyyy(dob)) {
      Alert.alert(t('required'), t('enterDateOfBirth'));
      return;
    }
    if (maritalStatus === 'Married' && spouseName.trim().length < 2) {
      Alert.alert(t('required'), t('enterSpouseNameMarried'));
      return;
    }
    if (maritalStatus === 'Married' && spouseDob.trim() && !isValidDdMmYyyy(spouseDob)) {
      Alert.alert(t('required'), `${t('spouseDateOfBirth')}: ${DATE_PLACEHOLDER}`);
      return;
    }
    if (
      maritalStatus === 'Married' &&
      anniversary.trim() &&
      !isValidDdMmYyyy(anniversary)
    ) {
      Alert.alert(t('required'), `${t('anniversaryDate')}: ${DATE_PLACEHOLDER}`);
      return;
    }
    navigation.navigate('SignupSpiritual', {
      ...route.params,
      fullName: fullName.trim(),
      email: email.trim(),
      password: route.params?.password,
      mobileCountryCode: code,
      mobileNumber: mobile,
      phoneNumber: `${code}${mobile}`,
      gender,
      dob,
      address,
      city,
      stateName,
      country,
      maritalStatus,
      spouseName,
      spouseDob,
      anniversary,
    });
  };

  return (
    <ScreenLayout title={t('createYourProfile')} showBack>
      <Text style={styles.step}>{t('stepOf', {current: 1, total: 3})}</Text>
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
      <Text style={styles.percent}>33%</Text>
      <Text style={styles.label}>{t('fullName')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('yourName')}
        value={fullName}
        onChangeText={setFullName}
        placeholderTextColor={Colors.placeholder}
      />
      <Text style={styles.label}>{t('mobileNumber')} *</Text>
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
              ? t('mobileDigitsPlaceholder', {digits: MOBILE_DIGITS})
              : t('enterMobileNumber')
          }
          placeholderTextColor={Colors.placeholder}
          maxLength={selectedCountry.code === 'IN' ? MOBILE_DIGITS : 15}
        />
      </View>
      {selectedCountry.code === 'IN' &&
      mobileNumber.length > 0 &&
      !isMobile(mobileNumber) ? (
        <Text style={styles.fieldError}>
          {t('mobileMustBeDigits', {
            digits: MOBILE_DIGITS,
            entered: mobileNumber.length,
          })}
        </Text>
      ) : null}

      <CountrySelector
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={item => {
          setSelectedCountry(item);
          setCountryCode(item.callingCode.replace(/\D/g, ''));
        }}
      />
      <Text style={styles.label}>{t('email')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={Colors.placeholder}
      />
      {renderDateField('dob', `${t('dateOfBirth')} *`)}
      <Text style={styles.label}>{t('gender')}</Text>
      <View style={styles.chips}>
        {['Male', 'Female', 'Other'].map(item => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, gender === item && styles.chipOn]}
            onPress={() => setGender(item)}>
            <Text style={styles.chipText}>{optionLabel(item)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>{t('address')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('address')}
        value={address}
        onChangeText={setAddress}
        placeholderTextColor={Colors.placeholder}
      />
      <Text style={styles.addressNote}>* {t('addressDetailedHint')}</Text>
      <Text style={styles.label}>{t('city')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('city')}
        value={city}
        onChangeText={setCity}
        placeholderTextColor={Colors.placeholder}
      />
      <Text style={styles.label}>{t('state')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('state')}
        value={stateName}
        onChangeText={setStateName}
        placeholderTextColor={Colors.placeholder}
      />
      <Text style={styles.label}>{t('country')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('country')}
        value={country}
        onChangeText={setCountry}
        placeholderTextColor={Colors.placeholder}
      />
      <Text style={styles.label}>{t('maritalStatus')}</Text>
      <View style={styles.chips}>
        {['Bachelor', 'Married'].map(item => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, maritalStatus === item && styles.chipOn]}
            onPress={() => setMaritalStatus(item)}>
            <Text style={styles.chipText}>{optionLabel(item)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {maritalStatus === 'Married' ? (
        <>
          <Text style={styles.label}>{t('spouseName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('spouseName')}
            value={spouseName}
            onChangeText={setSpouseName}
            placeholderTextColor={Colors.placeholder}
          />
          {renderDateField('spouseDob', t('spouseDateOfBirth'))}
          {renderDateField('anniversary', t('anniversaryDate'))}
        </>
      ) : null}
      {picker ? (
        <DatePickerModal
          visible
          value={parseDate(dateValues[picker], picker === 'dob' ? 1995 : 2015)}
          maximumDate={new Date()}
          onCancel={() => setPicker(null)}
          onConfirm={selectedDate => {
            setDateValue(picker, formatDate(selectedDate));
            setPicker(null);
          }}
        />
      ) : null}
      <View style={styles.actions}>
        <PrimaryButton title={t('continue')} onPress={next} />
      </View>
    </ScreenLayout>
  );
};

export default SignupPersonalScreen;

const styles = StyleSheet.create({
  step: {color: Colors.leafGreen, fontWeight: '700', marginBottom: 8},
  track: {
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  fill: {width: '33%', height: 10, backgroundColor: Colors.templeGold},
  percent: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.sacredBrown,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingRight: 8,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.sacredBrown,
    paddingVertical: 14,
    paddingRight: 8,
  },
  dateIconBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateIcon: {fontSize: 18},
  fieldError: {
    color: Colors.error,
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 10,
  },
  mobileRow: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  countryBtn: {
    height: 55,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  chipOn: {
    borderColor: Colors.templeGold,
    borderWidth: 2,
    backgroundColor: Colors.lightGold,
  },
  chipText: {color: Colors.sacredBrown, fontWeight: '700'},
  actions: {
    marginTop: 28,
    marginBottom: 24,
  },
  addressNote: {
    color: '#D32F2F',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 10,
    lineHeight: 18,
    includeFontPadding: true,
  },
});
