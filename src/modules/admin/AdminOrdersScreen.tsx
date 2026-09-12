import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminOrder} from './adminData';

const statusTone = (status: AdminOrder['status']) => {
  if (status === 'Delivered') {
    return {border: Colors.leafGreen, text: Colors.leafGreen};
  }
  return {border: Colors.sacredBrown, text: Colors.sacredBrown};
};

const AdminOrdersScreen = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/orders');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setOrders(
        rows.map((row: any) => ({
          id: String(row.id),
          orderNo: row.orderNo || `#${row.id}`,
          product: row.product || 'Item',
          customer: row.customer || 'Devotee',
          status:
            row.status === 'Delivered'
              ? 'Delivered'
              : row.status === 'Shipped'
                ? 'Shipped'
                : 'Processing',
        })),
      );
    } catch (err) {
      setOrders([]);
      setError(getApiError(err, 'Could not load orders.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  return (
    <AdminScreenLayout title="Order Management" tab="AdminOrders" showBack={false}>
      <Text style={styles.heading}>Order Management</Text>
      <Text style={styles.sub}>Manage devotee orders.</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadOrders}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <Text style={styles.empty}>No orders yet.</Text>
      ) : null}

      {orders.map(order => {
        const tone = statusTone(order.status);
        return (
          <TouchableOpacity
            key={order.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('AdminOrderDetails', {orderId: order.id})
            }>
            <View style={styles.copy}>
              <Text style={styles.name}>{order.orderNo}</Text>
              <Text style={styles.meta}>
                {order.product} • {order.customer}
              </Text>
            </View>
            <View style={[styles.pill, {borderColor: tone.border}]}>
              <Text style={[styles.pillText, {color: tone.text}]}>
                {order.status}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminOrdersScreen;

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
  empty: {color: Colors.textSecondary, marginBottom: 12},
  errorText: {color: Colors.error, marginBottom: 12, fontWeight: '600'},
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
  pillText: {fontWeight: '800', fontSize: 13},
});
