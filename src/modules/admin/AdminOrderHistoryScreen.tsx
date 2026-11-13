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
import {resolveProfilePhone} from '../../utils/profilePhone';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminOrder} from './adminData';

const digitsOnly = (value?: string) => String(value || '').replace(/\D/g, '');

/** Show +91 98765… once — never “91 +91 …” when customerMobile already has country code. */
const formatOrderPhoneDisplay = (order: AdminOrder) => {
  const rawLocal = String(order.mobileNumber || order.customerMobile || '').trim();
  if (!rawLocal) {
    return '';
  }
  const resolved = resolveProfilePhone({
    mobileCountryCode: order.mobileCountryCode || '91',
    mobileNumber: rawLocal,
  });
  if (!resolved.mobile) {
    return rawLocal;
  }
  return `+${resolved.countryCode} ${resolved.mobile}`;
};

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
export type HistoryStatusFilter = 'ALL' | 'SHIPPED' | 'DELIVERED';

const HISTORY_FILTERS: Array<{id: HistoryItemFilter; label: string}> = [
  {id: 'ALL', label: 'All Orders'},
  {id: 'BL', label: 'Baanalingam'},
  {id: 'RK', label: 'Ramakoti'},
  {id: 'BP', label: 'Bhirava Pendant'},
  {id: 'HB', label: 'Homa Bhasmam'},
  {id: 'REWARD', label: 'Rewards'},
];

const STATUS_FILTERS: Array<{id: HistoryStatusFilter; label: string}> = [
  {id: 'ALL', label: 'All status'},
  {id: 'SHIPPED', label: 'Shipped'},
  {id: 'DELIVERED', label: 'Delivered'},
];

type HistorySortMode =
  | 'userIdAsc'
  | 'userIdDesc'
  | 'dateRecent'
  | 'dateOldest';

const HISTORY_SORT_TABS: Array<{id: HistorySortMode; label: string}> = [
  {id: 'userIdAsc', label: 'User ID (Ascending)'},
  {id: 'userIdDesc', label: 'User ID (Descending)'},
  {id: 'dateRecent', label: 'Date (Recent)'},
  {id: 'dateOldest', label: 'Date (Oldest)'},
];

const orderDateValue = (order: AdminOrder) => {
  const raw =
    order.userReceivedAt ||
    order.createdAt ||
    order.date ||
    '';
  const ms = new Date(String(raw)).getTime();
  if (Number.isFinite(ms) && ms > 0) {
    return ms;
  }
  return Number(order.id) || 0;
};

const orderUserIdValue = (order: AdminOrder) =>
  order.userId != null && Number(order.userId) > 0
    ? Number(order.userId)
    : 999999999;

