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
    order.cancelReason,
    order.cancelledBy,
    order.userCode,
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

export type CancelledItemFilter = 'ALL' | 'BL' | 'RK' | 'BP' | 'HB' | 'REWARD';

const CANCELLED_FILTERS: Array<{id: CancelledItemFilter; label: string}> = [
  {id: 'ALL', label: 'All Cancelled'},
  {id: 'BL', label: 'Baanalingam'},
  {id: 'RK', label: 'Ramakoti'},
  {id: 'BP', label: 'Bhirava Pendant'},
  {id: 'HB', label: 'Homa Bhasmam'},
  {id: 'REWARD', label: 'Rewards'},
];

const matchesCancelledCategory = (order: AdminOrder, filterId: CancelledItemFilter): boolean => {
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
  const r = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (r === 'DELIVERED') return 'Delivered';
  if (r === 'SHIPPED') return 'Shipped';
  if (r === 'PACKING') return 'Packing';
  if (r === 'CONFIRMED' || r === 'PROCESSING' || r === 'READY') {
    return 'Confirmed';
  }
  if (r === 'SANKALP_TAKEN' || r === 'SANKALP') return 'Sankalp Taken';
  if (r === 'CALLED_DEVOTEE' || r === 'CALLED_TALKED' || r === 'CALLED') {
    return 'Called Devotee';
  }
  if (r === 'CANCELLED' || r === 'CANCELED') return 'Cancelled';
  if (r === 'UNDER_REVIEW' || r === 'PENDING') return 'Under Review';
  // Already-mapped display labels from API
  const label = String(raw || '').trim().toLowerCase();
  if (label === 'cancelled' || label === 'canceled') return 'Cancelled';
  if (label === 'delivered') return 'Delivered';
  if (label === 'shipped') return 'Shipped';
  return 'Processing';
};

const orderGroupOf = (row: any): AdminOrder['orderGroup'] => {
  const source = String(row.orderSource || '').toUpperCase();
  const type = String(row.orderType || '').toUpperCase();
  const number = String(row.orderNo || '').replace(/^#/, '').toUpperCase();
  const remarks = String(row.remarks || '').toLowerCase();
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
    type === 'SEVA_BOOKING'
  ) {
    return 'normal';
  }
  return 'other';
};

const mapApiOrder = (row: any): AdminOrder => {
  const productTitle =
    row.rewardName ||
    row.itemName ||
    row.product ||
    (row.orderType ? String(row.orderType).replace(/_/g, ' ') : 'Product');
  const orderNoRaw = row.orderNo || row.orderNumber || `#${row.id}`;
  return {
    id: String(row.id),
    orderNo: String(orderNoRaw).startsWith('#')
      ? String(orderNoRaw)
      : `#${orderNoRaw}`,
    product: productTitle,
    customer: row.customer || row.customerName || 'Devotee',
    date: row.createdAt ? String(row.createdAt).slice(0, 10) : 'Recent',
    createdAt: row.createdAt || '',
    // Prefer API display status; fall back to raw DB orderStatus (CANCELLED, etc.)
    status: mapAdminOrderStatus(row.status || row.orderStatus),
    remarks: row.remarks || '',
    adminNote: row.adminNote || '',
    adminNoteAt: row.adminNoteAt || '',
    orderGroup: orderGroupOf({
      ...row,
      orderNo: orderNoRaw,
      product: productTitle,
    }),
    orderType: row.orderType || '',
    orderSource: row.orderSource || '',
    rewardName: row.rewardName || '',
    customerMobile: row.customerMobile || '',
    mobileNumber: row.mobileNumber || row.claimMobile || '',
    mobileCountryCode: row.mobileCountryCode || '',
    userId: Number(row.userId || 0) || null,
    userCode: String(row.userCode || '').trim(),
    cancelReason: row.cancelReason || '',
    cancelledBy: row.cancelledBy || '',
  };
};

