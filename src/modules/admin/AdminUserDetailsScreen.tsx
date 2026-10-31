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

type UserDetail = {
  id: string;
  userCode?: string;
  name: string;
  japaCount: number;
  status: 'Active' | 'Blocked';
  mobile: string;
  email?: string;
  appVersion?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  postalCode?: string;
  region?: string;
  stateName?: string;
  cityName?: string;
  maritalStatus?: string;
  spouseName?: string;
  spouseDob?: string;
  anniversaryDate?: string;
  gothram?: string;
  nakshatram?: string;
};

const Row = ({label, value}: {label: string; value?: string | number | null}) => {
  const text =
    value === undefined || value === null || String(value).trim() === ''
      ? '—'
      : String(value);
  return (
    <Text style={styles.row}>
      {label}: {text}
    </Text>
  );
};

const AdminUserDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId = String(route.params?.userId || '');
  const [user, setUser] = useState<UserDetail | null>(null);
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
      const data = response.data?.data || {};
      const id = String(data.id);
      setUser({
        id,
        userCode:
          String(data.userCode || '').trim() ||
          `BPJS${id.padStart(2, '0')}`,
        name: data.name || 'Devotee',
        japaCount: Number(data.japaCount) || 0,
        status: data.status === 'Blocked' ? 'Blocked' : 'Active',
        mobile: data.mobile || '—',
        email: data.email || '',
        appVersion: String(data.appVersion || '').trim(),
        gender: data.gender || '',
        dateOfBirth: data.dateOfBirth || '',
        address: data.address || '',
        postalCode: data.postalCode || '',
        region: data.region || '',
        stateName: data.stateName || '',
        cityName: data.cityName || '',
        maritalStatus: data.maritalStatus || '',
        spouseName: data.spouseName || '',
        spouseDob: data.spouseDob || '',
        anniversaryDate: data.anniversaryDate || '',
        gothram: data.gothram || '',
        nakshatram: data.nakshatram || '',
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
            <Text style={styles.cardTitle}>Account</Text>
            <Row label="User ID" value={user.userCode || user.id} />
            <Row label="Mobile" value={user.mobile} />
            <Row label="Email" value={user.email} />
            <Row
              label="Japa completed"
              value={user.japaCount.toLocaleString('en-IN')}
            />
            <Row
              label="App version"
              value={user.appVersion || 'Not opened yet'}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal</Text>
            <Row label="Gender" value={user.gender} />
            <Row label="Date of birth" value={user.dateOfBirth} />
            <Row label="Marital status" value={user.maritalStatus} />
            <Row label="Spouse name" value={user.spouseName} />
            <Row label="Spouse DOB" value={user.spouseDob} />
            <Row label="Anniversary" value={user.anniversaryDate} />
            <Row label="Gothram" value={user.gothram} />
            <Row label="Nakshatram" value={user.nakshatram} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Address</Text>
            <Row label="Address" value={user.address} />
            <Row label="Pincode" value={user.postalCode} />
            <Row label="Region" value={user.region} />
            <Row label="City" value={user.cityName} />
            <Row label="State" value={user.stateName} />
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
    marginBottom: 14,
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
