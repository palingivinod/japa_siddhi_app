import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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

export type HistoryItemFilter = 'ALL' | 'BL' | 'RK' | 'BP' | 'HB' | 'REWARD';

const HISTORY_FILTERS: Array<{id: HistoryItemFilter; label: string}> = [
  {id: 'ALL', label: 'All Delivered'},
  {id: 'BL', label: 'Baanalingam'},
  {id: 'RK', label: 'Ramakoti'},
  {id: 'BP', label: 'Bhirava Pendant'},
  {id: 'HB', label: 'Homa Bhasmam'},
  {id: 'REWARD', label: 'Rewards'},
];

const matchesHistoryCategory = (order: AdminOrder, filterId: HistoryItemFilter): boolean => {
  if (filterId === 'ALL') return true;
  if (filterId === 'REWARD') return order.orderGroup === 'reward';
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
      prod.includes('baanalingam') ||
      prod.includes('banalingam') ||
      prod.includes('lingam') ||
      remarks.includes('baanalingam') ||
      remarks.includes('banalingam')
    );
  }
  return true;
};

const mapAdminOrderStatus = (raw: string): AdminOrder['status'] => {
  const r = String(raw || '').trim();
  if (r === 'Delivered') return 'Delivered';
  if (r === 'Shipped') return 'Shipped';
  if (r === 'Packing') return 'Packing';
  if (r === 'Confirmed') return 'Confirmed';
  if (r === 'Sankalp Taken') return 'Sankalp Taken';
  if (r === 'Called Devotee') return 'Called Devotee';
  if (r === 'Cancelled') return 'Cancelled';
  if (r === 'Under Review') return 'Under Review';
  return 'Processing';
};

