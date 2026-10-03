import React, {useCallback, useMemo, useState} from 'react';
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
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminOrder} from './adminData';

const TABS: Array<{id: string; label: string}> = [
  {id: 'All', label: 'All'},
  {id: 'Under Review', label: 'Under Review'},
  {id: 'Confirmed', label: 'Confirmed'},
  {id: 'Shipped', label: 'Shipped'},
  {id: 'Delivered', label: 'Delivered'},
];

const statusTone = (status: AdminOrder['status']) => {
  if (status === 'Under Review') {
    return {bg: '#FEF3C7', border: '#D97706', text: '#B45309'};
  }
  if (status === 'Confirmed') {
    return {bg: '#E0F2FE', border: '#0284C7', text: '#0369A1'};
  }
  if (status === 'Shipped') {
    return {bg: '#F3E8FF', border: '#9333EA', text: '#7E22CE'};
  }
  if (status === 'Delivered') {
    return {bg: '#DCFCE7', border: '#16A34A', text: '#15803D'};
  }
  return {bg: '#F5F5F4', border: Colors.sacredBrown, text: Colors.sacredBrown};
};

const AdminOrdersScreen = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [tab, setTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
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
                : row.status === 'Confirmed'
                  ? 'Confirmed'
                  : row.status === 'Under Review'
                    ? 'Under Review'
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

  const confirmOrder = async (orderId: string, orderNo: string) => {
    setConfirmingId(orderId);
    try {
      await apiService.put(`/admin/orders/${orderId}/confirm`);
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? {...o, status: 'Confirmed'} : o)),
      );
      Alert.alert('Order Confirmed', `Order ${orderNo} has been confirmed successfully.`);
    } catch (err) {
      Alert.alert('Confirmation failed', getApiError(err, 'Could not confirm order.'));
    } finally {
      setConfirmingId(null);
    }
  };

  const orderCounts = useMemo(() => {
    const total = orders.length;
    const underReview = orders.filter(o => o.status === 'Under Review').length;
    const confirmed = orders.filter(o => o.status === 'Confirmed').length;
    const shipped = orders.filter(o => o.status === 'Shipped').length;
    const delivered = orders.filter(o => o.status === 'Delivered').length;
    return {total, underReview, confirmed, shipped, delivered};
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (tab === 'All') {
      return orders;
    }
    return orders.filter(o => o.status === tab);
  }, [orders, tab]);

  const tabCount = (tabId: string) => {
    if (tabId === 'All') return orderCounts.total;
    if (tabId === 'Under Review') return orderCounts.underReview;
    if (tabId === 'Confirmed') return orderCounts.confirmed;
    if (tabId === 'Shipped') return orderCounts.shipped;
    if (tabId === 'Delivered') return orderCounts.delivered;
    return 0;
  };

  return (
    <AdminScreenLayout title="Order Management" tab="AdminOrders" showBack={false}>
      <Text style={styles.heading}>Order Management</Text>
      <Text style={styles.sub}>Review and approve devotee orders.</Text>

      {/* Top Total Orders Summary Card */}
      <View style={styles.statsSummaryCard}>
        <View style={styles.totalOrdersHeader}>
          <View>
            <Text style={styles.totalOrdersLabel}>TOTAL ORDERS</Text>
            <Text style={styles.totalOrdersCount}>{orderCounts.total}</Text>
          </View>
          <View style={styles.totalOrdersBadge}>
            <Text style={styles.totalOrdersBadgeText}>📦 Live Orders</Text>
          </View>
        </View>
        <View style={styles.miniStatsRow}>
          <View style={styles.miniStatItem}>
            <Text style={[styles.miniStatCount, {color: '#B45309'}]}>
              {orderCounts.underReview}
            </Text>
            <Text style={styles.miniStatLabel}>Review</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStatItem}>
            <Text style={[styles.miniStatCount, {color: '#0369A1'}]}>
              {orderCounts.confirmed}
            </Text>
            <Text style={styles.miniStatLabel}>Confirmed</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStatItem}>
            <Text style={[styles.miniStatCount, {color: '#7E22CE'}]}>
              {orderCounts.shipped}
            </Text>
            <Text style={styles.miniStatLabel}>Shipped</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStatItem}>
            <Text style={[styles.miniStatCount, {color: '#15803D'}]}>
              {orderCounts.delivered}
            </Text>
            <Text style={styles.miniStatLabel}>Delivered</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(item => {
          const count = tabCount(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tabButton, tab === item.id && styles.tabButtonActive]}
              onPress={() => setTab(item.id)}>
              <Text
                style={[
                  styles.tabButtonText,
                  tab === item.id && styles.tabButtonTextActive,
                ]}>
                {item.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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

      {!loading && !error && visibleOrders.length === 0 ? (
        <Text style={styles.empty}>No orders {tab !== 'All' ? `in ${tab}` : ''}.</Text>
      ) : null}

      {visibleOrders.map(order => {
        const tone = statusTone(order.status);
        const isUnderReview = order.status === 'Under Review';
        const isConfirming = confirmingId === order.id;

        return (
          <View key={order.id} style={styles.card}>
            <TouchableOpacity
              style={styles.cardTop}
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
              <View
                style={[
                  styles.pill,
                  {borderColor: tone.border, backgroundColor: tone.bg},
                ]}>
                <Text style={[styles.pillText, {color: tone.text}]}>
                  {order.status}
                </Text>
              </View>
            </TouchableOpacity>

            {isUnderReview ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.confirmBtn, isConfirming && styles.btnDisabled]}
                  disabled={isConfirming}
                  onPress={() => confirmOrder(order.id, order.orderNo)}>
                  {isConfirming ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.confirmBtnText}>✓ CONFIRM ORDER</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() =>
                    navigation.navigate('AdminOrderDetails', {orderId: order.id})
                  }>
                  <Text style={styles.detailsBtnText}>VIEW DETAILS</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
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
    marginBottom: 14,
    color: Colors.textSecondary,
  },
  statsSummaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.templeGold,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  totalOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalOrdersLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  totalOrdersCount: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: Colors.sacredBrown,
    marginTop: 2,
  },
  totalOrdersBadge: {
    backgroundColor: '#FFF4E0',
    borderColor: Colors.templeGold,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  totalOrdersBadgeText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
  },
  miniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5EA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  miniStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatCount: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  miniStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5D8C3',
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tabButtonActive: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  tabButtonTextActive: {
    color: Colors.white,
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
    marginBottom: 12,
  },
  cardTop: {
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
    fontSize: 13,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {fontWeight: '800', fontSize: 12},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E7DB',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.leafGreen,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  detailsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
  },
});
