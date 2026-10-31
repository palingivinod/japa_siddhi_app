import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import countryList, {CountryItem} from '../../constants/countries';
import {DEFAULT_LANGUAGE, Language} from '../../constants/languages';
import {useLanguage} from '../../i18n/LanguageContext';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SelectField from '../common/SelectField';
import CountryPickerField from '../auth/components/CountryPickerField';
import StateSelector from '../auth/components/StateSelector';
import CitySelector from '../auth/components/CitySelector';
import LanguageSelector from '../auth/components/LanguageSelector';
import ProfileApi from '../auth/services/profileApi';
import {hydrateSession, saveSession} from '../../services/session';
import DatePickerModal from '../common/DatePickerModal';
import {isMobile, MOBILE_DIGITS} from '../../utils/validators';

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

interface StateModel {
  id: number;
  name: string;
}

interface CityModel {
  id: number;
  name: string;
}

const Row = ({label, value}: {label: string; value?: string}) => {
  const {tt} = useLanguage();
  return value ? (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{tt(label)}</Text>
      <Text style={styles.rowValue}>{tt(value)}</Text>
    </View>
  ) : null;
};

const PersonalDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dobText, setDobText] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [gender, setGender] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'Bachelor' | 'Married'>(
    'Bachelor',
  );
  const [spouseName, setSpouseName] = useState('');
  const [country, setCountry] = useState<CountryItem | null>(null);
  const [stateModel, setStateModel] = useState<StateModel | null>(null);
  const [cityModel, setCityModel] = useState<CityModel | null>(null);
  const [language, setLanguage] = useState<Language | null>(DEFAULT_LANGUAGE);

  const applyProfile = (data: any) => {
    if (!data) {
      return;
    }
    setProfile(data);
    setFullName(data.fullName || '');
    setEmail(data.email || '');
    setMobileNumber(data.mobileNumber || '');
    const isoDob = String(data.dateOfBirth || data.dob || '').slice(0, 10);
    setDateOfBirth(isoDob);
    setDobText(formatDobDisplay(isoDob));
    setGender(data.gender || '');
    setAddress(data.address || '');
    setRegion(String(data.region || '').trim());
    if (String(data.region || '').trim().length < 2) {
      setEditing(true);
    }
    setPinCode(String(data.postalCode || data.pinCode || '').replace(/\D/g, '').slice(0, 6));
    setMaritalStatus(
      data.maritalStatus === 'Married' ? 'Married' : 'Bachelor',
    );
    setSpouseName(data.spouseName || '');

    const matchedCountry =
      countryList.find(
        item =>
          item.name.toLowerCase() ===
          String(data.countryName || '').toLowerCase(),
      ) || null;
    setCountry(matchedCountry);

    setStateModel(
      data.stateId && data.stateName
        ? {id: Number(data.stateId), name: data.stateName}
        : null,
    );
    setCityModel(
      data.cityId && data.cityName
        ? {id: Number(data.cityId), name: data.cityName}
        : null,
    );
    setLanguage(
      data.preferredLanguageId
        ? {
            id: Number(data.preferredLanguageId),
            code: '',
            name: data.preferredLanguageName || 'Language',
            nativeName: data.preferredLanguageName || 'Language',
          }
        : DEFAULT_LANGUAGE,
    );
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await ProfileApi.getProfile();
      applyProfile(data);
    } catch {
      Alert.alert(t('profileTitle'), t('couldNotLoadProfile'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setEditing(false);
      loadProfile();
    }, []),
  );

  const cancelEdit = () => {
    applyProfile(profile);
    setEditing(false);
  };

  const savePersonal = async () => {
    const mobile = mobileNumber.replace(/\D/g, '');
    if (
      !mobile ||
      /^0+$/.test(mobile) ||
      (mobile.length === MOBILE_DIGITS ? !isMobile(mobile) : mobile.length < 6)
    ) {
      Alert.alert(t('required'), t('enterValidMobileNumber'));
      return;
    }
    const isoDob = parseDob(dobText);
    if (!isoDob) {
      Alert.alert(t('required'), t('enterDateOfBirth'));
      return;
    }
    if (!/^[0-9]{6}$/.test(pinCode)) {
      Alert.alert(t('required'), t('enterPinCode'));
      return;
    }
    if (region.trim().length < 2) {
      Alert.alert(t('required'), t('enterRegionPlace'));
      return;
    }
    if (maritalStatus === 'Married' && spouseName.trim().length < 3) {
      Alert.alert(t('validationTitle'), t('spouseNameRequired'));
      return;
    }

    setSaving(true);
    try {
      let countryId = profile?.countryId ? Number(profile.countryId) : undefined;
      if (country?.code) {
        const countries = await ProfileApi.getCountries();
        const matched = countries?.find(
          (item: {isoCode?: string; code?: string}) =>
            item.isoCode === country.code || item.code === country.code,
        );
        if (matched?.id) {
          countryId = Number(matched.id);
        }
      }

      const updated = await ProfileApi.updateProfile({
        mobileNumber: mobile,
        dateOfBirth: isoDob,
        gender: gender || undefined,
        countryId,
        stateId: stateModel?.id ? Number(stateModel.id) : undefined,
        cityId: cityModel?.id ? Number(cityModel.id) : undefined,
        preferredLanguageId: language?.id
          ? Number(language.id)
          : undefined,
        address: address.trim(),
        postalCode: pinCode,
        region: region.trim(),
        maritalStatus,
        spouseName:
          maritalStatus === 'Married' ? spouseName.trim() : '',
      });

      if (updated) {
        applyProfile(updated);
        const session = await hydrateSession();
        if (session.token) {
          await saveSession(session.token, {
            ...(session.user || {}),
            ...updated,
          });
        }
      }

      setEditing(false);
      Alert.alert(t('savedTitle'), t('personalDetailsUpdated'));
    } catch (error: any) {
      Alert.alert(
        t('updateFailedTitle'),
        error?.response?.data?.message || t('couldNotSavePersonal'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout title="Personal Details" showBack tab="Profile">
        <ActivityIndicator color={Colors.leafGreen} style={{marginTop: 40}} />
      </ScreenLayout>
    );
  }

  const location = [
    cityModel?.name || profile?.cityName,
    stateModel?.name || profile?.stateName,
    country?.name || profile?.countryName,
  ]
    .filter(Boolean)
    .join(', ');

  const userCode =
    profile?.userCode ||
    profile?.user_code ||
    (profile?.id ? `BPJS${String(profile.id).padStart(2, '0')}` : '');

  if (!editing) {
  return (
    <ScreenLayout title="Personal Details" showBack tab="Profile">
        {userCode ? <Row label={t('userId')} value={userCode} /> : null}
        <Row label="Full name" value={fullName} />
        <Row label="Mobile" value={mobileNumber} />
        <Row label={t('dateOfBirth')} value={formatDobDisplay(dateOfBirth)} />
        <Row label={t('pinCode')} value={pinCode} />
        <Row label="Email" value={email} />
        <Row label="Gender" value={gender} />
      <Row label="Location" value={location} />
        <Row label={t('regionPlace')} value={region} />
        <Row label="Address" value={address} />
        <Row
          label="Language"
          value={language?.name || profile?.preferredLanguageName}
        />
        <Row label="Marital status" value={maritalStatus} />
        {maritalStatus === 'Married' ? (
          <Row label="Spouse name" value={spouseName} />
        ) : null}

        <PrimaryButton title="EDIT DETAILS" onPress={() => setEditing(true)} />
        <View style={styles.gap} />
      <PrimaryButton
        title="SPIRITUAL DETAILS"
          onPress={() =>
            navigation.navigate('SpiritualDetails', {profile})
          }
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Edit Personal Details" showBack tab="Profile">
      <Text style={styles.label}>{t('fullName')}</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value={fullName}
        editable={false}
      />

      <Text style={styles.label}>{t('email')}</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value={email}
        editable={false}
        autoCapitalize="none"
      />

      <Text style={styles.label}>{t('mobile')} *</Text>
      <TextInput
        style={styles.input}
        value={mobileNumber}
        onChangeText={setMobileNumber}
        keyboardType="phone-pad"
        placeholder={t('placeholderMobile')}
      />

      <Text style={styles.label}>{t('dateOfBirth')} *</Text>
      <View style={styles.dobRow}>
        <TextInput
          style={[styles.input, styles.dobInput]}
          value={dobText}
          onChangeText={value => setDobText(maskDob(value))}
          placeholder={t('dobFormatPlaceholder')}
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
          setDateOfBirth(iso);
          setDobText(formatDobDisplay(iso));
          setShowDobPicker(false);
        }}
      />

      <Text style={styles.label}>{t('gender')}</Text>
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

      <Text style={styles.label}>{t('country')}</Text>
      <CountryPickerField
        value={
          country ?? {
            code: '',
            name: 'Select Country',
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

      <Text style={styles.label}>{t('pinCode')} *</Text>
      <TextInput
        style={styles.input}
        value={pinCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder={t('pinCode')}
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

      <Text style={styles.label}>{t('state')}</Text>
      <StateSelector
        country={country}
        value={stateModel}
        onChange={(item: StateModel) => {
          setStateModel(item);
          setCityModel(null);
        }}
      />

      <Text style={styles.label}>{t('city')}</Text>
      <CitySelector
        state={stateModel}
        value={cityModel}
        onChange={(item: CityModel) => setCityModel(item)}
      />

      <Text style={styles.label}>{t('regionPlace')} *</Text>
      <TextInput
        style={styles.input}
        value={region}
        onChangeText={setRegion}
        placeholder={t('regionPlaceholder') || 'Your nearest city'}
        placeholderTextColor={Colors.placeholder}
        maxLength={80}
      />

      <Text style={styles.label}>{t('address')}</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder={t('enterAddress')}
      />
      <Text style={styles.addressNote}>* {t('addressDetailedHint')}</Text>

      <Text style={styles.label}>{t('language')}</Text>
      <LanguageSelector
        value={language}
        onChange={(item: Language) => setLanguage(item)}
      />

      <Text style={styles.label}>{t('maritalStatus')}</Text>
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
          <Text style={styles.label}>{t('spouseName')}</Text>
          <TextInput
            style={styles.input}
            value={spouseName}
            onChangeText={setSpouseName}
            placeholder={t('spouseName')}
          />
        </>
      ) : null}

      {saving ? (
        <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 16}} />
      ) : (
        <>
          <PrimaryButton title="SAVE" onPress={savePersonal} />
          <View style={styles.gap} />
          <PrimaryButton title="CANCEL" onPress={cancelEdit} />
        </>
      )}
    </ScreenLayout>
  );
};

export default PersonalDetailsScreen;

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  rowLabel: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
    paddingBottom: 2,
  },
  rowValue: {
    color: Colors.sacredBrown,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
    marginTop: 8,
    paddingBottom: 2,
  },
  placeholder: {
    color: Colors.placeholder,
    fontSize: 16,
    fontWeight: '600',
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dobInput: {
    flex: 1,
    marginBottom: 8,
  },
  dobButton: {
    width: 50,
    height: 50,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobButtonText: {
    fontSize: 22,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
    color: Colors.sacredBrown,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  disabledInput: {
    backgroundColor: '#F3F1EC',
    color: '#8A8174',
  },
  gap: {
    height: 12,
  },
  addressNote: {
    color: '#D32F2F',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: -2,
    marginBottom: 10,
    lineHeight: 18,
    includeFontPadding: true,
  },
});
