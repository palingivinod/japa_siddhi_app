import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {clearAdminSession} from './adminSession';
import {resetAdminAuthGate} from './AdminAuthGate';

type MoreLink = {
  title: string;
  route: string;
  sub: string;
  params?: Record<string, string>;
};

const MORE_LINKS: MoreLink[] = [
  {
    title: 'Anna Santharpana',
    route: 'AdminSevaDetailList',
    params: {type: 'ANNADANAM', title: 'Anna Santharpana'},
    sub: 'Food offering bookings & prefer dates',
  },
  {
    title: 'Nithya Homam',
    route: 'AdminSevaDetailList',
    params: {type: 'NITHYA_HOMAM', title: 'Nithya Homam'},
    sub: 'Homam offerings, gotram & prefer dates',
  },
  {
    title: 'Add Admin',
    route: 'AdminAccounts',
    sub: 'Create login credentials for another admin',
  },
  {
    title: 'User Reports',
    route: 'AdminUsers',
    sub: 'Users and demographics',
  },
  {
    title: 'Japa Reports',
    route: 'AdminJapaAnalytics',
    sub: 'Japa counts by mantra and period',
  },
  {
    title: 'Challenge Reports',
    route: 'AdminChallenges',
    sub: 'Joined, completed, progress & Excel',
  },
  {
    title: 'DOB / other details',
    route: 'AdminDobDetails',
    sub: 'Birthdays and occasions',
  },
  {
    title: 'Rewards Reports',
    route: 'AdminRewards',
    sub: 'Rewards catalog and Excel',
  },
  {
    title: 'Region analytics',
    route: 'AdminRegionAnalytics',
    sub: 'People, japa count, and mantras by place',
  },
];

const AdminMoreScreen = () => {
  const navigation = useNavigation<any>();

  const logout = () => {
    Alert.alert(
      'Sign Out',
      'Do you really want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            resetAdminAuthGate();
            await clearAdminSession();
            navigation.reset({
              index: 0,
              routes: [{name: 'Login', params: {forceLoginForm: true}}],
            });
          },
        },
      ],
    );
  };

  return (
    <AdminScreenLayout title="More" tab="AdminMore" showBack={false}>
      <Text style={styles.heading}>More</Text>
      <Text style={styles.sub}>Admin tools and account.</Text>

      {MORE_LINKS.map(item => (
        <TouchableOpacity
          key={`${item.route}-${item.title}`}
          style={styles.row}
          activeOpacity={0.85}
          onPress={() =>
            item.params
              ? navigation.navigate(item.route, item.params)
              : navigation.navigate(item.route)
          }>
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
    fontWeight: '600',
    fontSize: 13,
  },
  open: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  logout: {
    color: Colors.error,
  },
});
