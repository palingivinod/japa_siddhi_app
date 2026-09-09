import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminMantra} from './adminData';

const AdminMantrasScreen = () => {
  const navigation = useNavigation<any>();
  const [mantras, setMantras] = useState<AdminMantra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMantras = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/mantras');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setMantras(
        rows.map((row: any) => ({
          id: String(row.id),
          name: row.name || '',
          subtitle: row.subtitle || 'Community mantra',
          active: Boolean(row.active),
          target: Number(row.target) || 108,
        })),
      );
    } catch (err) {
      setMantras([]);
      setError(getApiError(err, 'Could not load mantras.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMantras();
    }, [loadMantras]),
  );

  const confirmDelete = (item: AdminMantra) => {
    Alert.alert(
      'Delete mantra',
      `Permanently remove "${item.name}"? It will disappear for users and from this admin list.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/admin/mantras/${item.id}`);
              setMantras(current => current.filter(row => row.id !== item.id));
              await loadMantras();
            } catch (err) {
              Alert.alert(
                'Delete failed',
                getApiError(err, 'Could not delete mantra.'),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <AdminScreenLayout title="Mantra Management" tab="AdminJapa" showBack>
      <Text style={styles.heading}>Mantra Management</Text>
      <Text style={styles.sub}>Create, edit or delete community mantras.</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadMantras}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && !error && mantras.length === 0 ? (
        <Text style={styles.empty}>No mantras yet. Create one below.</Text>
      ) : null}

      {mantras.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.copy}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              Target {(item.target ?? 108).toLocaleString('en-IN')}
              {item.active ? '' : ' • Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              navigation.navigate('AdminMantraEdit', {mantraId: item.id})
            }>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => confirmDelete(item)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ))}

      <PrimaryButton
        title="CREATE MANTRA"
        onPress={() => navigation.navigate('AdminMantraEdit', {})}
      />
    </AdminScreenLayout>
  );
};

export default AdminMantrasScreen;

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
  centerBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    color: Colors.textSecondary,
    marginBottom: 12,
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
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1, paddingRight: 8},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  editBtn: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 6,
  },
  editText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  deleteBtn: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  deleteText: {
    color: Colors.error,
    fontWeight: '800',
  },
});