/** Order list timestamps without seconds (YYYY-MM-DD HH:mm IST wall). */
const formatOrderWhen = (raw?: string | null): string => {
  const str = String(raw || '').trim();
  if (!str) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  if (/Z$/i.test(str) || /[+-]\d{2}:\d{2}$/.test(str)) {
    const ms = Date.parse(str.includes(' ') ? str.replace(' ', 'T') : str);
    if (Number.isFinite(ms)) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(new Date(ms));
      const get = (type: string) =>
        parts.find(part => part.type === type)?.value || '00';
      let hour = get('hour');
      if (hour === '24') {
        hour = '00';
      }
      return `${get('year')}-${get('month')}-${get('day')} ${hour}:${get(
        'minute',
      )}`;
    }
  }
  const match = str.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?/,
  );
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return str.replace(/:\d{2}(?=\s|$)/, '').slice(0, 16);
};

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
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('ALL');
  const [sortMode, setSortMode] = useState<HistorySortMode>('dateRecent');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDeliveredOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/orders', {
        params: {includeDeleted: 'true', scope: 'history'},
      });
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
          userId:
            row.userId != null && Number(row.userId) > 0
              ? Number(row.userId)
              : null,
          userReceived: Boolean(row.userReceived ?? row.user_received),
          userReceivedAt: row.userReceivedAt || row.user_received_at || '',
        }))
        // Shipped and delivered orders belong in Order History
        .filter(
          (o: AdminOrder) => o.status === 'Delivered' || o.status === 'Shipped',
        );

      setOrders(mapped);
    } catch (err) {
      setOrders([]);
      setError(getApiError(err, 'Could not load order history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const permanentDeleteOrder = (orderId: string, orderNo: string) => {
    Alert.alert(
      'Permanent Delete',
      `Permanently delete ${orderNo} from the database? This will completely remove it from the database and cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(orderId);
            try {
              await apiService.delete(`/admin/orders/${orderId}`, {
                params: {permanent: 'true'},
              });
              setOrders(prev => prev.filter(o => o.id !== orderId));
              Alert.alert(
                'Deleted',
                `Order ${orderNo} has been completely removed from database.`,
              );
            } catch (err) {
              Alert.alert(
                'Delete failed',
                getApiError(err, 'Could not delete order from database.'),
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadDeliveredOrders();
    }, [loadDeliveredOrders]),
  );

  const searchActive = search.trim().length > 0;

  const filteredOrders = useMemo(() => {
    const list = orders.filter(order => {
      const matchesSearch = matchesOrderSearch(order, search);
      const matchesCategory = matchesHistoryCategory(order, categoryFilter);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SHIPPED' && order.status === 'Shipped') ||
        (statusFilter === 'DELIVERED' && order.status === 'Delivered');
      return matchesSearch && matchesCategory && matchesStatus;
    });
    return [...list].sort((a, b) => {
      if (sortMode === 'dateRecent' || sortMode === 'dateOldest') {
        const d =
          sortMode === 'dateRecent'
            ? orderDateValue(b) - orderDateValue(a)
            : orderDateValue(a) - orderDateValue(b);
        if (d !== 0) {
          return d;
        }
        return Number(b.id) - Number(a.id);
      }
      const uA = orderUserIdValue(a);
      const uB = orderUserIdValue(b);
      if (uA !== uB) {
        return sortMode === 'userIdDesc' ? uB - uA : uA - uB;
      }
      return Number(b.id) - Number(a.id);
    });
  }, [orders, search, categoryFilter, statusFilter, sortMode]);

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

  const statusCounts = useMemo(() => {
    return {
      ALL: orders.length,
      SHIPPED: orders.filter(o => o.status === 'Shipped').length,
      DELIVERED: orders.filter(o => o.status === 'Delivered').length,
    };
  }, [orders]);

  return (
    <AdminScreenLayout title="Order History" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Order History</Text>
      <Text style={styles.sub}>
        All shipped and delivered orders archive across all categories.
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
          Showing matches for “{search.trim()}” ({filteredOrders.length})
        </Text>
      ) : null}

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>TOTAL ARCHIVED ORDERS</Text>
          <Text style={styles.summaryCount}>{orders.length}</Text>
        </View>
        <View style={styles.deliveredPill}>
          <Text style={styles.deliveredPillText}>📦 Shipped & Delivered</Text>
        </View>
      </View>

      {/* Sort — same options as Active Orders */}
      <View style={styles.sortBox}>
        <Text style={styles.sortHeader}>SORT BY</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortScroll}>
          {HISTORY_SORT_TABS.map(item => {
            const active = sortMode === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.sortChip, active && styles.sortChipActive]}
                activeOpacity={0.8}
                onPress={() => setSortMode(item.id)}>
                <Text
                  style={[
                    styles.sortChipText,
                    active && styles.sortChipTextActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Status Filter: All / Shipped / Delivered */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}>
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.id;
            const count = statusCounts[f.id] || 0;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.categoryChip,
                  active && styles.statusChipActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setStatusFilter(f.id)}>
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
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.empty}>
            {searchActive
              ? `No orders matched “${search.trim()}”.`
              : 'No shipped or delivered orders in this category yet.'}
          </Text>
          {searchActive ||
          categoryFilter !== 'ALL' ||
          statusFilter !== 'ALL' ? (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setSearch('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
              }}>
              <Text style={styles.resetBtnText}>Clear Search & Filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Order Cards */}
      {filteredOrders.map(order => {
        const mobile = formatOrderPhoneDisplay(order);

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
                  <Text selectable={true} style={styles.orderNo}>{order.orderNo}</Text>
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
                <Text selectable={true} style={styles.productText}>
                  {order.rewardName || order.product}
                </Text>
                <Text selectable={true} style={styles.devoteeText}>Devotee: {order.customer}</Text>
                {(order as any).createdAt || (order as any).date ? (
                  <Text selectable={true} style={styles.dateText}>
                    Placed:{' '}
                    {formatOrderWhen(
                      (order as any).createdAt || (order as any).date,
                    )}
                  </Text>
                ) : null}
              </View>

              <View style={styles.statusCol}>
                <View
                  style={[
                    styles.statusPill,
                    order.status === 'Shipped'
                      ? styles.statusPillShipped
                      : styles.statusPillDelivered,
                  ]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      order.status === 'Shipped'
                        ? styles.statusPillTextShipped
                        : styles.statusPillTextDelivered,
                    ]}>
                    {order.status === 'Shipped' ? '🚚 SHIPPED' : '✓ DELIVERED'}
                  </Text>
                </View>
                {order.userReceived ? (
                  <View style={styles.userConfirmedBadge}>
                    <Text style={styles.userConfirmedText}>From user: Delivered ✓</Text>
                  </View>
                ) : (
                  <View style={styles.userPendingBadge}>
                    <Text style={styles.userPendingText}>From user: Pending</Text>
                  </View>
                )}
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

            {/* Permanent Delete Action */}
            <View style={styles.historyActionRow}>
              <TouchableOpacity
                style={[
                  styles.historyDeleteBtn,
                  deletingId === order.id && styles.btnDisabled,
                ]}
                disabled={deletingId === order.id}
                onPress={() => permanentDeleteOrder(order.id, order.orderNo)}>
                <Text style={styles.historyDeleteBtnText}>
                  {deletingId === order.id
                    ? 'DELETING...'
                    : 'DELETE FROM DATABASE'}
                </Text>
              </TouchableOpacity>
            </View>
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
  sortBox: {
    marginBottom: 10,
  },
  sortHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.leafGreen,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sortScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    paddingBottom: 4,
  },
  sortChip: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sortChipActive: {
    backgroundColor: Colors.sacredBrown,
    borderColor: Colors.sacredBrown,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  sortChipTextActive: {
    color: Colors.white,
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
  statusChipActive: {
    backgroundColor: Colors.leafGreen,
    borderColor: Colors.leafGreen,
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
  statusCol: {
    alignItems: 'flex-end',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillShipped: {
    backgroundColor: '#F3E8FF',
    borderColor: '#9333EA',
  },
  statusPillDelivered: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPillTextShipped: {
    color: '#7E22CE',
  },
  statusPillTextDelivered: {
    color: '#15803D',
  },
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
  historyActionRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    alignItems: 'flex-end',
  },
  historyDeleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  historyDeleteBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  bottomSpacer: {
    height: 30,
  },
});
