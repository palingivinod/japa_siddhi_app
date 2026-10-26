import React, {useCallback, useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import {istIsoDate} from '../../utils/dateUtils';
import {dismissKeyboardThen} from '../../utils/keyboard';
import {useBottomNavPad} from '../../utils/safeArea';

import AppHeader from '../common/AppHeader';
import DatePickerModal from '../common/DatePickerModal';
import SelectField from '../common/SelectField';
import CountryPickerField from './components/CountryPickerField';
import CountrySelector from './components/CountrySelector';
import StateSelector from './components/StateSelector';
import CitySelector from './components/CitySelector';
import LanguageSelector from './components/LanguageSelector';
import ContinueButton from './components/ContinueButton';

import countries, {CountryItem} from '../../constants/countries';
import {DEFAULT_LANGUAGE, Language} from '../../constants/languages';
import ProfileApi, {CompleteProfileRequest} from './services/profileApi';
import {hydrateSession, saveSession} from '../../services/session';
import {pickProfilePhoto, type PickedPhoto} from '../../services/profilePhoto';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';
import {resetToHomeAfterAuth} from '../../navigation/goHomeAfterAuth';

const defaultIndia: CountryItem =
  countries.find(c => c.code === 'IN') || {
    name: 'India',
    code: 'IN',
    callingCode: '+91',
    flag: '🇮🇳',
  };

interface StateModel {
  id: number;
  name: string;
}

interface CityModel {
  id: number;
  name: string;
}


const CompleteProfileScreen = ({
  navigation,
  route,
}: any) => {
  const {t} = useLanguage();
  const bottomPad = useBottomNavPad();
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );
  const registeredEmail = route?.params?.email ?? '';
  const initialPhone = String(route?.params?.phoneNumber || '').replace(/\D/g, '');
  const initialCode =
    String(route?.params?.mobileCountryCode || '').replace(/\D/g, '') ||
    (initialPhone.length > 10 ? initialPhone.slice(0, initialPhone.length - 10) : '91') ||
    '91';
  const initialMobileRaw =
    String(route?.params?.mobileNumber || '').replace(/\D/g, '') ||
    (initialPhone.length >= 10 ? initialPhone.slice(-10) : '');

  const [loading, setLoading] = useState(false);
  const [selectedMobileCountry, setSelectedMobileCountry] =
    useState<CountryItem>(() => {
      const matched = countries.find(
        c => c.callingCode.replace(/\D/g, '') === initialCode,
      );
      return matched || defaultIndia;
    });
  const [countryCode, setCountryCode] = useState(initialCode);
  const [showMobileCountryPicker, setShowMobileCountryPicker] = useState(false);
  const [mobileNumber, setMobileNumber] = useState(
    initialMobileRaw === '0000000000' ? '' : initialMobileRaw,
  );

  const [profileImage, setProfileImage] =
    useState<string | null>(null);
  const [pickedPhoto, setPickedPhoto] = useState<PickedPhoto | null>(null);

  const [fullName, setFullName] = useState(route?.params?.fullName || '');

  const [email, setEmail] = useState(registeredEmail);

  const [gender, setGender] = useState('');

  const [dob, setDob] = useState(new Date());
  const [dobSelected, setDobSelected] = useState(false);

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [country, setCountry] =
    useState<CountryItem | null>(() => defaultIndia);

  const [pinCode, setPinCode] = useState('');
  const [region, setRegion] = useState('');
  const [stateModel, setStateModel] =
    useState<StateModel | null>(null);

  const [cityModel, setCityModel] =
    useState<CityModel | null>(null);

  const [language, setLanguage] =
    useState<Language | null>(DEFAULT_LANGUAGE);

  const [address, setAddress] = useState('');
  const [maritalStatus, setMaritalStatus] =
    useState<'Bachelor' | 'Married'>('Bachelor');
  const [spouseName, setSpouseName] = useState('');
  const [spouseDob, setSpouseDob] = useState(new Date());
  const [anniversaryDate, setAnniversaryDate] = useState(new Date());
  const [showSpouseDobPicker, setShowSpouseDobPicker] = useState(false);
  const [showAnniversaryPicker, setShowAnniversaryPicker] = useState(false);
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isNameValid = useMemo(() => {
    return /^[A-Za-z .'-]{3,50}$/.test(
      fullName.trim(),
    );
  }, [fullName]);

  const isEmailValid = useMemo(() => {
    return emailRegex.test(email.trim());
  }, [email]);

  const isDOBValid = useMemo(() => {
    return dobSelected && dob < new Date();
  }, [dob, dobSelected]);

  const isMobileValid = useMemo(() => {
    const code =
      selectedMobileCountry.callingCode.replace(/\D/g, '') ||
      countryCode.replace(/\D/g, '') ||
      '91';
    const number = mobileNumber.replace(/\D/g, '');
    if (!number || /^0+$/.test(number)) {
      return false;
    }
    if (code === '91') {
      return isMobile(number);
    }
    return number.length >= 6 && number.length <= 15;
  }, [selectedMobileCountry, countryCode, mobileNumber]);

  const isFormValid = useMemo(() => {
    return (
      isNameValid &&
      isEmailValid &&
      isMobileValid &&
      isDOBValid &&
      gender !== '' &&
      country !== null &&
      pinCode.length === 6 &&
      region.trim().length >= 2 &&
      Boolean(stateModel?.id) &&
      Boolean(cityModel?.id) &&
      acceptedTerms
    );
  }, [
    isNameValid,
    isEmailValid,
    isMobileValid,
    isDOBValid,
    gender,
    country,
    pinCode,
    region,
    stateModel,
    cityModel,
    acceptedTerms,
  ]);

  const choosePhoto = async () => {
    try {
      const picked = await pickProfilePhoto({
        title: t('profilePicture'),
        camera: t('camera'),
        gallery: t('gallery'),
        cancel: t('cancel'),
      });
      if (!picked) {
        return;
      }
      setPickedPhoto(picked);
      setProfileImage(picked.uri);
    } catch (error: any) {
      const code = String(error?.message || '');
      if (code === 'permission') {
        Alert.alert(t('profilePicture'), t('allowCameraPhotoAccess'));
        return;
      }
      if (code === 'camera_unavailable') {
        Alert.alert(t('profilePicture'), t('cameraUnavailable'));
        return;
      }
      Alert.alert(t('profilePicture'), t('couldNotPickPhoto'));
    }
  };

  const submitProfile = async () => {
  console.log({
    fullName,
    isNameValid,
    email,
    isEmailValid,
    gender,
    dob,
    isDOBValid,
    country,
    stateModel,
    cityModel,
    acceptedTerms,
    isFormValid,
  });

  if (!isFormValid) {
    Alert.alert(t('validation'), t('fillRequiredSignup'));
    return;
  }

    const code =
      selectedMobileCountry.callingCode.replace(/\D/g, '') ||
      countryCode.replace(/\D/g, '') ||
      '91';
    const number = mobileNumber.replace(/\D/g, '');
    if (code === '91') {
      if (!isMobile(number) || /^0+$/.test(number)) {
        Alert.alert(
          t('validation'),
          t('enterMobileDigits', {digits: MOBILE_DIGITS}),
        );
        return;
      }
    } else {
      if (number.length < 6 || number.length > 15 || /^0+$/.test(number)) {
        Alert.alert(t('validation'), t('enterValidMobileNumber'));
        return;
      }
    }

  if (region.trim().length < 2) {
    Alert.alert(t('required'), t('enterRegionPlace'));
    return;
  }

  if (maritalStatus === 'Married' && spouseName.trim().length < 3) {
    Alert.alert(t('validation'), t('spouseNameRequiredMarried'));
    return;
  }

    setLoading(true);
    try {
      const countries = await ProfileApi.getCountries();
      const matchedCountry = countries?.find(
        (item: {isoCode?: string; code?: string}) =>
          item.isoCode === country?.code || item.code === country?.code,
      );

      const phoneNumber = `${code}${number}`;
      const profilePayload: CompleteProfileRequest = {
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber,
        gender: gender as CompleteProfileRequest['gender'],
        dob: istIsoDate(dob),
        // Always default to India (id=1) when country is missing; user can change.
        countryId: Number(matchedCountry?.id) || 1,
        stateId: Number(stateModel?.id) || 0,
        cityId: Number(cityModel?.id) || 0,
        languageId: Number(language?.id || DEFAULT_LANGUAGE.id || 1),
        address: address.trim(),
        postalCode: pinCode,
        region: region.trim(),
        maritalStatus,
        spouseName: maritalStatus === 'Married' ? spouseName.trim() : undefined,
        spouseDob:
          maritalStatus === 'Married'
            ? istIsoDate(spouseDob)
            : undefined,
        anniversaryDate:
          maritalStatus === 'Married'
            ? istIsoDate(anniversaryDate)
            : undefined,
        gothram: gothram.trim() || undefined,
        nakshatram: nakshatram.trim() || undefined,
        profileImage,
      };

      const session = await hydrateSession();
      if (session.token) {
        await ProfileApi.completeProfile(profilePayload);
        await saveSession(session.token, {
          ...(session.user || {}),
          fullName: fullName.trim(),
          email: email.trim(),
          mobileCountryCode: code,
          mobileNumber: number,
          dateOfBirth: profilePayload.dob,
          postalCode: pinCode,
          region: region.trim(),
          profileCompleted: 1,
        });
      } else {
        const password = String(route?.params?.password || '');
        const isSocial = Boolean(
          route?.params?.isGoogleSignup ||
          route?.params?.authProvider === 'google' ||
          route?.params?.firebaseToken ||
          route?.params?.firebaseUid,
        );
        if (!isSocial && password.length < 6) {
          Alert.alert(
            t('passwordRequiredTitle'),
            t('createAccountFirst'),
          );
          setLoading(false);
          return;
        }
        const result = await ProfileApi.register({
          ...profilePayload,
          mobileCountryCode: code,
          mobileNumber: number,
          password: password || undefined,
          firebaseToken: route?.params?.firebaseToken,
          firebaseUid: route?.params?.firebaseUid,
          authProvider: isSocial ? 'google' : undefined,
        });
        const token = result?.data?.token;
        const user = result?.data?.user;
        if (!token) {
          throw new Error('Registration token was not created.');
        }
        await saveSession(token, {
          ...(user || {}),
          postalCode: pinCode,
          region: region.trim(),
        });
      }

      if (pickedPhoto) {
        try {
          await ProfileApi.uploadPhoto(pickedPhoto);
        } catch {
          // Profile is created even if the photo upload fails.
        }
      }

      await resetToHomeAfterAuth(navigation);
    } catch (error: any) {
      Alert.alert(
        t('registrationTitle'),
        error?.response?.data?.message ||
          t('couldNotCompleteRegistration'),
      );
    } finally {
      setLoading(false);
    }
};
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          {paddingBottom: 140 + bottomPad},
        ]}>
        <AppHeader title={t('createYourProfile')} showBack={false} />
        <Text style={styles.stepLabel}>
          {t('stepOf', {current: 1, total: 2})}
        </Text>
        <View style={styles.stepTrack}>
          <View style={styles.stepFill} />
        </View>
        <Text style={styles.stepPercent}>50%</Text>

        <TouchableOpacity
          style={styles.profileContainer}
          onPress={choosePhoto}>

          {profileImage ? (
            <Image
              source={{uri: profileImage}}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileIcon}>
                👤
              </Text>
            </View>
          )}

          <Text style={styles.addPhoto}>
            {t('addProfilePicture')}
          </Text>

        </TouchableOpacity>

        <Text style={styles.heading}>{t('personalDetails')}</Text>
        <Text style={styles.subHeading}>
          {t('personalDetailsSub')}
        </Text>

        <Text style={styles.label}>
          {t('fullName')} *
        </Text>

        <TextInput
          style={[
            styles.input,
            fullName.length > 0 &&
              !isNameValid &&
              styles.errorInput,
          ]}
          placeholder={t('enterFullNamePlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={fullName}
          onChangeText={setFullName}
        />

        {fullName.length > 0 &&
          !isNameValid && (
            <Text style={styles.errorText}>
              {t('enterValidName')}
            </Text>
        )}

        <Text style={styles.label}>
          {t('email')} *
        </Text>

        <TextInput
          style={[
            styles.input,
            email.length > 0 &&
              !isEmailValid &&
              styles.errorInput,
          ]}
          placeholder={t('enterEmailPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {email.length > 0 &&
          !isEmailValid && (
            <Text style={styles.errorText}>
              {t('enterValidEmail')}
            </Text>
          )}

        <Text style={styles.label}>
          {t('mobileNumber')} *
        </Text>

        <View style={styles.mobileRow}>
          <TouchableOpacity
            style={styles.countryBtn}
            activeOpacity={0.7}
            onPress={() =>
              dismissKeyboardThen(() => setShowMobileCountryPicker(true))
            }>
            <Text style={styles.countryFlag}>{selectedMobileCountry.flag}</Text>
            <Text style={styles.countryCallingCode}>
              {selectedMobileCountry.callingCode}
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
                  selectedMobileCountry.code === 'IN' ? MOBILE_DIGITS : 15,
                ),
              )
            }
            keyboardType="phone-pad"
            placeholder={
              selectedMobileCountry.code === 'IN'
                ? t('mobileDigitsPlaceholder', {digits: MOBILE_DIGITS})
                : t('enterMobileNumber')
            }
            placeholderTextColor={Colors.textSecondary}
            maxLength={selectedMobileCountry.code === 'IN' ? MOBILE_DIGITS : 15}
          />
        </View>
        {selectedMobileCountry.code === 'IN' &&
        mobileNumber.length > 0 &&
        !isMobile(mobileNumber) ? (
          <Text style={styles.errorText}>
            {t('mobileMustBeDigits', {
              digits: MOBILE_DIGITS,
              entered: mobileNumber.length,
            })}
          </Text>
        ) : null}

        <CountrySelector
          visible={showMobileCountryPicker}
          onClose={() => setShowMobileCountryPicker(false)}
          onSelect={item => {
            setSelectedMobileCountry(item);
            setCountryCode(item.callingCode.replace(/\D/g, ''));
          }}
        />

        <Text style={styles.label}>
          {t('gender')} *
        </Text>

        <SelectField
          value={gender}
          onChange={setGender}
          placeholder={t('selectGender')}
          title={t('gender')}
          options={[
            {label: t('male'), value: 'Male'},
            {label: t('female'), value: 'Female'},
            {label: t('otherGender'), value: 'Other'},
            {label: t('preferNotToSay'), value: 'Prefer Not To Say'},
          ]}
        />
                <Text style={styles.label}>
          {t('dateOfBirth')} *
        </Text>

        <TouchableOpacity
          style={styles.input}
          onPress={() =>
            dismissKeyboardThen(() => setShowDatePicker(true))
          }>

          <Text style={dobSelected ? styles.dateText : styles.datePlaceholder}>
            {dobSelected ? dob.toDateString() : t('selectDate')}
          </Text>

        </TouchableOpacity>

        <DatePickerModal
          visible={showDatePicker}
          value={dob}
          maximumDate={new Date()}
          onCancel={() => setShowDatePicker(false)}
          onConfirm={selectedDate => {
            setDob(selectedDate);
            setDobSelected(true);
            setShowDatePicker(false);
          }}
        />

        <Text style={styles.label}>
          {t('country')} *
        </Text>

       <CountryPickerField
  value={
    country ?? {
      code: '',
      name: t('selectCountry'),
      flag: '🌍',
      callingCode: '',
    }
  }
  onChange={(item: CountryItem) => {
    setCountry(item);
    setStateModel(null);
    setCityModel(null);
  }}
