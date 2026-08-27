import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '../../theme/colors';
import {APP_LANGUAGES, getLanguage} from '../../services/language';
import ScreenLayout from '../common/ScreenLayout';
import ProfileApi from '../auth/services/profileApi';
import {logoutToLogin} from '../../services/logout';
import apiService, {getApiError} from '../../services/apiService';

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const [language, setLanguage] = useState('English');
  const [notifications, setNotifications] = useState('On');
  const [autoLock, setAutoLock] = useState('On');

  useFocusEffect(
    React.useCallback(() => {
      getLanguage().then(code => {
        const match = APP_LANGUAGES.find(item => item.code === code);
        setLanguage(match?.name || 'English');
      });
      AsyncStorage.getItem('notify_on').then(value => {
        if (value) {
          setNotifications(value === '1' ? 'On' : 'Off');
        }
      });
      AsyncStorage.getItem('japa_autolock').then(value => {
        if (value) {
          setAutoLock(value === '1' ? 'On' : 'Off');
        }
      });
    }, []),
  );

  const toggle = async (
    key: string,
    current: string,
    setter: (value: string) => void,
  ) => {
    const next = current === 'On' ? 'Off' : 'On';
    setter(next);
    await AsyncStorage.setItem(key, next === 'On' ? '1' : '0');
    try {
      await apiService.put('/profile/settings', {
        notificationsOn: key === 'notify_on' ? next === 'On' : notifications === 'On',
        autoLockOn: key === 'japa_autolock' ? next === 'On' : autoLock === 'On',
      });
    } catch {
      undefined;
    }
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This removes your login and personal profile. You cannot undo this.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProfileApi.deleteAccount();
              await logoutToLogin(navigation);
            } catch (err: any) {
              Alert.alert(
                'Delete failed',
                getApiError(err, 'Could not delete your account.'),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenLayout title="Settings" showBack tab="Profile">
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          navigation.navigate('LanguageSelect', {fromSettings: true})
        }>
        <Text style={styles.label}>Language</Text>
        <Text style={styles.value}>{language}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={() => toggle('notify_on', notifications, setNotifications)}>
        <Text style={styles.label}>Notifications</Text>
        <Text style={styles.value}>{notifications}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={() => toggle('japa_autolock', autoLock, setAutoLock)}>
        <Text style={styles.label}>Auto-lock during Japa</Text>
        <Text style={styles.value}>{autoLock}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('PrivacyPolicy')}>
        <Text style={styles.label}>Privacy</Text>
        <Text style={styles.value}>Manage</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('CustomerCare')}>
        <Text style={styles.label}>Help & Support</Text>
        <Text style={styles.value}>Open</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('SpiritualDetails')}>
        <Text style={styles.label}>Spiritual details</Text>
        <Text style={styles.value}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('AnalyticsHub')}>
        <Text style={styles.label}>Japa analytics</Text>
        <Text style={styles.value}>Open</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.delete} onPress={deleteAccount}>
        <Text style={styles.deleteText}>Delete account</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {fontSize: 16, fontWeight: '700', color: Colors.sacredBrown, flex: 1},
  value: {color: Colors.leafGreen, fontWeight: '700'},
  delete: {
    marginTop: 16,
    backgroundColor: Colors.error,
    borderRadius: 30,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {color: Colors.white, fontWeight: '800'},
});
