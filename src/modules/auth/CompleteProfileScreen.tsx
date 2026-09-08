import React, {useMemo, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';

import {Picker} from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import Colors from '../../theme/colors';

import AppHeader from '../common/AppHeader';
import CountryPickerField from './components/CountryPickerField';
import StateSelector from './components/StateSelector';
import CitySelector from './components/CitySelector';
import LanguageSelector from './components/LanguageSelector';
import ContinueButton from './components/ContinueButton';

import {CountryItem} from '../../constants/countries';
import {DEFAULT_LANGUAGE, Language} from '../../constants/languages';
import ProfileApi, {CompleteProfileRequest} from './services/profileApi';
import {hydrateSession, saveSession} from '../../services/session';
import {pickProfilePhoto, type PickedPhoto} from '../../services/profilePhoto';

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
  const phoneNumber = route?.params?.phoneNumber ?? '';
  const registeredEmail = route?.params?.email ?? '';
  const mobileCountryCode = String(route?.params?.mobileCountryCode || '').replace(
    /\D/g,
    '',
  );
  const mobileNumber = String(route?.params?.mobileNumber || '').replace(
    /\D/g,
    '',
  );

  const [loading, setLoading] = useState(false);

  const [profileImage, setProfileImage] =
    useState<string | null>(null);
  const [pickedPhoto, setPickedPhoto] = useState<PickedPhoto | null>(null);

  const [fullName, setFullName] = useState('');

  const [email, setEmail] = useState(registeredEmail);

  const [gender, setGender] = useState('');

  const [dob, setDob] = useState(new Date());

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [country, setCountry] =
  useState<CountryItem | null>(null);

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
    return dob < new Date();
  }, [dob]);

  const isFormValid = useMemo(() => {
    return (
      isNameValid &&
      isEmailValid &&
      isDOBValid &&
      gender !== '' &&
      country !== null &&
    
      acceptedTerms
    );
  }, [
    isNameValid,
    isEmailValid,
    isDOBValid,
    gender,
    country,
    stateModel,
    cityModel,
    language,
    acceptedTerms,
  ]);

  const choosePhoto = async () => {
    try {
      const picked = await pickProfilePhoto({
        title: 'Profile Picture',
        camera: 'Camera',
        gallery: 'Gallery',
        cancel: 'Cancel',
      });
      if (!picked) {
        return;
      }
      setPickedPhoto(picked);
      setProfileImage(picked.uri);
    } catch (error: any) {
      const code = String(error?.message || '');
      if (code === 'permission') {
        Alert.alert(
          'Profile Picture',
          'Please allow camera and photo access to add a profile picture.',
        );
        return;
      }
      if (code === 'camera_unavailable') {
        Alert.alert('Profile Picture', 'Camera is not available on this device.');
        return;
      }
      Alert.alert('Profile Picture', 'Could not pick a photo. Please try again.');
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

  if (!isFormValid || !address.trim()) {
    Alert.alert('Validation', 'Please fill all required signup fields.');
    return;
  }

  if (maritalStatus === 'Married' && spouseName.trim().length < 3) {
    Alert.alert('Validation', 'Spouse name is required for married devotees.');
    return;
  }

    setLoading(true);
    try {
      const countries = await ProfileApi.getCountries();
      const matchedCountry = countries?.find(
        (item: {isoCode?: string; code?: string}) =>
          item.isoCode === country?.code || item.code === country?.code,
      );

      const profilePayload: CompleteProfileRequest = {
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber,
        gender: gender as CompleteProfileRequest['gender'],
        dob: dob.toISOString().slice(0, 10),
        countryId: Number(matchedCountry?.id) || 1,
        stateId: Number(stateModel?.id) || 0,
        cityId: Number(cityModel?.id) || 0,
        languageId: Number(language?.id || DEFAULT_LANGUAGE.id || 1),
        address: address.trim(),
        maritalStatus,
        spouseName: maritalStatus === 'Married' ? spouseName.trim() : undefined,
        spouseDob:
          maritalStatus === 'Married'
            ? spouseDob.toISOString().slice(0, 10)
            : undefined,
        anniversaryDate:
          maritalStatus === 'Married'
            ? anniversaryDate.toISOString().slice(0, 10)
            : undefined,
        gothram: gothram.trim() || undefined,
        nakshatram: nakshatram.trim() || undefined,
        profileImage,
      };

      const session = await hydrateSession();
      if (session.token) {
        await ProfileApi.completeProfile(profilePayload);
      } else {
        const countryCode =
          mobileCountryCode ||
          String(phoneNumber).slice(0, Math.max(String(phoneNumber).length - 10, 1));
        const number =
          mobileNumber || String(phoneNumber).slice(-10);

        const result = await ProfileApi.register({
          ...profilePayload,
          mobileCountryCode: countryCode,
          mobileNumber: number,
        });
        const token = result?.data?.token;
        const user = result?.data?.user;
        if (!token) {
          throw new Error('Registration token was not created.');
        }
        await saveSession(token, user);
      }

      if (pickedPhoto) {
        try {
          await ProfileApi.uploadPhoto(pickedPhoto);
        } catch {
          // Profile is created even if the photo upload fails.
        }
      }

      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert(
        'Registration',
        error?.response?.data?.message ||
          'Could not complete registration. Please try again.',
      );
    } finally {
      setLoading(false);
    }
};
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <AppHeader title="Create Your Profile" showBack />
        <Text style={styles.stepLabel}>Step 1 of 2</Text>
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
            Add Profile Picture (Optional)
          </Text>

        </TouchableOpacity>

        <Text style={styles.heading}>Personal details</Text>
        <Text style={styles.subHeading}>
          Then add spiritual details and create your profile.
        </Text>

        <Text style={styles.label}>
          Full Name *
        </Text>

        <TextInput
          style={[
            styles.input,
            fullName.length > 0 &&
              !isNameValid &&
              styles.errorInput,
          ]}
          placeholder="Enter Full Name"
          value={fullName}
          onChangeText={setFullName}
        />

        {fullName.length > 0 &&
          !isNameValid && (
            <Text style={styles.errorText}>
              Enter a valid name.
            </Text>
        )}

        <Text style={styles.label}>
          Email Address *
        </Text>

        <TextInput
          style={[
            styles.input,
            email.length > 0 &&
              !isEmailValid &&
              styles.errorInput,
          ]}
          placeholder="Enter Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {email.length > 0 &&
          !isEmailValid && (
            <Text style={styles.errorText}>
              Invalid email address.
            </Text>
          )}

        <Text style={styles.label}>
          Mobile Number
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.disabledInput,
          ]}
          editable={false}
          value={phoneNumber}
        />

        <Text style={styles.label}>
          Gender *
        </Text>

        <View style={styles.pickerContainer}>

          <Picker
            selectedValue={gender}
            onValueChange={setGender}>

            <Picker.Item
              label="Select Gender"
              value=""
            />

            <Picker.Item
              label="Male"
              value="Male"
            />

            <Picker.Item
              label="Female"
              value="Female"
            />

            <Picker.Item
              label="Other"
              value="Other"
            />

            <Picker.Item
              label="Prefer Not To Say"
              value="Prefer Not To Say"
            />

          </Picker>

        </View>
                <Text style={styles.label}>
          Date of Birth *
        </Text>

        <TouchableOpacity
          style={styles.input}
          onPress={() =>
            setShowDatePicker(true)
          }>

          <Text style={styles.dateText}>
            {dob.toDateString()}
          </Text>

        </TouchableOpacity>

        {showDatePicker && (

          <DateTimePicker
            value={dob}
            mode="date"
            maximumDate={new Date()}
            onChange={(
              event,
              selectedDate,
            ) => {
              setShowDatePicker(false);

              if (selectedDate) {
                setDob(selectedDate);
              }
            }}
          />

        )}

        <Text style={styles.label}>
          Country *
        </Text>

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

        <Text style={styles.label}>
          State 
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
          City 
        </Text>

        <CitySelector
          state={stateModel}
          value={cityModel}
          onChange={(item: CityModel) => {
  setCityModel(item);
}}
        />

        <Text style={styles.label}>
          Address *
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Address"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>
          Marital Status *
        </Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={maritalStatus}
            onValueChange={value =>
              setMaritalStatus(value as 'Bachelor' | 'Married')
            }>
            <Picker.Item label="Bachelor" value="Bachelor" />
            <Picker.Item label="Married" value="Married" />
          </Picker>
        </View>

        {maritalStatus === 'Married' ? (
          <>
            <Text style={styles.label}>Spouse Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Spouse Name"
              value={spouseName}
              onChangeText={setSpouseName}
            />

            <Text style={styles.label}>Spouse Date of Birth *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowSpouseDobPicker(true)}>
              <Text style={styles.dateText}>{spouseDob.toDateString()}</Text>
            </TouchableOpacity>
            {showSpouseDobPicker ? (
              <DateTimePicker
                value={spouseDob}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, selectedDate) => {
                  setShowSpouseDobPicker(false);
                  if (selectedDate) {
                    setSpouseDob(selectedDate);
                  }
                }}
              />
            ) : null}

            <Text style={styles.label}>Anniversary Date *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowAnniversaryPicker(true)}>
              <Text style={styles.dateText}>
                {anniversaryDate.toDateString()}
              </Text>
            </TouchableOpacity>
            {showAnniversaryPicker ? (
              <DateTimePicker
                value={anniversaryDate}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, selectedDate) => {
                  setShowAnniversaryPicker(false);
                  if (selectedDate) {
                    setAnniversaryDate(selectedDate);
                  }
                }}
              />
            ) : null}
          </>
        ) : null}

        <Text style={styles.label}>Gothram (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Gothram"
          value={gothram}
          onChangeText={setGothram}
        />

        <Text style={styles.label}>Nakshatram (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Nakshatram"
          value={nakshatram}
          onChangeText={setNakshatram}
        />

        <Text style={styles.label}>
          Preferred Language 
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
            I agree to the Terms of Service and{' '}
            <Text
              style={styles.privacyLink}
              onPress={() => navigation.navigate('PrivacyPolicy')}>
              Privacy Policy
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
            title="CREATE PROFILE"
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
    paddingBottom: 50,
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
  },

  disabledInput: {
    backgroundColor: '#F7F7F7',
    color: '#666666',
  },

  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  dateText: {
    fontSize: 16,
    color: Colors.textPrimary,
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