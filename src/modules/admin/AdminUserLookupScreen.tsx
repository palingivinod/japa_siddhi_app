import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

type LookupOrder = {
  id: string;
  orderNumber: string;
  itemName: string;
  orderType: string;
  orderSource: string;
  quantity: number;
  status: string;
  paymentStatus: string;
  createdAt: string | null;
  remarks: string;
  isDuplicate: boolean;
};

type LookupUser = {
  id: string;
  userCode: string;
  name: string;
  email: string;
  mobile: string;
  status: string;
  japaCount: number;
  appVersion?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  postalCode?: string;
  region?: string;
  stateName?: string;
  cityName?: string;
  maritalStatus?: string;
  spouseName?: string;
  gothram?: string;
  nakshatram?: string;
  orderSummary: {
    total: number;
    underReview: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    duplicates: number;
  };
  orders: LookupOrder[];
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  try {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN');
    }
  } catch {
    // ignore
  }
  return raw.slice(0, 16);
};

const statusColor = (status: string) => {
  if (status === 'Delivered') return Colors.leafGreen;
  if (status === 'Shipped') return Colors.templeGold;
  if (status === 'Cancelled') return Colors.error;
  if (status === 'Under Review') return '#B45309';
  return Colors.sacredBrown;
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => {
  const text =
    value === undefined || value === null || String(value).trim() === ''
      ? '—'
      : String(value);
  return (
    <Text selectable style={styles.detailRow}>
      {label}: {text}
    </Text>
  );
};

const AdminUserLookupScreen = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [users, setUsers] = useState<LookupUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Search by name, UID, phone, or email.');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const loadLookup = useCallback(async (q: string) => {
    if (q.length < 2) {
      setUsers([]);
      setError('');
      setHint('Enter at least 2 characters to search.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setHint('');
    try {
      const response = await apiService.get('/admin/user-lookup', {
        params: {q},
      });
      const payload = response.data?.data || {};
      const list = Array.isArray(payload.users) ? payload.users : [];
      setUsers(
        list.map((row: any) => ({
          id: String(row.id),
          userCode:
            String(row.userCode || '').trim() ||
            `BPJS${String(row.id).padStart(2, '0')}`,
          name: row.name || 'Devotee',
          email: row.email || '',
          mobile: row.mobile || '—',
          status: row.status === 'Blocked' ? 'Blocked' : 'Active',
          japaCount: Number(row.japaCount) || 0,
          appVersion: String(row.appVersion || '').trim(),
          gender: row.gender || '',
          dateOfBirth: row.dateOfBirth || '',
          address: row.address || '',
          postalCode: row.postalCode || '',
          region: row.region || '',
          stateName: row.stateName || '',
          cityName: row.cityName || '',
          maritalStatus: row.maritalStatus || '',
          spouseName: row.spouseName || '',
          gothram: row.gothram || '',
          nakshatram: row.nakshatram || '',
          orderSummary: {
            total: Number(row.orderSummary?.total) || 0,
            underReview: Number(row.orderSummary?.underReview) || 0,
            shipped: Number(row.orderSummary?.shipped) || 0,
            delivered: Number(row.orderSummary?.delivered) || 0,
            cancelled: Number(row.orderSummary?.cancelled) || 0,
            duplicates: Number(row.orderSummary?.duplicates) || 0,
          },
          orders: Array.isArray(row.orders)
            ? row.orders.map((o: any) => ({
                id: String(o.id),
                orderNumber: String(o.orderNumber || ''),
                itemName: String(o.itemName || 'Order'),
                orderType: String(o.orderType || ''),
                orderSource: String(o.orderSource || ''),
                quantity: Number(o.quantity) || 1,
                status: String(o.status || 'Unknown'),
                paymentStatus: String(o.paymentStatus || ''),
                createdAt: o.createdAt || null,
                remarks: String(o.remarks || ''),
                isDuplicate: Boolean(o.isDuplicate),
              }))
            : [],
        })),
      );
      if (!list.length) {
        setHint('No devotees matched that search.');
      }
    } catch (err) {
      setUsers([]);
      setError(getApiError(err, 'Could not run user lookup.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLookup(debouncedQ);
  }, [debouncedQ, loadLookup]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}),
      ),
    [users],
  );

  return (
    <AdminScreenLayout title="User Lookup" tab="AdminUsers" showBack>
      <Text style={styles.heading}>User Lookup</Text>
      <Text style={styles.sub}>
        Search a devotee, then open full details and every order (delivered,
        shipped, under review, duplicates, cancelled).
      </Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Name, UID, phone, or email"
        placeholderTextColor={Colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={() => loadLookup(debouncedQ)}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {!loading && sortedUsers.length > 0 ? (
        <Text style={styles.count}>
          {sortedUsers.length} devotee{sortedUsers.length === 1 ? '' : 's'} (A→Z)
        </Text>
      ) : null}

      {sortedUsers.map(user => {
        const open = expandedId === user.id;
        const s = user.orderSummary;
        return (
          <View key={user.id} style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setExpandedId(open ? null : user.id)}>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <Text style={styles.name}>{user.name}</Text>
                  <Text style={styles.meta}>
                    {user.userCode} · {user.mobile}
                  </Text>
                  <Text style={styles.meta}>
                    {user.status} · Japa {user.japaCount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
              </View>
              <Text style={styles.summaryLine}>
                Orders {s.total} · Review {s.underReview} · Shipped {s.shipped} ·
                Delivered {s.delivered}
                {s.duplicates > 0 ? ` · Dup ${s.duplicates}` : ''}
                {s.cancelled > 0 ? ` · Cancelled ${s.cancelled}` : ''}
              </Text>
            </TouchableOpacity>

            {open ? (
              <View style={styles.expanded}>
                <Text style={styles.sectionTitle}>Details</Text>
                <DetailRow label="Email" value={user.email} />
                <DetailRow
                  label="App version"
                  value={user.appVersion || 'Not opened yet'}
                />
                <DetailRow label="Gender" value={user.gender} />
                <DetailRow label="DOB" value={user.dateOfBirth} />
                <DetailRow label="Marital" value={user.maritalStatus} />
                <DetailRow label="Spouse" value={user.spouseName} />
                <DetailRow label="Gothram" value={user.gothram} />
                <DetailRow label="Nakshatram" value={user.nakshatram} />
                <DetailRow label="Address" value={user.address} />
                <DetailRow label="Pincode" value={user.postalCode} />
                <DetailRow label="City" value={user.cityName} />
                <DetailRow label="State" value={user.stateName} />
                <DetailRow label="Region" value={user.region} />

                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() =>
                    navigation.navigate('AdminUserDetails', {userId: user.id})
                  }>
                  <Text style={styles.linkBtnText}>Open full profile</Text>
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, {marginTop: 14}]}>
                  All orders ({user.orders.length})
                </Text>
                {user.orders.length === 0 ? (
                  <Text style={styles.emptyOrders}>No orders for this devotee.</Text>
                ) : (
                  user.orders.map(order => (
                    <TouchableOpacity
                      key={order.id}
                      style={[
                        styles.orderRow,
                        order.isDuplicate ? styles.orderDup : null,
                      ]}
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate('AdminOrderDetails', {
                          orderId: order.id,
                        })
                      }>
                      <View style={styles.orderTop}>
                        <Text style={styles.orderName} numberOfLines={2}>
                          {order.itemName}
                        </Text>
                        <Text
                          style={[
                            styles.orderStatus,
                            {color: statusColor(order.status)},
                          ]}>
                          {order.status}
                        </Text>
                      </View>
                      <Text style={styles.orderMeta}>
                        {order.orderNumber || `#${order.id}`} · Qty{' '}
                        {order.quantity} · {formatDate(order.createdAt)}
                      </Text>
                      {order.isDuplicate ? (
                        <Text style={styles.dupBadge}>Possible duplicate</Text>
                      ) : null}
                      {order.remarks ? (
                        <Text style={styles.orderRemarks} numberOfLines={2}>
                          {order.remarks}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminUserLookupScreen;

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
    fontWeight: '600',
    lineHeight: 20,
  },
  search: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.sacredBrown,
    fontWeight: '600',
    marginBottom: 12,
  },
  centerBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
    fontWeight: '600',
  },
  hint: {
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 10,
  },
  count: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardCopy: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  chevron: {
    color: Colors.templeGold,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryLine: {
    marginTop: 8,
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 12,
  },
  expanded: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 12,
  },
  sectionTitle: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 6,
  },
  detailRow: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontWeight: '600',
    fontSize: 14,
  },
  linkBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  linkBtnText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 13,
  },
  emptyOrders: {
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  orderRow: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cream,
  },
  orderDup: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderName: {
    flex: 1,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14,
  },
  orderStatus: {
    fontWeight: '800',
    fontSize: 12,
  },
  orderMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  dupBadge: {
    marginTop: 4,
    color: Colors.error,
    fontWeight: '800',
    fontSize: 12,
  },
  orderRemarks: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
  },
});
