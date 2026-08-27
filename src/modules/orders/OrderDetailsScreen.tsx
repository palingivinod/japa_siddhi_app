import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const OrderDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [item, setItem] = useState<any>(route.params?.order || null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const id = route.params?.id || route.params?.order?.id || route.params?.order?.orderId;

  const load = () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiService
      .get(`/orders/${id}/tracking`)
      .then(response => setItem(response.data.data))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load order details.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  return (
    <ScreenLayout title="Order Details" showBack tab="Orders">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <Text style={styles.order}>
        Order #{item?.orderNumber || item?.confirmationId || id || 'JS10028'}
      </Text>
      <MenuCard
        title={item?.itemName || item?.productName || 'Baanalingam'}
        subtitle={`Quantity: ${item?.quantity || 1}`}
      />
      <Text style={styles.section}>Status</Text>
      {(item?.steps || []).map((step: any) => (
        <View key={step.key} style={styles.step}>
          <View style={[styles.dot, step.done && styles.dotOn]} />
          <Text style={styles.stepText}>{step.label}</Text>
        </View>
      ))}
      <View style={styles.gap} />
      <PrimaryButton
        title="TRACK ORDER"
        onPress={() => navigation.navigate('OrderTracking', {id, order: item})}
      />
    </ScreenLayout>
  );
};

export default OrderDetailsScreen;

const styles = StyleSheet.create({
  order: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  section: {color: Colors.leafGreen, fontWeight: '800', marginBottom: 10},
  step: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.lightGold,
    marginRight: 12,
  },
  dotOn: {backgroundColor: Colors.templeGold},
  stepText: {color: Colors.sacredBrown, fontWeight: '700'},
  gap: {height: 16},
});
