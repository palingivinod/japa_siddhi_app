import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {clearAdminSession} from './adminSession';

const AdminMoreScreen = () => {
  const navigation = useNavigation<any>();

  const logout = async () => {
    await clearAdminSession();
    navigation.replace('AdminLogin');
  };

  return (
    <AdminScreenLayout title="More" tab="AdminMore">
      <Text style={styles.heading}>More</Text>
      <Text style={styles.sub}>Admin tools and account.</Text>

      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          Alert.alert('Coming soon', 'More admin tools in later frame batches.')
        }>
        <Text style={styles.rowText}>Admin settings</Text>
      </TouchableOpacity>

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
  },
  rowText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  logout: {
    color: Colors.error,
  },
});