/>

        <Text style={styles.label}>
          {t('pinCode')} *
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t('pinCode')}
          placeholderTextColor={Colors.textSecondary}
          value={pinCode}
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={async value => {
            const digits = value.replace(/\D/g, '').slice(0, 6);
            setPinCode(digits);
            if (digits.length !== 6) {
              return;
            }
            try {
              const found = await ProfileApi.lookupPin(digits);
              setStateModel({id: Number(found.stateId), name: found.stateName});
              setCityModel({id: Number(found.cityId), name: found.cityName});
            } catch {
              setStateModel(null);
              setCityModel(null);
              Alert.alert(t('pinCode'), t('pinNotFound'));
            }
          }}
        />

        <Text style={styles.label}>
          {t('state')}
        </Text>

        <StateSelector
  country={country}
  value={stateModel}
  onChange={(item: StateModel) => {
    console.log('Parent received state:', item);

    setStateModel(item);
    setCityModel(null);
  }}
/>

        <Text style={styles.label}>
          {t('city')}
        </Text>

        <CitySelector
          state={stateModel}
          value={cityModel}
          onChange={(item: CityModel) => {
  setCityModel(item);
}}
        />

        <Text style={styles.label}>
          {t('regionPlace')} *
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t('enterRegionPlace')}
          placeholderTextColor={Colors.textSecondary}
          value={region}
          onChangeText={setRegion}
          maxLength={80}
        />

        <Text style={styles.label}>
          {t('address')}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t('enterAddressPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>
          {t('maritalStatus')} *
        </Text>
        <SelectField
          value={maritalStatus}
          onChange={value => setMaritalStatus(value as 'Bachelor' | 'Married')}
          title={t('maritalStatus')}
          options={[
            {label: t('bachelor'), value: 'Bachelor'},
            {label: t('married'), value: 'Married'},
          ]}
        />

        {maritalStatus === 'Married' ? (
          <>
            <Text style={styles.label}>{t('spouseNameStar')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('enterSpouseName')}
              placeholderTextColor={Colors.textSecondary}
              value={spouseName}
              onChangeText={setSpouseName}
            />

            <Text style={styles.label}>{t('spouseDobStar')}</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() =>
                dismissKeyboardThen(() => setShowSpouseDobPicker(true))
              }>
              <Text style={styles.dateText}>{spouseDob.toDateString()}</Text>
            </TouchableOpacity>
            <DatePickerModal
              visible={showSpouseDobPicker}
              value={spouseDob}
              maximumDate={new Date()}
              onCancel={() => setShowSpouseDobPicker(false)}
              onConfirm={selectedDate => {
                setSpouseDob(selectedDate);
                setShowSpouseDobPicker(false);
              }}
            />

            <Text style={styles.label}>{t('anniversaryDateStar')}</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() =>
                dismissKeyboardThen(() => setShowAnniversaryPicker(true))
              }>
              <Text style={styles.dateText}>
                {anniversaryDate.toDateString()}
              </Text>
            </TouchableOpacity>
            <DatePickerModal
              visible={showAnniversaryPicker}
              value={anniversaryDate}
              maximumDate={new Date()}
              onCancel={() => setShowAnniversaryPicker(false)}
              onConfirm={selectedDate => {
                setAnniversaryDate(selectedDate);
                setShowAnniversaryPicker(false);
              }}
            />
          </>
        ) : null}

        <Text style={styles.label}>{t('gothramOptional')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('enterGothram')}
          placeholderTextColor={Colors.textSecondary}
          value={gothram}
          onChangeText={setGothram}
        />

        <Text style={styles.label}>{t('nakshatramOptional')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('enterNakshatram')}
          placeholderTextColor={Colors.textSecondary}
          value={nakshatram}
          onChangeText={setNakshatram}
        />

        <Text style={styles.label}>
          {t('preferredLanguage')}
        </Text>

        <LanguageSelector
          value={language}
          onChange={(item: Language) => {
  setLanguage(item);
}}
        />

        <View style={styles.termsContainer}>
          <TouchableOpacity
            onPress={() => setAcceptedTerms(!acceptedTerms)}>
            <View
              style={[
                styles.checkbox,
                acceptedTerms && styles.checkboxSelected,
              ]}>
              {acceptedTerms && (
                <Text style={styles.checkMark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            {t('agreeTermsPrefix')}{' '}
            <Text
              style={styles.privacyLink}
              onPress={() => navigation.navigate('PrivacyPolicy')}>
              {t('privacyPolicy')}
            </Text>
          </Text>
        </View>

        {loading ? (

          <ActivityIndicator
            size="large"
            color={Colors.primary}
          />

        ) : (

          <ContinueButton
            title={t('createProfile')}
            onPress={submitProfile}
            disabled={false}
          />

        )}

        <View style={styles.bottomSpacing} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default CompleteProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 20,
  },

  profileContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 25,
  },

  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
  },

  profilePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },

  profileIcon: {
    fontSize: 48,
  },

  addPhoto: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },

  stepLabel: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  stepFill: {
    width: '50%',
    height: 10,
    backgroundColor: Colors.templeGold,
  },
  stepPercent: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 8,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },

  subHeading: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 25,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 18,
  },

  input: {
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    justifyContent: 'center',
    fontSize: 16,
    color: Colors.textPrimary,
  },

  mobileRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  countryBtn: {
    height: 55,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
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
  mobileInput: {
    flex: 1,
  },

  disabledInput: {
    backgroundColor: '#F7F7F7',
    color: '#666666',
  },


  dateText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  datePlaceholder: {
    fontSize: 16,
    color: Colors.textSecondary,
  },

  errorInput: {
    borderColor: '#E53935',
  },

  errorText: {
    color: '#E53935',
    fontSize: 13,
    marginTop: 5,
  },

  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxSelected: {
    backgroundColor: Colors.primary,
  },

  checkMark: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  termsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
  },

  privacyLink: {
    color: Colors.primary,
    fontWeight: '700',
  },

  bottomSpacing: {
    height: 60,
  },
});