import React, {useState} from 'react';
import {Alert, Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import ProfileApi from './services/profileApi';
import {clearSession, saveSession} from '../../services/session';
import {pickProfilePhoto, type PickedPhoto} from '../../services/profilePhoto';
import {MOBILE_DIGITS, isMobile} from '../../utils/validators';

const toIso = (value: string) => {
  const parts = String(value || '').split(/[/-]/);
  if (parts.length === 3 && parts[0].length === 2) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return value || '';
};

const SignupPhotoScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [saving, setSaving] = useState(false);
  const [pickedPhoto, setPickedPhoto] = useState<PickedPhoto | null>(null);

  const choosePhoto = async () => {
    try {
      const picked = await pickProfilePhoto({
        title: t('profilePhoto'),
        camera: t('camera'),
        gallery: t('gallery'),
        cancel: t('cancel'),
      });
      if (!picked) {
        return;
      }
      setPickedPhoto(picked);
    } catch (error: any) {
      const code = String(error?.message || '');
      if (code === 'permission') {
        Alert.alert(t('profilePhoto'), t('allowCameraPhotoAccess'));
        return;
      }
      if (code === 'camera_unavailable') {
        Alert.alert(t('profilePhoto'), t('cameraUnavailable'));
        return;
      }
      Alert.alert(t('profilePhoto'), t('couldNotPickPhoto'));
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
    const socialProvider = String(params.authProvider || '')
      .trim()
      .toLowerCase();
    const isGoogleSignup = Boolean(
      params.isGoogleSignup ||
      socialProvider === 'google' ||
      socialProvider === 'facebook' ||
      params.firebaseToken ||
      params.firebaseUid,
    );
    const authProviderValue =
      socialProvider === 'facebook' ? 'facebook' : 'google';
    if (!isMobile(mobileNumber) || /^0+$/.test(mobileNumber)) {
      Alert.alert(
        t('mobileRequiredTitle'),
        t('goBackEnterMobile', {digits: MOBILE_DIGITS}),
      );
      return;
    }
    if (!toIso(params.dob)) {
      Alert.alert(t('required'), t('enterDateOfBirth'));
      return;
    }
    if (!isGoogleSignup && password.length < 6) {
      Alert.alert(
        t('passwordRequiredTitle'),
        t('goBackSetPassword'),
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

      // Creating an account must always create a new row. Completing the
      // profile over a leftover session rewrote that devotee's name, email
      // and mobile, locking them out and handing over their japa history.
      await clearSession().catch(() => undefined);
      const result = await ProfileApi.register({
        ...payload,
        mobileCountryCode,
        mobileNumber,
        password: password || undefined,
        firebaseToken: params.firebaseToken,
        firebaseUid: params.firebaseUid,
        authProvider: isGoogleSignup ? authProviderValue : undefined,
      });
      if (result?.data?.token) {
        await saveSession(result.data.token, result.data.user);
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
        t('couldNotCreateProfile');
      Alert.alert(
        t('registrationTitle'),
        /UNIQUE|firebase_uid/i.test(String(message))
          ? t('accountMayExist')
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('profilePhoto')} showBack>
      <Text style={styles.step}>{t('stepOf', {current: 3, total: 3})}</Text>
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
      <Text style={styles.percent}>100%</Text>

      <View style={styles.photoBlock}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={choosePhoto}
          accessibilityRole="button"
          accessibilityLabel={t('addAProfilePhotoA11y')}>
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
        <Text style={styles.title}>{t('addProfilePhoto')}</Text>
        <Text style={styles.copy}>{t('addProfilePhotoHint')}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title={saving ? t('creating') : t('createProfile')}
          onPress={submit}
          disabled={saving}
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
});
