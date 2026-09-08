import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_ORDERS, AdminOrder} from './adminData';

const statusTone = (status: AdminOrder['status']) => {
  if (status === 'Delivered') {
    return {border: Colors.leafGreen, text: Colors.leafGreen};
  }
  return {border: Colors.sacredBrown, text: Colors.sacredBrown};
};

const AdminOrdersScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <AdminScreenLayout title="Order Management" tab="AdminOrders">
      <Text style={styles.heading}>Order Management</Text>
      <Text style={styles.sub}>Manage customer orders.</Text>

      {ADMIN_ORDERS.map(order => {
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
