import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminOrder, AdminOrderStatus} from './adminData';

const CYCLE: AdminOrderStatus[] = ['Processing', 'Shipped', 'Delivered'];

const AdminOrderDetailsScreen = () => {
  const route = useRoute<any>();
  const orderId = String(route.params?.orderId || '');
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError('Missing order id.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get(`/admin/orders/${orderId}`);
      const data = response.data?.data || {};
      setOrder({
        id: String(data.id),
        orderNo: data.orderNo || `#${data.id}`,
        product: data.product || 'Item',
        customer: data.customer || 'Devotee',
        status:
          data.status === 'Delivered'
            ? 'Delivered'
            : data.status === 'Shipped'
              ? 'Shipped'
              : 'Processing',
      });
    } catch (err) {
      setOrder(null);
      setError(getApiError(err, 'Could not load order.'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder]),
  );

  const updateStatus = async () => {
    if (!order) {
      return;
    }
    const index = CYCLE.indexOf(order.status);
    const next = CYCLE[(index + 1) % CYCLE.length];
    setSaving(true);
    try {
      const response = await apiService.put(`/admin/orders/${order.id}/status`, {
        status: next,
      });
      const data = response.data?.data || {};
      setOrder(current =>
        current
          ? {
              ...current,
              status:
                data.status === 'Delivered'
                  ? 'Delivered'
                  : data.status === 'Shipped'
                    ? 'Shipped'
                    : 'Processing',
            }
          : current,
      );
      Alert.alert('Status updated', `Order is now ${next}.`);
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update order status.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenLayout title="Order Details" tab="AdminOrders" showBack>
      <Text style={styles.heading}>Order Details</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadOrder}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {order ? (
        <>
          <Text style={styles.sub}>
            Order {order.orderNo} • {order.product}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Customer</Text>
            <View style={styles.row}>
              <Text style={styles.customer}>{order.customer}</Text>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{order.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          <PrimaryButton
            title={saving ? 'UPDATING...' : 'UPDATE STATUS'}
            onPress={updateStatus}
            disabled={saving}
          />
        </>
      ) : null}
    </AdminScreenLayout>
  );
};

export default AdminOrderDetailsScreen;

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
  centerBox: {paddingVertical: 20, alignItems: 'center'},
  errorText: {color: Colors.error, marginBottom: 12, fontWeight: '600'},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 18,
  },
  cardLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customer: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
  },
});
