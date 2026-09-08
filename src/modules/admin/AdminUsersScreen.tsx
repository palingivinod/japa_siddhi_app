import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_USERS, AdminUser} from './adminData';

const StatusPill = ({status}: {status: AdminUser['status']}) => {
  const blocked = status === 'Blocked';
  return (
    <View
      style={[
        styles.pill,
        blocked ? styles.pillBlocked : styles.pillActive,
      ]}>
      <Text
        style={[
          styles.pillText,
          blocked ? styles.pillTextBlocked : styles.pillTextActive,
        ]}>
        {status}
      </Text>
    </View>
  );
};

const AdminUsersScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <AdminScreenLayout title="User Management" tab="AdminUsers">
      <Text style={styles.heading}>User Management</Text>
      <Text style={styles.sub}>Manage registered users.</Text>

      {ADMIN_USERS.map(user => (
        <TouchableOpacity
          key={user.id}
          style={styles.card}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('AdminUserDetails', {userId: user.id})
          }>
          <View style={styles.copy}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.meta}>
              {user.japaCount.toLocaleString('en-IN')} Japa
            </Text>
          </View>
          <StatusPill status={user.status} />
        </TouchableOpacity>
      ))}
    </AdminScreenLayout>
  );
};

export default AdminUsersScreen;

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
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillActive: {
    borderColor: Colors.leafGreen,
  },
  pillBlocked: {
    borderColor: Colors.error,
  },
  pillText: {
    fontWeight: '800',
    fontSize: 13,
  },
  pillTextActive: {
    color: Colors.leafGreen,
  },
  pillTextBlocked: {
    color: Colors.error,
  },
});
