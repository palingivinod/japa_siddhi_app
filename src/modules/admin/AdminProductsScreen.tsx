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

type SevaOffering = {
  key: string;
  name: string;
  inStock: boolean;
};

const AdminProductsScreen = () => {
  const [sevaOfferings, setSevaOfferings] = useState<SevaOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sevaRes = await apiService.get('/admin/seva-offerings-stock');
      const sevaRows = Array.isArray(sevaRes?.data?.data)
        ? sevaRes.data.data
        : [];
      setSevaOfferings(
        sevaRows.map((row: any) => ({
          key: String(row.key || ''),
          name: String(row.name || row.key || ''),
          inStock: row.inStock !== false,
        })),
      );
    } catch (err) {
      setSevaOfferings([]);
      Alert.alert(
        'Seva Hub Stock',
        getApiError(err, 'Could not load seva offerings.'),
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

  const toggleSevaStock = async (item: SevaOffering) => {
    const nextInStock = !item.inStock;
    setBusyId(item.key);
    try {
      await apiService.put(`/admin/seva-offerings-stock/${item.key}`, {
        inStock: nextInStock,
      });
      setSevaOfferings(current =>
        current.map(row =>
          row.key === item.key ? {...row, inStock: nextInStock} : row,
        ),
      );
    } catch (err) {
      Alert.alert(
        'Seva stock',
        getApiError(err, 'Could not update seva offering stock.'),
      );
    } finally {
      setBusyId('');
    }
  };

  return (
    <AdminScreenLayout title="Seva Hub Stock" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Seva Hub Stock</Text>
      <Text style={styles.sub}>
        Mark Seva Hub offerings In Stock or Out of Stock for devotees. Rewards
        are managed under Configure Rewards.
      </Text>

      <Text style={styles.section}>Seva Hub offerings</Text>
      <Text style={styles.hint}>
        Mark Baanalingam, Ramakoti Books, Siva Koti Books, Homa Bhasmam, Pooja
        Bhasmam, and Bhirava Pendant Out of Stock. Users still see the tab title
        with “Out of Stock” under it; tap shows a popup and does not open the
        form.
      </Text>

      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}

      {!loading && sevaOfferings.length === 0 ? (
        <Text style={styles.empty}>No seva offerings found.</Text>
      ) : null}

      {sevaOfferings.map(item => {
        const inStock = item.inStock;
        return (
          <View key={item.key} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text
                style={[
                  styles.meta,
                  inStock ? styles.metaOn : styles.metaOff,
                ]}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, inStock ? styles.pillOn : styles.pillOff]}
              onPress={() => toggleSevaStock(item)}
              disabled={busyId === item.key}>
              <Text
                style={[
                  styles.pillText,
                  inStock ? styles.pillTextOn : styles.pillTextOff,
                ]}>
                {busyId === item.key
                  ? '...'
                  : inStock
                    ? 'Mark Out of Stock'
                    : 'Mark In Stock'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminProductsScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  sub: {
    color: Colors.textSecondary,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 4,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copy: {flex: 1},
  name: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  metaOn: {color: Colors.leafGreen},
  metaOff: {color: '#B45309'},
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pillOn: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.leafGreen,
  },
  pillOff: {
    backgroundColor: '#FCE7F3',
    borderColor: '#DB2777',
  },
  pillText: {fontWeight: '700', fontSize: 12},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: '#BE185D'},
  empty: {
    color: Colors.textSecondary,
    marginBottom: 12,
    fontSize: 13,
  },
});
