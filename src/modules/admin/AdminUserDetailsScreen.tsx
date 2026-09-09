import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminUser} from './adminData';

const AdminUserDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId = String(route.params?.userId || '');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUser = useCallback(async () => {
    if (!userId) {
      setError('Missing user id.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get(`/admin/users/${userId}`);
      const data = response.data?.data;
      setUser({
        id: String(data.id),
        name: data.name || 'Devotee',
        japaCount: Number(data.japaCount) || 0,
        status: data.status === 'Blocked' ? 'Blocked' : 'Active',
        mobile: data.mobile || '—',
        email: data.email || '',
        mobileCountryCode: data.mobileCountryCode || '',
        mobileNumber: data.mobileNumber || '',
      });
    } catch (err) {
      setUser(null);
      setError(getApiError(err, 'Could not load user details.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  return (
    <AdminScreenLayout title="User Details" tab="AdminUsers" showBack>
      <Text style={styles.heading}>User Details</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadUser}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {user ? (
        <>
          <Text style={styles.sub}>
            {user.name} • {user.status}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profile</Text>
            <Text style={styles.row}>Mobile: {user.mobile}</Text>
            {user.email ? (
              <Text style={styles.row}>Email: {user.email}</Text>
            ) : null}
            <Text style={styles.row}>
              Japa completed: {user.japaCount.toLocaleString('en-IN')}
            </Text>
          </View>

          <PrimaryButton
            title="EDIT USER"
            onPress={() =>
              navigation.navigate('AdminUserEdit', {userId: user.id})
            }
          />
        </>
      ) : null}
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
  centerBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
    fontWeight: '600',
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