const AdminCancelledOrdersScreen = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<CancelledItemFilter>('ALL');

  const loadCancelledOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/orders', {
        params: {includeAll: 'true', includeDeleted: 'true'},
      });
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      const mapped = list
        .map(mapApiOrder)
        .filter((o: AdminOrder) => o.status === 'Cancelled')
        .sort((a: AdminOrder, b: AdminOrder) => {
          const aMs = new Date(String(a.createdAt || a.date || 0)).getTime();
          const bMs = new Date(String(b.createdAt || b.date || 0)).getTime();
          if (Number.isFinite(bMs) && Number.isFinite(aMs) && bMs !== aMs) {
            return bMs - aMs;
          }
          return Number(b.id) - Number(a.id);
        });
      setOrders(mapped);
    } catch (err) {
      setOrders([]);
      setError(getApiError(err, 'Could not load cancelled orders.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCancelledOrders();
    }, [loadCancelledOrders]),
  );

  const dialCustomer = (mobile?: string) => {
    const raw = String(mobile || '').replace(/[^\d+]/g, '');
    if (!raw) {
      Alert.alert('Phone not available', 'No mobile number on this order.');
      return;
    }
    Linking.openURL(`tel:${raw}`).catch(() => {
      Alert.alert('Call failed', `Could not open dialer for ${raw}.`);
    });
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => matchesCancelledCategory(o, activeFilter))
      .filter(o => matchesOrderSearch(o, search))
      .sort((a, b) => Number(b.id) - Number(a.id));
  }, [orders, activeFilter, search]);

  const filterCounts = useMemo(() => {
    const counts: Record<CancelledItemFilter, number> = {
      ALL: orders.length,
      BL: orders.filter(o => matchesCancelledCategory(o, 'BL')).length,
      RK: orders.filter(o => matchesCancelledCategory(o, 'RK')).length,
      BP: orders.filter(o => matchesCancelledCategory(o, 'BP')).length,
      HB: orders.filter(o => matchesCancelledCategory(o, 'HB')).length,
      REWARD: orders.filter(o => matchesCancelledCategory(o, 'REWARD')).length,
    };
    return counts;
  }, [orders]);

  return (
    <AdminScreenLayout title="Cancelled Orders" tab="AdminDashboard" showBack>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Cancelled Orders</Text>
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>{orders.length}</Text>
        </View>
      </View>
      <Text style={styles.sub}>
        All orders cancelled by devotees or administration.
      </Text>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search order no, devotee, phone, item..."
          placeholderTextColor={Colors.placeholder}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setSearch('')}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}>
        {CANCELLED_FILTERS.map(f => {
          const active = activeFilter === f.id;
          const count = filterCounts[f.id] || 0;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.id)}
              activeOpacity={0.85}>
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}>
                {f.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.templeGold} size="large" />
          <Text style={styles.loadingText}>Loading cancelled orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={loadCancelledOrders}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No cancelled orders</Text>
          <Text style={styles.emptySubtitle}>
            {search
              ? 'No cancelled orders match your search criteria.'
              : 'There are currently no cancelled orders in this category.'}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredOrders.map(order => {
            const displayMobile =
              order.customerMobile || order.mobileNumber || '';
            const userDisplay =
              order.userCode || (order.userId ? `BPJS${String(order.userId).padStart(2, '0')}` : '');

            return (
              <View key={order.id} style={styles.card}>
                {/* Header: Order No, Date & Cancelled Tag */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text selectable={true} style={styles.orderNo}>{order.orderNo}</Text>
                    <Text selectable={true} style={styles.orderDate}>{order.date}</Text>
                  </View>
                  <View style={styles.cancelledBadge}>
                    <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
                  </View>
                </View>

                {/* Product / Seva title */}
                <Text selectable={true} style={styles.productTitle}>{order.product}</Text>

                {/* Devotee Info */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Devotee:</Text>
                  <Text selectable={true} style={styles.infoValue}>
                    {order.customer} {userDisplay ? `(${userDisplay})` : ''}
                  </Text>
                </View>

                {displayMobile ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mobile:</Text>
                    <TouchableOpacity
                      onPress={() => dialCustomer(displayMobile)}
                      activeOpacity={0.7}>
                      <Text selectable={true} style={styles.phoneLink}>📞 {displayMobile}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Cancelled By & Reason Box */}
                <View style={styles.cancelDetailsBox}>
                  <View style={styles.cancelMetaRow}>
                    <Text style={styles.cancelMetaLabel}>Cancelled By:</Text>
                    <Text style={styles.cancelMetaValue}>
                      {String(order.cancelledBy || '').toUpperCase() === 'ADMIN'
                        ? 'ADMINISTRATOR'
                        : 'DEVOTEE'}
                    </Text>
                  </View>
                  <View style={styles.reasonRow}>
                    <Text style={styles.cancelMetaLabel}>Reason:</Text>
                    <Text selectable={true} style={styles.reasonText}>
                      {order.cancelReason || 'No specific reason provided.'}
                    </Text>
                  </View>
                </View>

                {/* Remarks if any */}
                {order.remarks ? (
                  <Text selectable={true} style={styles.remarksText}>
                    Address/Remarks: {order.remarks}
                  </Text>
                ) : null}

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() =>
                      navigation.navigate('AdminOrderDetails', {id: order.id})
                    }
                    activeOpacity={0.85}>
                    <Text style={styles.detailsBtnText}>VIEW FULL DETAILS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.bottomPad} />
    </AdminScreenLayout>
  );
};

export default AdminCancelledOrdersScreen;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  badgeCount: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeCountText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.sacredBrown,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    padding: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#DC2626',
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderNo: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cancelledBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cancelledBadgeText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  phoneLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  cancelDetailsBox: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    gap: 4,
  },
  cancelMetaRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cancelMetaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7F1D1D',
  },
  cancelMetaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  reasonRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 16,
  },
  remarksText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  cardActions: {
    marginTop: 6,
  },
  detailsBtn: {
    backgroundColor: Colors.templeGold,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bottomPad: {
    height: 30,
  },
});

