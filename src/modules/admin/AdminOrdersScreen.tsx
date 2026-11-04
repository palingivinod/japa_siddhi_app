import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import SelectField from '../common/SelectField';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminOrder} from './adminData';

const digitsOnly = (value?: string) => String(value || '').replace(/\D/g, '');

const matchesOrderSearch = (order: AdminOrder, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const haystack = [
    order.id,
    order.orderNo,
    order.customer,
    order.product,
    order.rewardName,
    order.customerMobile,
    order.mobileNumber,
    order.mobileCountryCode,
    order.orderType,
    order.orderSource,
    order.status,
    order.remarks,
    order.orderGroup,
  ]
    .join(' ')
    .toLowerCase();
  if (haystack.includes(q)) {
    return true;
  }
  const queryDigits = digitsOnly(q);
  if (queryDigits.length < 2) {
    return false;
  }
  const phoneDigits = digitsOnly(
    `${order.mobileCountryCode || ''}${order.mobileNumber || order.customerMobile || ''}`,
  );
  return (
    phoneDigits.includes(queryDigits) ||
    String(order.id).includes(queryDigits) ||
    digitsOnly(order.orderNo).includes(queryDigits)
  );
};

const TABS: Array<{id: string; label: string}> = [
  {id: 'All', label: 'All'},
  {id: 'Under Review', label: 'Under Review'},
  {id: 'Called Devotee', label: 'Called'},
  {id: 'Sankalp Taken', label: 'Sankalp'},
  {id: 'Confirmed', label: 'Confirmed'},
  {id: 'Packing', label: 'Packing'},
];

const isBaanalingamOrder = (order: {
  product?: string;
  orderType?: string;
  orderNo?: string;
  remarks?: string;
}) => {
  const type = String(order.orderType || '').toUpperCase();
  const number = String(order.orderNo || '').toUpperCase();
  const text =
    `${order.product || ''} ${order.remarks || ''}`.toLowerCase();
  return (
    type === 'BANA_LINGAM' ||
    number.includes('BL-') ||
    text.includes('baanalingam') ||
    text.includes('banalingam')
  );
};

const mapAdminOrderStatus = (raw: string): AdminOrder['status'] => {
  if (raw === 'Delivered') return 'Delivered';
  if (raw === 'Shipped') return 'Shipped';
  if (raw === 'Packing') return 'Packing';
  if (raw === 'Confirmed') return 'Confirmed';
  if (raw === 'Sankalp Taken') return 'Sankalp Taken';
  if (raw === 'Called Devotee') return 'Called Devotee';
  if (raw === 'Cancelled') return 'Cancelled';
  if (raw === 'Under Review') return 'Under Review';
  return 'Processing';
};

const TYPE_FILTERS: Array<{id: 'normal' | 'reward'; label: string}> = [
  {id: 'normal', label: 'Normal'},
  {id: 'reward', label: 'Rewards'},
];

export type ProductFilterType = 'ALL' | 'RK' | 'BP' | 'HB' | 'BL';

export const ITEM_FILTERS: Array<{
  id: ProductFilterType;
  code: string;
  label: string;
}> = [
  {id: 'ALL', code: 'ALL', label: 'All Items'},
  {id: 'RK', code: 'RK', label: 'Ramakoti'},
  {id: 'BP', code: 'BP', label: 'Bhirava Pendant'},
  {id: 'HB', code: 'HB', label: 'Homa Bhasmam'},
  {id: 'BL', code: 'BL', label: 'Baanalingam'},
];

