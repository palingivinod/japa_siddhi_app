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
          mobile: row.mobile || '',
          utr: row.utr || '',
          stage: row.stage || 'Pending verification',
          status:
            row.status === 'Inactive'
              ? 'Inactive'
              : row.status === 'Pending'
                ? 'Pending'
                : 'Active',
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

  const updateEnrollment = async (
    item: AdminHomamItem,
    action: 'verify' | 'reject',
  ) => {
    setBusyId(item.id);
    try {
      const response = await apiService.put(
        `/admin/homam-enrollments/${item.id}`,
        {
          action,
          active: action === 'verify',
          status: action === 'verify' ? 'Active' : 'Inactive',
        },
      );
      const updated = response.data?.data;
      setItems(prev =>
        prev.map(row =>
          row.id === item.id
            ? {
                ...row,
                status:
                  updated?.status === 'Inactive'
                    ? 'Inactive'
                    : updated?.status === 'Pending'
                      ? 'Pending'
                      : 'Active',
                stage:
                  updated?.stage ||
                  (action === 'verify' ? 'Verified' : 'Inactive'),
                utr: updated?.utr || row.utr,
                mobile: updated?.mobile || row.mobile,
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
        Check the UTR in your UPI/bank app, then tap Verify Payment. Reject if
        the UTR is missing or invalid.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && items.length === 0 ? (
        <Text style={styles.empty}>
          No enrollments yet. Users appear here after they submit UTR.
        </Text>
      ) : null}

      {items.map(item => {
        const busy = busyId === item.id;
        return (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.code}</Text>
            <Text style={styles.meta}>
              {item.name}
              {item.mobile ? ` • ${item.mobile}` : ''}
            </Text>
            <Text style={styles.meta}>Status: {item.stage}</Text>
            <Text style={styles.utr}>
              UTR: {item.utr || 'Not provided'}
            </Text>
            <View style={styles.actions}>
              {item.status !== 'Active' ? (
                <TouchableOpacity
                  style={[styles.pill, styles.pillOn]}
                  onPress={() => updateEnrollment(item, 'verify')}
                  disabled={busy}>
                  <Text style={[styles.pillText, styles.pillTextOn]}>
                    {busy ? '...' : 'Verify Payment'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.pill, styles.pillOn]}>
                  <Text style={[styles.pillText, styles.pillTextOn]}>
                    Active
                  </Text>
                </View>
              )}
              {item.status !== 'Inactive' ? (
                <TouchableOpacity
                  style={[styles.pill, styles.pillOff]}
                  onPress={() => updateEnrollment(item, 'reject')}
                  disabled={busy}>
                  <Text style={[styles.pillText, styles.pillTextOff]}>
                    {busy ? '...' : 'Reject'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  utr: {
    marginTop: 8,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 120,
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 6,
  },
  pillOn: {borderColor: Colors.leafGreen},
  pillOff: {borderColor: Colors.error},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: Colors.error},
});
