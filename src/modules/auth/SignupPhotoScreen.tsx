import React, {useState} from 'react';
import {Alert, Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import OutlineButton from '../common/OutlineButton';
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
    const mobileCountryCode = String(params.mobileCountryCode || '91').replace(
      /\D/g,
      '',
    );
    const mobileNumber = String(params.mobileNumber || '').replace(/\D/g, '');
    const password = String(params.password || '');
    if (mobileNumber.length < 8 || mobileNumber === '0000000000') {
      Alert.alert(
        'Mobile required',
        'Go back and enter a valid mobile number before creating your profile.',
      );
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        'Password required',
        'Go back to Create Account and set your password before creating your profile.',
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: params.fullName || 'Devotee',
        email: params.email,
        phoneNumber: `${mobileCountryCode}${mobileNumber}`,
        gender: params.gender || 'Prefer Not To Say',
        dob: toIso(params.dob),
        countryId: 1,
        stateId: 1,
        cityId: 1,
        languageId: 1,
        address: params.address,
        maritalStatus:
          params.maritalStatus === 'Married' ? 'Married' : 'Bachelor',
        gothram: params.gothram,
        nakshatram: params.nakshatram,
        profileImage: null,
      } as const;

      const session = await hydrateSession();
      if (session.token) {
        await ProfileApi.completeProfile(payload);
        try {
          await ProfileApi.updateProfile({mobileNumber});
        } catch {
          // Profile still created if mobile sync fails.
        }
      } else {
        const result = await ProfileApi.register({
          ...payload,
          mobileCountryCode,
          mobileNumber,
          password,
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
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Could not create your profile.';
      Alert.alert(
        'Registration',
        /UNIQUE|firebase_uid/i.test(String(message))
          ? 'This account may already exist. Try logging in with the same email, or use a different email.'
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Profile Photo" showBack>
      <Text style={styles.step}>Step 3 of 3</Text>
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
      <Text style={styles.percent}>100%</Text>

      <View style={styles.photoBlock}>
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
        <Text style={styles.copy}>
          This is optional. You can skip and add it later.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title={saving ? 'CREATING...' : 'CREATE PROFILE'}
          onPress={submit}
          disabled={saving}
        />
        <View style={styles.gap} />
        <OutlineButton
          title="SKIP FOR NOW"
          onPress={submit}
        />
      </View>
    </ScreenLayout>
  );
};

export default SignupPhotoScreen;

const styles = StyleSheet.create({
  step: {color: Colors.leafGreen, fontWeight: '700', marginBottom: 8},
  track: {
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  fill: {width: '100%', height: 10, backgroundColor: Colors.templeGold},
  percent: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  photoBlock: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: 18,
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
    backgroundColor: Colors.white,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginBottom: 8,
  },
  copy: {
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  actions: {
    marginTop: 32,
    marginBottom: 28,
  },
  gap: {height: 14},
});
