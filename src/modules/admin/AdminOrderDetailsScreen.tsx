import React, {useMemo, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminOrderStatus, findAdminOrder} from './adminData';

const CYCLE: AdminOrderStatus[] = ['Processing', 'Shipped', 'Delivered'];

const AdminOrderDetailsScreen = () => {
  const route = useRoute<any>();
  const base = useMemo(
    () => findAdminOrder(route.params?.orderId),
    [route.params?.orderId],
  );
  const [status, setStatus] = useState<AdminOrderStatus>(base.status);

  const customerName =
    base.customer === 'Ananya'
      ? 'Ananya Rao'
      : base.customer === 'Suresh'
        ? 'Suresh Kumar'
        : base.customer;

  return (
    <AdminScreenLayout title="Order Details" tab="AdminOrders" showBack>
      <Text style={styles.heading}>Order Details</Text>
      <Text style={styles.sub}>
        Order {base.orderNo} • {base.product}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Customer</Text>
        <View style={styles.row}>
          <Text style={styles.customer}>{customerName}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <PrimaryButton
        title="UPDATE STATUS"
        onPress={() => {
          const index = CYCLE.indexOf(status);
          const next = CYCLE[(index + 1) % CYCLE.length];
          setStatus(next);
          Alert.alert('Status updated', `Order is now ${next}.`);
        }}
      />
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
