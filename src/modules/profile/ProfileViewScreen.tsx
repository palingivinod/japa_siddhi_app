import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import ProfileApi from '../auth/services/profileApi';
import {useLanguage} from '../../i18n/LanguageContext';
import {getStoredUser, updateStoredUser} from '../../services/session';
import {logoutToLogin} from '../../services/logout';
import apiService, {getApiError, isAuthError} from '../../services/apiService';
import {
  pickProfilePhoto,
  resolveMediaUrl,
} from '../../services/profilePhoto';
import AppIcon from '../../components/icons/AppIcon';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';
import MenuCard from '../common/MenuCard';

const ProfileViewScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [achievedMilestone, setAchievedMilestone] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

  const logout = async () => {
    await logoutToLogin(navigation);
  };

  const applyProfile = (data: any, stored?: any) => ({
    fullName:
      data?.fullName ||
      stored?.fullName ||
      stored?.full_name ||
      t('devotee'),
    mobileNumber:
      data?.mobileNumber ||
      stored?.mobileNumber ||
      stored?.mobile_number ||
      '',
    email: data?.email || stored?.email || '',
    cityName: data?.cityName || stored?.cityName || stored?.city_name || '',
    stateName: data?.stateName || stored?.stateName || stored?.state_name || '',
    countryName:
      data?.countryName || stored?.countryName || stored?.country_name || '',
    preferredLanguageName:
      data?.preferredLanguageName ||
      stored?.preferredLanguageName ||
      stored?.preferred_language_name ||
      '',
    maritalStatus:
      data?.maritalStatus ||
      stored?.maritalStatus ||
      stored?.marital_status ||
      '',
    gothram: data?.gothram || stored?.gothram || '',
    nakshatram: data?.nakshatram || stored?.nakshatram || '',
    profilePhoto:
      data?.profilePhoto ||
      stored?.profilePhoto ||
      stored?.profile_photo ||
      stored?.profileImage ||
      null,
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    setRawError(null);
    const stored = await getStoredUser();
    if (stored) {
      setProfile(applyProfile(null, stored));
    }

    try {
      const [data, milestoneRes] = await Promise.all([
        ProfileApi.getProfile(),
        apiService.get('/japa/milestones').catch(() => null),
      ]);
      const milestone = milestoneRes?.data?.data;
      if (milestone?.latestTitle) {
        setAchievedMilestone(String(milestone.latestTitle));
      } else if (milestone?.allComplete && milestone?.nextTitle) {
        setAchievedMilestone(String(milestone.nextTitle));
      } else {
        setAchievedMilestone(null);
      }
      if (data) {
        setProfile(applyProfile(data, stored));
        await updateStoredUser(data);
        return;
      }
      if (!stored) {
        throw new Error('Profile not found');
      }
    } catch (err: any) {
      if (isAuthError(err)) {
        setRawError(err);
        setError(getApiError(err, t('pleaseLoginAgain')));
        return;
      }
      if (!stored) {
        setProfile({fullName: t('devotee')});
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  const changePhoto = async () => {
    if (uploading) {
      return;
    }
    try {
      const picked = await pickProfilePhoto({
        title: t('changePhoto'),
        camera: t('photoFromCamera'),
        gallery: t('photoFromGallery'),
        cancel: t('cancel'),
      });
      if (!picked) {
        return;
      }
      setUploading(true);
      setProfile((prev: any) => ({
        ...(prev || {}),
        profilePhoto: picked.uri,
      }));
      const updated = await ProfileApi.uploadPhoto(picked);
      if (updated) {
        setProfile((prev: any) => applyProfile(updated, prev));
        await updateStoredUser(updated);
      }
    } catch (err: any) {
      const code = String(err?.message || '');
      if (code === 'permission') {
        Alert.alert(t('changePhoto'), t('photoPermissionDenied'));
      } else if (code === 'camera_unavailable') {
        Alert.alert(t('changePhoto'), t('cameraUnavailable'));
      } else if (code === 'native_module_missing') {
        Alert.alert(t('changePhoto'), t('photoPickerNeedsRebuild'));
      } else {
        Alert.alert(
          t('changePhoto'),
          getApiError(err, t('photoUpdateFailed')),
        );
      }
      loadProfile();
    } finally {
      setUploading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const photoUri = resolveMediaUrl(profile?.profilePhoto);

  return (
    <ScreenLayout title="My Profile" tab="Profile">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={loadProfile} />
      ) : null}
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={changePhoto}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={t('changePhoto')}>
        <View style={styles.avatar}>
          {photoUri ? (
            <Image source={{uri: photoUri}} style={styles.avatarImage} />
          ) : (
            <Image
              source={require('../../assets/images/profile.webp')}
              style={styles.avatarImage}
            />
          )}
          {uploading ? (
            <View style={styles.avatarBusy}>
              <ActivityIndicator color={Colors.white} />
            </View>
          ) : null}
        </View>
        <View style={styles.cameraBadge}>
          <AppIcon name="camera" size={14} color={Colors.sacredBrown} />
        </View>
      </TouchableOpacity>
      <Text style={styles.name}>{profile?.fullName || t('devoteeName')}</Text>
      {achievedMilestone ? (
        <View style={styles.milestoneBadge}>
          <Text style={styles.milestoneLabel}>{t('achievedMilestone')}</Text>
          <Text style={styles.milestoneValue}>{achievedMilestone}</Text>
        </View>
      ) : null}
      <MenuCard
        icon="personalProfile"
        title={t('personalProfile')}
        onPress={() => navigation.navigate('PersonalDetails', {profile})}
      />
      <MenuCard
        icon="notificationsPhoto"
        title={t('notifications')}
        onPress={() => navigation.navigate('Notifications')}
      />
      <MenuCard
        icon="orderHistory"
        title={t('orderHistory')}
        onPress={() => navigation.navigate('Orders')}
      />
      <MenuCard
        icon="feedback"
        title={t('feedback')}
        onPress={() => navigation.navigate('Feedback')}
      />
      <MenuCard
        icon="settingsPhoto"
        title={t('settings')}
        onPress={() => navigation.navigate('Settings')}
      />
      <MenuCard icon="logoutDoor" title={t('logout')} onPress={logout} />
    </ScreenLayout>
  );
};

export default ProfileViewScreen;

const styles = StyleSheet.create({
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
  },
  name: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 10,
    includeFontPadding: true,
  },
  milestoneBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.iconBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 18,
    alignItems: 'center',
    minWidth: 180,
  },
  milestoneLabel: {
    color: Colors.leafGreen,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  milestoneValue: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});
