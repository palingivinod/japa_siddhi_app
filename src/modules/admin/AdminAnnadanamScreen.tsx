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
import {AdminAnnadanamItem} from './adminData';

const AdminAnnadanamScreen = () => {
  const [items, setItems] = useState<AdminAnnadanamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/annadanam-features');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setItems(
        rows.map((row: any) => ({
          id: String(row.id),
          title: row.title || '',
          subtitle: row.subtitle || '',
          active: Boolean(row.active),
        })),
      );
    } catch (err) {
      setItems([]);
      Alert.alert(
        'Error',
        getApiError(err, 'Could not load Annadanam features.'),
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

  const toggle = async (item: AdminAnnadanamItem) => {
    const nextActive = !item.active;
    setBusyId(item.id);
    try {
      await apiService.put(`/admin/annadanam-features/${item.id}`, {
        active: nextActive,
      });
      setItems(prev =>
        prev.map(row =>
          row.id === item.id ? {...row, active: nextActive} : row,
        ),
      );
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update feature status.'),
      );
    } finally {
      setBusyId('');
    }
  };

  return (
    <AdminScreenLayout
      title="Annadanam Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Annadanam Management</Text>
      <Text style={styles.sub}>
        Active items appear for users. Inactive items are hidden.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {items.map(item => {
        const busy = busyId === item.id;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{item.subtitle}</Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, item.active ? styles.pillOn : styles.pillOff]}
              onPress={() => toggle(item)}
              disabled={busy}>
              <Text
                style={[
                  styles.pillText,
                  item.active ? styles.pillTextOn : styles.pillTextOff,
                ]}>
                {busy ? '...' : item.active ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminAnnadanamScreen;

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
