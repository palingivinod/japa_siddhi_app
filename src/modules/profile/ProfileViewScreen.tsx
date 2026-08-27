import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import {logoutToLogin} from '../../services/logout';
import {getApiError, isAuthError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';
import MenuCard from '../common/MenuCard';

const ProfileViewScreen = () => {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

  const logout = async () => {
    await logoutToLogin(navigation);
  };

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    setRawError(null);
    const stored = await getStoredUser();
    if (stored) {
      setProfile({
        fullName: stored.fullName || stored.full_name || 'Devotee',
        mobileNumber: stored.mobileNumber || stored.mobile_number || '',
        email: stored.email || '',
        cityName: stored.cityName || stored.city_name || '',
        stateName: stored.stateName || stored.state_name || '',
        countryName: stored.countryName || stored.country_name || '',
        preferredLanguageName:
          stored.preferredLanguageName || stored.preferred_language_name || '',
        maritalStatus: stored.maritalStatus || stored.marital_status || '',
        gothram: stored.gothram || '',
        nakshatram: stored.nakshatram || '',
      });
    }

    try {
      const data = await ProfileApi.getProfile();
      if (data) {
        setProfile(data);
        return;
      }
      if (!stored) {
        throw new Error('Profile not found');
      }
    } catch (err: any) {
      if (isAuthError(err)) {
        setRawError(err);
        setError(getApiError(err, 'Please login again to load this page.'));
        return;
      }
      if (!stored) {
        setProfile({fullName: 'Devotee'});
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <ScreenLayout title="My Profile" tab="Profile">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={loadProfile} />
      ) : null}
      <View style={styles.avatar}>
        <Text style={styles.face}>☺</Text>
      </View>
      <Text style={styles.name}>{profile?.fullName || 'Devotee Name'}</Text>
      <MenuCard
        title="Personal Details"
        onPress={() => navigation.navigate('PersonalDetails', {profile})}
      />
      <MenuCard
        title="Spiritual Details"
        onPress={() => navigation.navigate('SpiritualDetails', {profile})}
      />
      <MenuCard
        title="Order History"
        onPress={() => navigation.navigate('Orders')}
      />
      <MenuCard
        title="Notifications"
        onPress={() => navigation.navigate('Notifications')}
      />
      <MenuCard
        title="Feedback"
        onPress={() => navigation.navigate('Feedback')}
      />
      <MenuCard
        title="Settings"
        onPress={() => navigation.navigate('Settings')}
      />
      <MenuCard title="Logout" onPress={logout} />
    </ScreenLayout>
  );
};

export default ProfileViewScreen;

const styles = StyleSheet.create({
  avatar: {
    alignSelf: 'center',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  face: {
    fontSize: 42,
    color: Colors.sacredBrown,
  },
  name: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 18,
  },
});
