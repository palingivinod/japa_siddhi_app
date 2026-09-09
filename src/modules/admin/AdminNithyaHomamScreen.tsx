import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminHomamItem} from './adminData';

const AdminNithyaHomamScreen = () => {
  const [items, setItems] = useState<AdminHomamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/homam-enrollments');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setItems(
        rows.map((row: any) => ({
          id: String(row.id),
          code: row.code || `NH${row.id}`,
          name: row.name || 'Devotee',
          stage: row.stage || 'Enrolled',
          status: row.status === 'Inactive' ? 'Inactive' : 'Active',
        })),
      );
    } catch (err) {
      setItems([]);
      Alert.alert(
        'Error',
        getApiError(err, 'Could not load Homam enrollments.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = async (item: AdminHomamItem) => {
    const nextActive = item.status !== 'Active';
    setBusyId(item.id);
    try {
      const response = await apiService.put(
        `/admin/homam-enrollments/${item.id}`,
        {
          active: nextActive,
          status: nextActive ? 'Active' : 'Inactive',
        },
      );
      const updated = response.data?.data;
      setItems(prev =>
        prev.map(row =>
          row.id === item.id
            ? {
                ...row,
                status: updated?.status === 'Inactive' ? 'Inactive' : 'Active',
                stage: updated?.stage || (nextActive ? 'Paid' : 'Inactive'),
              }
            : row,
        ),
      );
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update enrollment status.'),
      );
    } finally {
      setBusyId('');
    }
  };

  return (
    <AdminScreenLayout
      title="Nithya Homam Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Nithya Homam Management</Text>
      <Text style={styles.sub}>
        Shows only users who enrolled. Tap Active/Inactive to update status.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && items.length === 0 ? (
        <Text style={styles.empty}>
          No enrollments yet. Users appear here after they enroll and pay.
        </Text>
      ) : null}

      {items.map(item => {
        const active = item.status === 'Active';
        const busy = busyId === item.id;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.code}</Text>
              <Text style={styles.meta}>
                {item.name} • {item.stage}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, active ? styles.pillOn : styles.pillOff]}
              onPress={() => toggle(item)}
              disabled={busy}>
              <Text
                style={[
                  styles.pillText,
                  active ? styles.pillTextOn : styles.pillTextOff,
                ]}>
                {busy ? '...' : item.status}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminNithyaHomamScreen;

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
  centerBox: {paddingVertical: 20, alignItems: 'center'},
  empty: {color: Colors.textSecondary, marginBottom: 12, fontWeight: '600'},
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
    minWidth: 88,
    alignItems: 'center',
  },
  pillOn: {borderColor: Colors.leafGreen},
  pillOff: {borderColor: Colors.error},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: Colors.error},
});