const matchesItemFilter = (order: AdminOrder, filterId: ProductFilterType): boolean => {
  if (filterId === 'ALL') return true;
  const num = String(order.orderNo || '').toUpperCase();
  const prod = String(order.product || '').toLowerCase();
  const type = String(order.orderType || '').toUpperCase();
  const remarks = String(order.remarks || '').toLowerCase();

  if (filterId === 'RK') {
    return (
      num.startsWith('#RK') ||
      num.startsWith('RK') ||
      num.includes('RK') ||
      type === 'RAMAKOTI_BOOKS' ||
      type.includes('RAMAKOTI') ||
      prod.includes('ramakoti') ||
      remarks.includes('ramakoti')
    );
  }
  if (filterId === 'BP') {
    return (
      num.startsWith('#BP') ||
      num.startsWith('BP') ||
      num.includes('BP') ||
      type === 'BIRAVA_PENDANT' ||
      type.includes('BIRAVA') ||
      type.includes('PENDANT') ||
      prod.includes('birava') ||
      prod.includes('bhirava') ||
      prod.includes('pendant') ||
      prod.includes('pendent') ||
      remarks.includes('birava') ||
      remarks.includes('bhirava') ||
      remarks.includes('pendant')
    );
  }
  if (filterId === 'HB') {
    return (
      num.startsWith('#HB') ||
      num.startsWith('HB') ||
      num.includes('HB') ||
      type === 'HOMA_BHASMA' ||
      type.includes('BHASMA') ||
      prod.includes('homa') ||
      prod.includes('bhasma') ||
      remarks.includes('homa') ||
      remarks.includes('bhasma')
    );
  }
  if (filterId === 'BL') {
    return (
      num.startsWith('#BL') ||
      num.startsWith('BL') ||
      num.includes('BL-') ||
      type === 'BANA_LINGAM' ||
      type.includes('LINGAM') ||
      prod.includes('baana') ||
      prod.includes('banalingam') ||
      prod.includes('lingam') ||
      remarks.includes('baanalingam') ||
      remarks.includes('banalingam')
    );
  }
  return true;
};

