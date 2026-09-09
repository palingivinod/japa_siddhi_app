import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {io, Socket} from 'socket.io-client';

import Colors from '../../theme/colors';
import ENV from '../../env';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminBaanalingamItem, AdminBaanalingamStatus} from './adminData';

const nextStatus = (
  status: AdminBaanalingamStatus,
): AdminBaanalingamStatus => {
  if (status === 'Pending') {
    return 'Sent';
  }
  if (status === 'Sent') {
    return 'Delivered';
  }
  return 'Pending';
};

const statusTone = (status: AdminBaanalingamStatus) => {
  if (status === 'Pending') {
    return {border: Colors.templeGold, text: Colors.templeGold};
  }
  if (status === 'Sent') {
    return {border: Colors.sacredBrown, text: Colors.sacredBrown};
  }
  return {border: Colors.leafGreen, text: Colors.leafGreen};
};

const socketOrigin = String(ENV.API_URL).replace(/\/api\/v1\/?$/, '');

const AdminBaanalingamScreen = () => {
  const [items, setItems] = useState<AdminBaanalingamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiService.get('/admin/baanalingam');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setItems(
        rows.map((row: any) => ({
          id: String(row.id),
          code: row.code || `BP${row.id}`,
          name: row.name || 'Devotee',
          status:
            row.status === 'Sent' || row.status === 'Delivered'
              ? row.status
              : 'Pending',
        })),
      );
    } catch (err) {
      setItems([]);
      Alert.alert(
        'Error',
        getApiError(err, 'Could not load Baanalingam applications.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  useEffect(() => {
    let socket: Socket | null = null;
    try {
      socket = io(socketOrigin, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
      });
      socket.on('connect', () => setLive(true));
      socket.on('disconnect', () => setLive(false));
      socket.on('baanalingamUpdated', () => {
        load();
      });
    } catch {
      setLive(false);
    }
    return () => {
      socket?.disconnect();
    };
  }, [load]);

  const cycle = async (item: AdminBaanalingamItem) => {
    const status = nextStatus(item.status);
    setBusyId(item.id);
    try {
      const response = await apiService.put(
        `/admin/baanalingam/${item.id}/status`,
        {status},
      );
      const updated = response.data?.data;
      setItems(prev =>
        prev.map(row =>
          row.id === item.id
            ? {
                ...row,
                status:
                  updated?.status === 'Sent' || updated?.status === 'Delivered'
                    ? updated.status
                    : status === 'Pending'
                      ? 'Pending'
                      : status,
              }
            : row,
        ),
      );
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update status.'),
      );
    } finally {
      setBusyId('');
    }
  };

  return (
    <AdminScreenLayout
      title="Baanalingam Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Baanalingam Management</Text>
      <Text style={styles.sub}>
        Live applications from users. Tap status to cycle Pending → Sent →
        Delivered.
        {live ? ' • Live' : ''}
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && items.length === 0 ? (
        <Text style={styles.empty}>
          No applications yet. New user applications appear here automatically.
        </Text>
      ) : null}

      {items.map(item => {
        const tone = statusTone(item.status);
        const busy = busyId === item.id;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.code}</Text>
              <Text style={styles.meta}>{item.name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, {borderColor: tone.border}]}
              onPress={() => cycle(item)}
              disabled={busy}>
              <Text style={[styles.pillText, {color: tone.text}]}>
                {busy ? '...' : item.status}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminBaanalingamScreen;

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
  pillText: {fontWeight: '800', fontSize: 13},
});
