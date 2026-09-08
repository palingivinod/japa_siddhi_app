import React, {useState} from 'react';
import {Alert, Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import ProfileApi from './services/profileApi';
import {hydrateSession, saveSession} from '../../services/session';
import {pickProfilePhoto, type PickedPhoto} from '../../services/profilePhoto';

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
  const [pickedPhoto, setPickedPhoto] = useState<PickedPhoto | null>(null);

  const choosePhoto = async () => {
    try {
      const picked = await pickProfilePhoto({
        title: 'Profile Photo',
        camera: 'Camera',
        gallery: 'Gallery',
        cancel: 'Cancel',
      });
      if (!picked) {
        return;
      }
      setPickedPhoto(picked);
    } catch (error: any) {
      const code = String(error?.message || '');
      if (code === 'permission') {
        Alert.alert(
          'Profile Photo',
          'Please allow camera and photo access to add a profile picture.',
        );
        return;
      }
      if (code === 'camera_unavailable') {
        Alert.alert('Profile Photo', 'Camera is not available on this device.');
        return;
      }
      Alert.alert('Profile Photo', 'Could not pick a photo. Please try again.');
    }
  };

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
      if (pickedPhoto) {
        try {
          await ProfileApi.uploadPhoto(pickedPhoto);
        } catch {
          // Profile is created even if the photo upload fails.
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
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={choosePhoto}
        accessibilityRole="button"
        accessibilityLabel="Add a profile photo">
        <View style={styles.avatar}>
          {pickedPhoto?.uri ? (
            <Image source={{uri: pickedPhoto.uri}} style={styles.avatarImage} />
          ) : (
            <Text style={styles.face}>😊</Text>
          )}
        </View>
        <View style={styles.cameraBadge}>
          <Text style={styles.cameraBadgeText}>📷</Text>
        </View>
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
  avatarWrap: {
    alignSelf: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
  },
  cameraBadgeText: {
    fontSize: 16,
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
