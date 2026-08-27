import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const OrderTrackingScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [item, setItem] = useState<any>(route.params?.order || null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const id = route.params?.id || route.params?.order?.id;

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
        setError(getApiError(err, 'Could not load tracking.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  return (
    <ScreenLayout title="Track Order" showBack tab="Orders">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <Text style={styles.order}>
        Order #{item?.orderNumber || id || 'JS10028'}
      </Text>
      {(item?.steps || []).map((step: any) => (
        <View key={step.key} style={styles.step}>
          <View style={[styles.dot, step.done && styles.dotOn]} />
          <View>
            <Text style={styles.label}>{step.label}</Text>
            <Text style={styles.date}>{step.date}</Text>
          </View>
        </View>
      ))}
      <PrimaryButton
        title="DELIVERY STATUS"
        onPress={() => navigation.navigate('DeliveryStatus', {id, order: item})}
      />
    </ScreenLayout>
  );
};

export default OrderTrackingScreen;

const styles = StyleSheet.create({
  order: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 20,
  },
  step: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22},
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.lightGold,
    marginRight: 12,
    marginTop: 3,
  },
  dotOn: {backgroundColor: Colors.templeGold},
  label: {fontWeight: '800', color: Colors.sacredBrown, fontSize: 16},
  date: {marginTop: 4, color: Colors.leafGreen, fontWeight: '700'},
});
