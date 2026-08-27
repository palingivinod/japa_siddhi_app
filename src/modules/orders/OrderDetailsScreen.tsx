import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

const STEPS = ['Confirmed', 'Processing', 'Shipped', 'Delivered'];

const OrderDetailsScreen = () => {
  const route = useRoute<any>();
  const order = route.params?.order ?? {};
  const status = String(order.orderStatus || order.status || 'Processing');

  return (
    <ScreenLayout title="Order Details" showBack tab="Orders">
      <View style={styles.card}>
        <Text style={styles.name}>
          {order.orderNumber || `Order #${order.id || ''}`}
        </Text>
        <Text style={styles.meta}>
          {order.productName || order.donationType || 'Seva item'}
        </Text>
        <Text style={styles.meta}>Status: {status}</Text>
        {order.paymentStatus ? (
          <Text style={styles.meta}>Payment: {order.paymentStatus}</Text>
        ) : null}
        {order.amount ? (
          <Text style={styles.meta}>Amount: ₹{order.amount}</Text>
        ) : null}
      </View>
      <Text style={styles.track}>Tracking</Text>
      {STEPS.map((step, index) => (
        <View key={step} style={styles.step}>
          <View
            style={[
              styles.bullet,
              index === 0 && styles.bulletActive,
            ]}
          />
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </ScreenLayout>
  );
};

export default OrderDetailsScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 18,
  },
  name: {fontSize: 18, fontWeight: '800', color: Colors.sacredBrown},
  meta: {marginTop: 8, color: Colors.textSecondary},
  track: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.leafGreen,
    marginBottom: 10,
  },
  step: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  bullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.lightGold,
    marginRight: 10,
  },
  bulletActive: {backgroundColor: Colors.templeGold},
  stepText: {color: Colors.sacredBrown, fontWeight: '700'},
});
