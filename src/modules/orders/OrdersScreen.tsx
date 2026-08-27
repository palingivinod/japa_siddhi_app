import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';

const TABS = ['All', 'Pending', 'Shipped', 'Delivered'];

const statusOf = (item: any) =>
  String(item.orderStatus || item.status || '').toLowerCase();

const OrdersScreen = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

  const load = () => {
    setLoading(true);
    setError('');
    setRawError(null);
    apiService
      .get('/orders')
      .then(response => setOrders(response.data.data ?? []))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load orders.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    if (tab === 'All') {
      return orders;
    }
    return orders.filter(item => statusOf(item).includes(tab.toLowerCase()));
  }, [orders, tab]);

  return (
    <ScreenLayout title="My Orders" tab="Orders">
      <View style={styles.tabs}>
        {TABS.map(item => (
          <TouchableOpacity key={item} onPress={() => setTab(item)}>
            <Text style={[styles.tab, tab === item && styles.tabActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {!loading && !error && visible.length === 0 ? (
        <Text style={styles.empty}>No orders yet.</Text>
      ) : null}
      {visible.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.dot} />
          <View style={styles.copy}>
            <Text style={styles.name}>
              {item.orderNumber || `Order #${item.id}`}
            </Text>
            <Text style={styles.meta}>
              {item.itemName || item.productName || item.donationType || 'Seva'} •{' '}
              {item.orderStatus || item.status || 'Processing'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.view}
            onPress={() =>
              navigation.navigate('OrderDetails', {id: item.id, order: item})
            }>
            <Text style={styles.viewText}>VIEW</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScreenLayout>
  );
};

export default OrdersScreen;

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tab: {
    color: Colors.leafGreen,
    fontWeight: '700',
    paddingBottom: 6,
  },
  tabActive: {
    color: Colors.sacredBrown,
    borderBottomWidth: 2,
    borderBottomColor: Colors.templeGold,
  },
  empty: {color: Colors.textSecondary},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.sacredBrown,
    marginRight: 10,
  },
  copy: {flex: 1},
  name: {fontSize: 15, fontWeight: '800', color: Colors.sacredBrown},
  meta: {marginTop: 4, color: Colors.textSecondary},
  view: {
    backgroundColor: Colors.lightGold,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewText: {color: Colors.sacredBrown, fontWeight: '800'},
});