const orderGroupOf = (row: {
  orderGroup?: string;
  orderNo?: string;
  product?: string;
  orderType?: string;
  orderSource?: string;
  remarks?: string;
}): 'normal' | 'reward' | 'other' => {
  if (row.orderGroup === 'reward' || row.orderGroup === 'normal' || row.orderGroup === 'other') {
    return row.orderGroup;
  }
  const source = String(row.orderSource || '').toUpperCase();
  const type = String(row.orderType || '').toUpperCase();
  const number = String(row.orderNo || '').replace(/^#/, '').toUpperCase();
  const remarks = String(row.remarks || '').toLowerCase();
  const product = String(row.product || '').toLowerCase();
  const reward =
    source === 'CHALLENGE' ||
    source === 'MILESTONE' ||
    number.startsWith('RW') ||
    remarks.includes('challenge reward') ||
    remarks.includes('milestone reward');
  if (reward) {
    return 'reward';
  }
  if (
    type === 'BANA_LINGAM' ||
    type === 'RAMAKOTI_BOOKS' ||
    type === 'HOMA_BHASMA' ||
    type === 'BIRAVA_PENDANT' ||
    number.startsWith('BL-') ||
    number.startsWith('RK') ||
    number.startsWith('HB') ||
    number.startsWith('BP') ||
    product.includes('baanalingam') ||
    product.includes('banalingam') ||
    product.includes('ramakoti') ||
    product.includes('homa bhasma') ||
    product.includes('birava')
  ) {
    return 'normal';
  }
  return 'other';
};

const statusTone = (status: AdminOrder['status']) => {
  if (status === 'Under Review') {
    return {bg: '#FEF3C7', border: '#D97706', text: '#B45309'};
  }
  if (status === 'Called Devotee') {
    return {bg: '#FEF3C7', border: '#D97706', text: '#B45309'};
  }
  if (status === 'Sankalp Taken') {
    return {bg: '#FFEDD5', border: '#EA580C', text: '#C2410C'};
  }
  if (status === 'Confirmed') {
    return {bg: '#E0F2FE', border: '#0284C7', text: '#0369A1'};
  }
  if (status === 'Packing') {
    return {bg: '#FFEDD5', border: '#EA580C', text: '#C2410C'};
  }
  if (status === 'Shipped') {
    return {bg: '#F3E8FF', border: '#9333EA', text: '#7E22CE'};
  }
  if (status === 'Delivered') {
    return {bg: '#DCFCE7', border: '#16A34A', text: '#15803D'};
  }
  if (status === 'Cancelled') {
    return {bg: '#FEE2E2', border: '#DC2626', text: '#B91C1C'};
  }
  return {bg: '#F5F5F4', border: Colors.sacredBrown, text: Colors.sacredBrown};
};

const normalizeRewardKey = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const AdminOrdersScreen = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [catalogRewardNames, setCatalogRewardNames] = useState<string[]>([]);
  const [tab, setTab] = useState('All');
  const [orderType, setOrderType] = useState<'normal' | 'reward'>('normal');
  const [itemFilter, setItemFilter] = useState<ProductFilterType>('ALL');
  const [rewardFilter, setRewardFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteBusyId, setNoteBusyId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersRes, rewardsRes] = await Promise.all([
        apiService.get('/admin/orders'),
        apiService.get('/admin/rewards').catch(() => ({data: {data: []}})),
      ]);
      const rows = Array.isArray(ordersRes.data?.data)
        ? ordersRes.data.data
        : [];
      const catalog = Array.isArray(rewardsRes.data?.data)
        ? rewardsRes.data.data
            .map((r: any) => String(r.name || '').trim())
            .filter(Boolean)
        : [];
      setCatalogRewardNames(catalog);
      const mapped: AdminOrder[] = rows.map((row: any) => ({
        id: String(row.id),
        orderNo: row.orderNo || `#${row.id}`,
        product: row.product || 'Item',
        customer: row.customer || 'Devotee',
        status: mapAdminOrderStatus(String(row.status || '')),
        orderGroup: orderGroupOf(row),
        orderType: row.orderType || '',
        orderSource: row.orderSource || '',
        rewardName: String(row.rewardName || row.product || '').trim(),
        customerMobile: String(row.customerMobile || '').trim(),
        mobileCountryCode: String(row.mobileCountryCode || '').trim(),
        mobileNumber: String(row.mobileNumber || '').trim(),
        remarks: row.remarks || '',
        adminNote: String(row.adminNote || ''),
        adminNoteAt: String(row.adminNoteAt || ''),
        cancelReason: row.cancelReason || '',
        cancelledBy: row.cancelledBy || '',
        userId: Number(row.userId || 0) || null,
        userCode: String(row.userCode || '').trim(),
        userReceived: Boolean(row.userReceived ?? row.user_received),
        userReceivedAt: row.userReceivedAt || row.user_received_at || '',
      })).filter(
        (o: AdminOrder) =>
          o.status !== 'Delivered' &&
          o.status !== 'Shipped' &&
          o.status !== 'Cancelled',
      );
      setOrders(mapped);
      setNoteDrafts(prev => {
        const next = {...prev};
        for (const order of mapped) {
          if (next[order.id] === undefined) {
            next[order.id] = order.adminNote || '';
          }
        }
        return next;
      });
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

  const confirmOrder = async (order: AdminOrder) => {
    setConfirmingId(order.id);
    try {
      if (isBaanalingamOrder(order)) {
        await apiService.put(`/admin/orders/${order.id}/status`, {
          status: 'Called Devotee',
        });
        setOrders(prev =>
          prev.map(o =>
            o.id === order.id ? {...o, status: 'Called Devotee'} : o,
          ),
        );
        Alert.alert(
          'Status updated',
          `Order ${order.orderNo} marked as Called and talked with devotee.`,
        );
      } else {
        await apiService.put(`/admin/orders/${order.id}/confirm`);
        setOrders(prev =>
          prev.map(o =>
            o.id === order.id ? {...o, status: 'Confirmed'} : o,
          ),
        );
        Alert.alert(
          'Order Confirmed',
          `Order ${order.orderNo} has been confirmed successfully.`,
        );
      }
    } catch (err) {
      Alert.alert('Confirmation failed', getApiError(err, 'Could not confirm order.'));
    } finally {
      setConfirmingId(null);
    }
  };

  const cancelOrder = (orderId: string, orderNo: string) => {
    Alert.alert('Cancel order', `Cancel ${orderNo}?`, [
      {text: 'Keep order', style: 'cancel'},
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          setBusyId(orderId);
          try {
            await apiService.put(`/admin/orders/${orderId}/cancel`);
            setOrders(prev => prev.filter(o => o.id !== orderId));
          } catch (err) {
            Alert.alert('Cancel failed', getApiError(err, 'Could not cancel order.'));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const deleteOrder = (orderId: string, orderNo: string) => {
    Alert.alert(
      'Remove Order',
      `Remove ${orderNo} from active orders? It will remain saved in database and can be viewed in Order History.`,
      [
        {text: 'Keep order', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusyId(orderId);
            try {
              await apiService.delete(`/admin/orders/${orderId}`);
              setOrders(prev => prev.filter(o => o.id !== orderId));
            } catch (err) {
              Alert.alert('Delete failed', getApiError(err, 'Could not delete order.'));
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const saveOrderNote = async (order: AdminOrder, sendNotify: boolean) => {
    const note = String(noteDrafts[order.id] ?? order.adminNote ?? '').trim();
    if (sendNotify && !note) {
      Alert.alert('Empty remark', 'Write a remark before sending a notification.');
      return;
    }
    setNoteBusyId(order.id);
    try {
      const res = await apiService.put(`/admin/orders/${order.id}/admin-note`, {
        note,
        sendNotify,
      });
      const data = res.data?.data || {};
      const savedNote = String(data.adminNote ?? note);
      const savedAt = String(data.adminNoteAt || '');
      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? {...o, adminNote: savedNote, adminNoteAt: savedAt}
            : o,
        ),
      );
      setNoteDrafts(prev => ({...prev, [order.id]: savedNote}));
      Alert.alert(
        sendNotify ? 'Saved & sent' : 'Saved',
        sendNotify
          ? data.notified
            ? 'Remark saved and in-app notification sent to the devotee.'
            : 'Remark saved. Notification could not be delivered (devotee may have no device token).'
          : 'Remark saved on this order.',
      );
    } catch (err) {
      Alert.alert(
        'Save failed',
        getApiError(err, 'Could not save order remark.'),
      );
    } finally {
      setNoteBusyId(null);
    }
  };

  const searchActive = search.trim().length > 0;

  const typedOrders = useMemo(() => {
    // Search spans Normal + Rewards so admin finds every order for that devotee.
    if (searchActive) {
      return orders.filter(order => matchesOrderSearch(order, search));
    }
    return orders.filter(order => orderGroupOf(order) === orderType);
  }, [orders, orderType, search, searchActive]);

  const rewardOptions = useMemo(() => {
    const isPlaceholderReward = (name: string) =>
      normalizeRewardKey(name) === 'test';
    const names = new Map<string, string>();
    catalogRewardNames.forEach(name => {
      const key = normalizeRewardKey(name);
      if (key && !isPlaceholderReward(name) && !names.has(key)) {
        names.set(key, name);
      }
    });
    typedOrders.forEach(order => {
      const raw = String(order.rewardName || order.product || '').trim();
      const key = normalizeRewardKey(raw);
      if (key && !isPlaceholderReward(raw) && !names.has(key)) {
        names.set(key, raw);
      }
    });
    const list = Array.from(names.values()).sort((a, b) =>
      a.localeCompare(b, undefined, {sensitivity: 'base'}),
    );
    return [
      {label: 'All rewards', value: 'ALL'},
      ...list.map(name => ({label: name, value: normalizeRewardKey(name)})),
    ];
  }, [catalogRewardNames, typedOrders]);

  const itemCounts = useMemo(() => {
    return {
      ALL: typedOrders.length,
      RK: typedOrders.filter(o => matchesItemFilter(o, 'RK')).length,
      BP: typedOrders.filter(o => matchesItemFilter(o, 'BP')).length,
      HB: typedOrders.filter(o => matchesItemFilter(o, 'HB')).length,
      BL: typedOrders.filter(o => matchesItemFilter(o, 'BL')).length,
    };
  }, [typedOrders]);

  const itemFilteredOrders = useMemo(() => {
    if (searchActive) {
      return typedOrders;
    }
    if (orderType === 'reward') {
      if (rewardFilter === 'ALL') {
        return typedOrders;
      }
      return typedOrders.filter(
        order =>
          normalizeRewardKey(order.rewardName || order.product) === rewardFilter,
      );
    }
    return typedOrders.filter(order => matchesItemFilter(order, itemFilter));
  }, [typedOrders, itemFilter, orderType, rewardFilter, searchActive]);

  const orderCounts = useMemo(() => {
    const total = itemFilteredOrders.length;
    const underReview = itemFilteredOrders.filter(o => o.status === 'Under Review').length;
    const calledDevotee = itemFilteredOrders.filter(
      o => o.status === 'Called Devotee',
    ).length;
    const sankalpTaken = itemFilteredOrders.filter(
      o => o.status === 'Sankalp Taken',
    ).length;
    const confirmed = itemFilteredOrders.filter(o => o.status === 'Confirmed').length;
    const packing = itemFilteredOrders.filter(o => o.status === 'Packing').length;
    return {
      total,
      all: total,
      underReview,
      calledDevotee,
      sankalpTaken,
      confirmed,
      packing,
    };
  }, [itemFilteredOrders]);

  const visibleOrders = useMemo(() => {
    const list =
      tab === 'All'
        ? itemFilteredOrders
        : itemFilteredOrders.filter(o => o.status === tab);

    return [...list].sort((a, b) => {
      const uA = a.userId != null ? a.userId : 999999999;
      const uB = b.userId != null ? b.userId : 999999999;
      if (uA !== uB) {
        return uA - uB; // ASC order by User ID
      }
      return Number(b.id) - Number(a.id);
    });
  }, [itemFilteredOrders, tab]);

  const tabCount = (tabId: string) => {
    if (tabId === 'All') return orderCounts.all;
    if (tabId === 'Under Review') return orderCounts.underReview;
    if (tabId === 'Called Devotee') return orderCounts.calledDevotee;
    if (tabId === 'Sankalp Taken') return orderCounts.sankalpTaken;
    if (tabId === 'Confirmed') return orderCounts.confirmed;
    if (tabId === 'Packing') return orderCounts.packing;
    return 0;
  };

  return (
    <AdminScreenLayout
      title="Order Management"
      tab="AdminOrders"
      showBack={false}
      enableScrollToTop
      enableFastScroll>
      <Text style={styles.heading}>Order Management</Text>
      <Text style={styles.sub}>Review and approve devotee orders.</Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search name, phone, order ID, or item"
        placeholderTextColor={Colors.placeholder}
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {searchActive ? (
        <Text style={styles.searchHint}>
          Showing Normal + Reward matches for “{search.trim()}”
        </Text>
      ) : null}

      {/* Top Total Orders Summary Card */}
      <View style={styles.statsSummaryCard}>
        <View style={styles.totalOrdersHeader}>
          <View>
            <Text style={styles.totalOrdersLabel}>
              {orderType === 'reward'
                ? rewardFilter === 'ALL'
                  ? 'REWARD ORDERS'
                  : 'REWARD ORDERS'
                : itemFilter === 'ALL'
                  ? 'TOTAL ORDERS'
                  : `${itemFilter} ORDERS`}
            </Text>
            <Text style={styles.totalOrdersCount}>{orderCounts.total}</Text>
          </View>
          <View style={styles.totalOrdersBadge}>
            <Text style={styles.totalOrdersBadgeText}>
              {orderType === 'reward'
                ? rewardFilter === 'ALL'
                  ? '🎁 All Rewards'
                  : `🎁 ${
                      rewardOptions.find(o => o.value === rewardFilter)
                        ?.label || 'Reward'
                    }`
                : itemFilter === 'ALL'
                  ? '📦 Live Orders'
                  : itemFilter === 'RK'
                    ? '📖 Ramakoti'
                    : itemFilter === 'BP'
                      ? '🛡️ Bhirava Pendant'
                      : itemFilter === 'HB'
                        ? '🔥 Homa Bhasma'
                        : '🪨 Baanalingam'}
            </Text>
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
            <Text style={[styles.miniStatCount, {color: '#C2410C'}]}>
              {orderCounts.packing}
            </Text>
            <Text style={styles.miniStatLabel}>Packing</Text>
          </View>
        </View>
      </View>

      <View style={styles.typeBar}>
        {TYPE_FILTERS.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.tabButton, orderType === item.id && styles.tabButtonActive]}
            onPress={() => {
              setOrderType(item.id);
              setRewardFilter('ALL');
              setTab('All');
            }}>
            <Text
              style={[
                styles.tabButtonText,
                orderType === item.id && styles.tabButtonTextActive,
              ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {orderType === 'reward' ? (
        <View style={styles.rewardFilterBox}>
          <Text style={styles.itemFilterHeader}>FILTER BY REWARD TYPE</Text>
          <SelectField
            title="Select reward"
            placeholder="All rewards"
            value={rewardFilter}
            options={rewardOptions}
            onChange={value => {
              setRewardFilter(value);
              setTab('All');
            }}
          />
        </View>
      ) : (
        <View style={styles.itemFilterContainer}>
          <Text style={styles.itemFilterHeader}>FILTER BY ITEM</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.itemFilterScroll}>
            {ITEM_FILTERS.map(item => {
              const active = itemFilter === item.id;
              const count = itemCounts[item.id] || 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  style={[
                    styles.itemFilterChip,
                    active && styles.itemFilterChipActive,
                  ]}
                  onPress={() => setItemFilter(item.id)}>
                  <View
                    style={[
                      styles.codeBadge,
                      active && styles.codeBadgeActive,
                    ]}>
                    <Text
                      style={[
                        styles.codeBadgeText,
                        active && styles.codeBadgeTextActive,
                      ]}>
                      {item.code}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.itemFilterLabel,
                      active && styles.itemFilterLabelActive,
                    ]}>
                    {item.label}
                  </Text>
                  <View
                    style={[
                      styles.itemCountBadge,
                      active && styles.itemCountBadgeActive,
                    ]}>
                    <Text
                      style={[
                        styles.itemCountText,
                        active && styles.itemCountTextActive,
                      ]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

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
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.empty}>
            No {itemFilter !== 'ALL' ? `${itemFilter} ` : ''}
            {orderType === 'reward' ? 'reward' : 'normal'} orders
            {tab !== 'All' ? ` in ${tab}` : ''}.
          </Text>
          {itemFilter !== 'ALL' ? (
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => setItemFilter('ALL')}>
              <Text style={styles.resetFilterBtnText}>Show All Items</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
                <Text style={styles.name}>
                  {order.orderNo}
                  {order.userCode
                    ? ` • ${order.userCode}`
                    : order.userId
                      ? ` • User #${order.userId}`
                      : ''}
                </Text>
                <Text style={styles.meta}>
                  {order.rewardName || order.product} • {order.customer}
                  {searchActive && order.orderGroup
                    ? ` • ${order.orderGroup === 'reward' ? 'Reward' : 'Normal'}`
                    : ''}
                </Text>
                {order.customerMobile || order.mobileNumber ? (
                  <Text style={styles.phoneMeta}>
                    {order.customerMobile || order.mobileNumber}
                  </Text>
                ) : null}
                {order.cancelReason ? (
                  <Text style={styles.reason}>Reason: {order.cancelReason}</Text>
                ) : null}
              </View>
              <View style={styles.statusCol}>
                <View
                  style={[
                    styles.pill,
                    {borderColor: tone.border, backgroundColor: tone.bg},
                  ]}>
                  <Text style={[styles.pillText, {color: tone.text}]}>
                    {order.status}
                  </Text>
                </View>
                {order.status === 'Delivered' ? (
                  order.userReceived ? (
                    <View style={styles.userConfirmedBadge}>
                      <Text style={styles.userConfirmedText}>From user: Delivered ✓</Text>
                    </View>
                  ) : (
                    <View style={styles.userPendingBadge}>
                      <Text style={styles.userPendingText}>From user: Pending</Text>
                    </View>
                  )
                ) : null}
              </View>
            </TouchableOpacity>

            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Admin remark</Text>
              <TextInput
                style={styles.noteInput}
                value={noteDrafts[order.id] ?? order.adminNote ?? ''}
                onChangeText={text =>
                  setNoteDrafts(prev => ({...prev, [order.id]: text}))
                }
                placeholder="e.g. Called but not answered"
                placeholderTextColor={Colors.placeholder}
                multiline
                textAlignVertical="top"
              />
              {order.adminNoteAt ? (
                <Text style={styles.noteSavedAt}>Saved: {order.adminNoteAt}</Text>
              ) : null}
              <View style={styles.noteActions}>
                <TouchableOpacity
                  style={[
                    styles.noteSaveBtn,
                    noteBusyId === order.id && styles.btnDisabled,
                  ]}
                  disabled={noteBusyId === order.id}
                  onPress={() => saveOrderNote(order, false)}>
                  {noteBusyId === order.id ? (
                    <ActivityIndicator size="small" color={Colors.sacredBrown} />
                  ) : (
                    <Text style={styles.noteSaveBtnText}>SAVE</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.noteSendBtn,
                    noteBusyId === order.id && styles.btnDisabled,
                  ]}
                  disabled={noteBusyId === order.id}
                  onPress={() => saveOrderNote(order, true)}>
                  <Text style={styles.noteSendBtnText}>SAVE & SEND</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionRow}>
              {order.status !== 'Cancelled' && order.status !== 'Delivered' ? (
                <>
                  {isUnderReview ? (
                    <TouchableOpacity
                      style={[
                        styles.confirmBtn,
                        isConfirming && styles.btnDisabled,
                      ]}
                      disabled={isConfirming}
                      onPress={() => confirmOrder(order)}>
                      {isConfirming ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.confirmBtnText}>
                          {isBaanalingamOrder(order)
                            ? '📞 MARK CALLED'
                            : '✓ CONFIRM ORDER'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[
                      styles.cancelBtn,
                      busyId === order.id && styles.btnDisabled,
                    ]}
                    disabled={busyId === order.id}
                    onPress={() => cancelOrder(order.id, order.orderNo)}>
                    <Text style={styles.cancelBtnText}>CANCEL ORDER</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  busyId === order.id && styles.btnDisabled,
                ]}
                disabled={busyId === order.id}
                onPress={() => deleteOrder(order.id, order.orderNo)}>
                <Text style={styles.deleteBtnText}>DELETE ORDER</Text>
              </TouchableOpacity>
            </View>
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
  search: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    minHeight: 50,
    color: Colors.sacredBrown,
    fontSize: 16,
    marginBottom: 8,
  },
  searchHint: {
    marginBottom: 12,
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 12,
  },
  phoneMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  noteBox: {
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 10,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.leafGreen,
    marginBottom: 6,
  },
  noteInput: {
    minHeight: 56,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.sacredBrown,
    backgroundColor: Colors.white,
  },
  noteSavedAt: {
    marginTop: 4,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  noteSaveBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    backgroundColor: Colors.white,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  noteSaveBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
  },
  noteSendBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: Colors.templeGold,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  noteSendBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
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
  typeBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rewardFilterBox: {
    marginBottom: 12,
  },
  itemFilterContainer: {
    marginBottom: 14,
  },
  itemFilterHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.leafGreen,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  itemFilterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 12,
  },
  itemFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  itemFilterChipActive: {
    backgroundColor: Colors.sacredBrown,
    borderColor: Colors.sacredBrown,
    shadowOpacity: 0.15,
  },
  codeBadge: {
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: Colors.templeGold,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  codeBadgeActive: {
    backgroundColor: Colors.templeGold,
    borderColor: Colors.templeGold,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.sacredBrown,
  },
  codeBadgeTextActive: {
    color: Colors.white,
  },
  itemFilterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  itemFilterLabelActive: {
    color: Colors.white,
  },
  itemCountBadge: {
    backgroundColor: '#F3EFEA',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  itemCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  itemCountTextActive: {
    color: Colors.white,
  },
  emptyContainer: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  resetFilterBtn: {
    marginTop: 10,
    backgroundColor: Colors.templeGold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  resetFilterBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
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
  reason: {
    marginTop: 6,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {fontWeight: '800', fontSize: 12},
  userConfirmedBadge: {
    marginTop: 6,
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  userConfirmedText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  userPendingBadge: {
    marginTop: 6,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  userPendingText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
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
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 13,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  detailsBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
  },
});
