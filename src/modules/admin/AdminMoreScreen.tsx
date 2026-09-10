import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {clearAdminSession} from './adminSession';
import {resetAdminAuthGate} from './AdminAuthGate';

const MORE_LINKS: Array<{title: string; route: string; sub: string}> = [
  {
    title: 'Add Admin',
    route: 'AdminAccounts',
    sub: 'Create login credentials for another admin',
  },
  {
    title: 'Challenge Creation',
    route: 'AdminChallengeCreate',
    sub: 'Create a new community challenge',
  },
  {
    title: 'Challenge Management',
    route: 'AdminChallenges',
    sub: 'Track active and completed challenges',
  },
  {
    title: 'Configure Rewards',
    route: 'AdminRewards',
    sub: 'Reward choices and stock updates',
  },
  {
    title: 'Notification Management',
    route: 'AdminNotifications',
    sub: 'Create and send notifications',
  },
  {
    title: 'Banner Management',
    route: 'AdminBanners',
    sub: 'Manage banners across app modules',
  },
  {
    title: 'Product Management',
    route: 'AdminProducts',
    sub: 'Manage spiritual products and stock',
  },
  {
    title: 'Mantra Management',
    route: 'AdminMantras',
    sub: 'Create, edit or delete mantras',
  },
  {
    title: 'User Management',
    route: 'AdminUsers',
    sub: 'Manage registered users',
  },
];

const AdminMoreScreen = () => {
  const navigation = useNavigation<any>();

  const logout = async () => {
    resetAdminAuthGate();
    await clearAdminSession();
    navigation.reset({
      index: 0,
      routes: [{name: 'Login', params: {forceLoginForm: true}}],
    });
  };

  return (
    <AdminScreenLayout title="More" tab="AdminMore">
      <Text style={styles.heading}>More</Text>
      <Text style={styles.sub}>Admin tools and account.</Text>

      {MORE_LINKS.map(item => (
        <TouchableOpacity
          key={item.route}
          style={styles.row}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(item.route)}>
          <View style={styles.copy}>
            <Text style={styles.rowText}>{item.title}</Text>
            <Text style={styles.rowSub}>{item.sub}</Text>
          </View>
          <Text style={styles.open}>Open</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.row} onPress={logout}>
        <Text style={[styles.rowText, styles.logout]}>Sign out of admin</Text>
      </TouchableOpacity>
    </AdminScreenLayout>
  );
};

export default AdminMoreScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    color: Colors.textSecondary,
  },
  row: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1, paddingRight: 10},
  rowText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  rowSub: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  open: {
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  logout: {
    color: Colors.error,
  },
});
