import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import countryList, {CountryItem} from '../../constants/countries';
import {DEFAULT_LANGUAGE, Language} from '../../constants/languages';
import {useLanguage} from '../../i18n/LanguageContext';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import CountryPickerField from '../auth/components/CountryPickerField';
import StateSelector from '../auth/components/StateSelector';
import CitySelector from '../auth/components/CitySelector';
import LanguageSelector from '../auth/components/LanguageSelector';
import ProfileApi from '../auth/services/profileApi';
import {hydrateSession, saveSession} from '../../services/session';

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
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
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
    setGender(data.gender || '');
    setAddress(data.address || '');
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
      Alert.alert('Profile', 'Could not load profile details.');
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
    if (maritalStatus === 'Married' && spouseName.trim().length < 3) {
      Alert.alert('Validation', 'Spouse name is required for married devotees.');
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
        mobileNumber: mobileNumber.trim() || undefined,
        gender: gender || undefined,
        countryId,
        stateId: stateModel?.id ? Number(stateModel.id) : undefined,
        cityId: cityModel?.id ? Number(cityModel.id) : undefined,
        preferredLanguageId: language?.id
          ? Number(language.id)
          : undefined,
        address: address.trim(),
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
      Alert.alert('Saved', 'Personal details updated.');
    } catch (error: any) {
      Alert.alert(
        'Update failed',
        error?.response?.data?.message ||
          'Could not save personal details. Please try again.',
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

  if (!editing) {
    return (
      <ScreenLayout title="Personal Details" showBack tab="Profile">
        <Row label="Full name" value={fullName} />
        <Row label="Mobile" value={mobileNumber} />
        <Row label="Email" value={email} />
        <Row label="Gender" value={gender} />
        <Row label="Location" value={location} />
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

      <Text style={styles.label}>{t('mobile')}</Text>
      <TextInput
        style={styles.input}
        value={mobileNumber}
        onChangeText={setMobileNumber}
        keyboardType="phone-pad"
        placeholder={t('placeholderMobile')}
      />

      <Text style={styles.label}>{t('gender')}</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={gender} onValueChange={setGender}>
          <Picker.Item label={t('selectGender')} value="" />
          <Picker.Item label={t('male')} value="Male" />
          <Picker.Item label={t('female')} value="Female" />
          <Picker.Item label={t('otherGender')} value="Other" />
          <Picker.Item label={t('preferNotToSay')} value="Prefer Not To Say" />
        </Picker>
      </View>

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

      <Text style={styles.label}>{t('address')}</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder={t('enterAddress')}
      />

      <Text style={styles.label}>{t('language')}</Text>
      <LanguageSelector
        value={language}
        onChange={(item: Language) => setLanguage(item)}
      />

      <Text style={styles.label}>{t('maritalStatus')}</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={maritalStatus}
          onValueChange={value =>
            setMaritalStatus(value as 'Bachelor' | 'Married')
          }>
          <Picker.Item label={t('bachelor')} value="Bachelor" />
          <Picker.Item label={t('married')} value="Married" />
        </Picker>
      </View>

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
    marginBottom: 4,
  },
  rowValue: {
    color: Colors.sacredBrown,
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.sacredBrown,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  disabledInput: {
    backgroundColor: '#F3F1EC',
    color: '#8A8174',
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 8,
    overflow: 'hidden',
  },
  gap: {
    height: 12,
  },
});
