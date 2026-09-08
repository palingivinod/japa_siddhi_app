import React, {useMemo} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';
import {findAdminUser} from './adminData';

const AdminUserDetailsScreen = () => {
  const route = useRoute<any>();
  const user = useMemo(
    () => findAdminUser(route.params?.userId),
    [route.params?.userId],
  );

  return (
    <AdminScreenLayout title="User Details" tab="AdminUsers" showBack>
      <Text style={styles.heading}>User Details</Text>
      <Text style={styles.sub}>
        {user.name} • {user.status}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <Text style={styles.row}>Mobile: {user.mobile}</Text>
        <Text style={styles.row}>
          Japa completed: {user.japaCount.toLocaleString('en-IN')}
        </Text>
      </View>

      <PrimaryButton
        title="EDIT USER"
        onPress={() =>
          Alert.alert('Edit user', 'Edit form will be added in a later batch.')
        }
      />
    </AdminScreenLayout>
  );
};

export default AdminUserDetailsScreen;

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
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 15,
  },
});
