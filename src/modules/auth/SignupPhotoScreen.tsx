import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import ProfileApi from './services/profileApi';
import {hydrateSession, saveSession} from '../../services/session';

const toIso = (value: string) => {
  const parts = String(value || '').split(/[/-]/);
  if (parts.length === 3 && parts[0].length === 2) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return value || '1995-01-01';
};

const SignupPhotoScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const params = route.params || {};
    setSaving(true);
    try {
      const payload = {
        fullName: params.fullName || 'Devotee',
        email: params.email,
        phoneNumber: `${params.mobileCountryCode || ''}${params.mobileNumber || ''}`,
        gender: params.gender || 'Prefer Not To Say',
        dob: toIso(params.dob),
        countryId: 1,
        stateId: 1,
        cityId: 1,
        languageId: 1,
        address: params.address,
        maritalStatus: params.maritalStatus === 'Married' ? 'Married' : 'Bachelor',
        gothram: params.gothram,
        nakshatram: params.nakshatram,
        profileImage: null,
      } as const;

      const session = await hydrateSession();
      if (session.token) {
        await ProfileApi.completeProfile(payload);
      } else {
        const result = await ProfileApi.register({
          ...payload,
          mobileCountryCode: String(params.mobileCountryCode || '91'),
          mobileNumber: String(params.mobileNumber || ''),
        });
        if (result?.data?.token) {
          await saveSession(result.data.token, result.data.user);
        }
      }
      navigation.replace('RegistrationComplete');
    } catch (error: any) {
      Alert.alert(
        'Registration',
        error?.response?.data?.message || 'Could not create your profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Profile Photo" showBack>
      <TouchableOpacity style={styles.avatar}>
        <Text style={styles.face}>☺</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Add a profile photo</Text>
      <Text style={styles.copy}>This is optional. You can skip and add it later.</Text>
      <PrimaryButton
        title={saving ? 'CREATING...' : 'CREATE PROFILE'}
        onPress={submit}
        disabled={saving}
      />
    </ScreenLayout>
  );
};

export default SignupPhotoScreen;

const styles = StyleSheet.create({
  avatar: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  face: {fontSize: 52, color: Colors.sacredBrown},
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  copy: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginVertical: 16,
    lineHeight: 22,
  },
});