const orderGroupOf = (row: any): AdminOrder['orderGroup'] => {
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

const handleCall = (mobile?: string) => {
  if (!mobile) return;
  const clean = mobile.replace(/[^\d+]/g, '');
  Linking.openURL(`tel:${clean}`).catch(() => {
    Alert.alert('Call Error', 'Unable to open phone dialer.');
  });
};

const handleWhatsApp = (mobile?: string) => {
  if (!mobile) return;
  let clean = mobile.replace(/[^\d]/g, '');
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  Linking.openURL(`https://wa.me/${clean}`).catch(() => {
    Alert.alert('WhatsApp Error', 'Unable to open WhatsApp.');
  });
};

const AdminOrderHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<HistoryItemFilter>('ALL');

  const loadDeliveredOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/orders');
      const rows = response.data?.data || [];
      const mapped: AdminOrder[] = rows
        .map((row: any) => ({
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
          createdAt: row.createdAt || '',
        }))
        // Only delivered orders belong in Order History
        .filter((o: AdminOrder) => o.status === 'Delivered');

      setOrders(mapped);
    } catch (err) {
      setOrders([]);
      setError(getApiError(err, 'Could not load order history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDeliveredOrders();
    }, [loadDeliveredOrders]),
  );

  const searchActive = search.trim().length > 0;

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = matchesOrderSearch(order, search);
      const matchesCategory = matchesHistoryCategory(order, categoryFilter);
      return matchesSearch && matchesCategory;
    });
  }, [orders, search, categoryFilter]);

  const categoryCounts = useMemo(() => {
    return {
      ALL: orders.length,
      BL: orders.filter(o => matchesHistoryCategory(o, 'BL')).length,
      RK: orders.filter(o => matchesHistoryCategory(o, 'RK')).length,
      BP: orders.filter(o => matchesHistoryCategory(o, 'BP')).length,
      HB: orders.filter(o => matchesHistoryCategory(o, 'HB')).length,
      REWARD: orders.filter(o => matchesHistoryCategory(o, 'REWARD')).length,
    };
  }, [orders]);

  return (
    <AdminScreenLayout title="Order History" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Order History</Text>
      <Text style={styles.sub}>
        All delivered orders archive across all categories.
      </Text>

      {/* Search Input */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search name, phone, order ID, or product..."
        placeholderTextColor={Colors.placeholder}
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {searchActive ? (
        <Text style={styles.searchHint}>
          Showing delivered matches for “{search.trim()}” ({filteredOrders.length})
        </Text>
      ) : null}

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>TOTAL DELIVERED ORDERS</Text>
          <Text style={styles.summaryCount}>{orders.length}</Text>
        </View>
        <View style={styles.deliveredPill}>
          <Text style={styles.deliveredPillText}>✓ Completed Archive</Text>
        </View>
      </View>

      {/* Category Filter Scroll */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}>
          {HISTORY_FILTERS.map(f => {
            const active = categoryFilter === f.id;
            const count = categoryCounts[f.id] || 0;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                activeOpacity={0.8}
                onPress={() => setCategoryFilter(f.id)}>
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}>
                  {f.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Loading & Error States */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadDeliveredOrders}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {/* Empty State */}
      {!loading && !error && filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Delivered Orders Found</Text>
          <Text style={styles.empty}>
            {searchActive
              ? `No delivered orders matched “${search.trim()}”.`
              : 'No delivered orders in this category yet.'}
          </Text>
          {searchActive || categoryFilter !== 'ALL' ? (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setSearch('');
                setCategoryFilter('ALL');
              }}>
              <Text style={styles.resetBtnText}>Clear Search & Filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Order Cards */}
      {filteredOrders.map(order => {
        const mobile =
          order.customerMobile || order.mobileNumber
            ? `${order.mobileCountryCode || ''} ${order.customerMobile || order.mobileNumber || ''}`.trim()
            : '';

        return (
          <TouchableOpacity
            key={order.id}
            style={styles.card}
            activeOpacity={0.88}
            onPress={() =>
              navigation.navigate('AdminOrderDetails', {orderId: order.id})
            }>
            <View style={styles.cardTop}>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={styles.orderNo}>{order.orderNo}</Text>
                  <View
                    style={[
                      styles.groupBadge,
                      order.orderGroup === 'reward'
                        ? styles.groupBadgeReward
                        : styles.groupBadgeNormal,
                    ]}>
                    <Text
                      style={[
                        styles.groupBadgeText,
                        order.orderGroup === 'reward'
                          ? styles.groupBadgeTextReward
                          : styles.groupBadgeTextNormal,
                      ]}>
                      {order.orderGroup === 'reward' ? '🎁 REWARD' : '📦 NORMAL'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.productText}>
                  {order.rewardName || order.product}
                </Text>
                <Text style={styles.devoteeText}>Devotee: {order.customer}</Text>
                {(order as any).createdAt || (order as any).date ? (
                  <Text style={styles.dateText}>
                    Placed: {(order as any).createdAt || (order as any).date}
                  </Text>
                ) : null}
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>✓ DELIVERED</Text>
              </View>
            </View>

            {/* Devotee Contact Row */}
            {mobile ? (
              <View style={styles.contactRow}>
                <Text style={styles.phoneText}>📞 {mobile}</Text>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={[styles.contactBtn, styles.phoneBtn]}
                    onPress={() => handleCall(mobile)}>
                    <Text style={styles.contactBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactBtn, styles.whatsappBtn]}
                    onPress={() => handleWhatsApp(mobile)}>
                    <Text style={styles.contactBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
      <View style={styles.bottomSpacer} />
    </AdminScreenLayout>
  );
};

export default AdminOrderHistoryScreen;

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
  search: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  searchHint: {
    fontSize: 12,
    color: Colors.templeGold,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.leafGreen,
    letterSpacing: 0.5,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginTop: 2,
  },
  deliveredPill: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deliveredPillText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 12,
  },
  categoryContainer: {
    marginBottom: 14,
  },
  categoryScroll: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  categoryChipActive: {
    backgroundColor: Colors.sacredBrown,
    borderColor: Colors.sacredBrown,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.error,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  empty: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  resetBtn: {
    marginTop: 14,
    backgroundColor: Colors.templeGold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  orderNo: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  groupBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  groupBadgeNormal: {
    backgroundColor: '#E0F2FE',
  },
  groupBadgeReward: {
    backgroundColor: '#FEF3C7',
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  groupBadgeTextNormal: {
    color: '#0369A1',
  },
  groupBadgeTextReward: {
    color: '#B45309',
  },
  productText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 2,
  },
  devoteeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: Colors.placeholder,
    marginTop: 4,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  contactRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  phoneBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  whatsappBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  bottomSpacer: {
    height: 30,
  },
});
