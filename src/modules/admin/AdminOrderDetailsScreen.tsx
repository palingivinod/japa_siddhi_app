import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminOrderStatus} from './adminData';

const CYCLE: AdminOrderStatus[] = ['Under Review', 'Confirmed', 'Shipped', 'Delivered'];

type OrderDetail = {
  id: string;
  orderNo: string;
  product: string;
  customer: string;
  status: AdminOrderStatus;
  orderType?: string;
  orderSource?: string;
  paymentStatus?: string;
  quantity?: number;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  customerEmail?: string;
  customerMobile?: string;
  userId?: string | null;
  challengeId?: number | null;
  rewardName?: string | null;
  delivery?: {
    fullName?: string;
    mobile?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    gothram?: string;
    nakshatram?: string;
  };
};

const formatWhen = (raw?: string | null) => {
  if (!raw) {
    return '—';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DetailRow = ({label, value}: {label: string; value?: string | number | null}) => {
  const text = value === undefined || value === null || value === '' ? '—' : String(value);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{text}</Text>
    </View>
  );
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

const MobileDetailRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => {
  const text =
    value === undefined || value === null || value === ''
      ? '—'
      : String(value);
  const hasNumber = Boolean(
    value &&
      value.trim() &&
      value.trim() !== '—' &&
      value.replace(/[^\d]/g, '').length >= 5,
  );

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.mobileValueRow}>
        <Text style={styles.detailValue}>{text}</Text>
        {hasNumber ? (
          <View style={styles.contactActions}>
            <TouchableOpacity
              style={[styles.contactBtn, styles.phoneBtn]}
              onPress={() => handleCall(value!)}
              activeOpacity={0.7}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.contactBtnIcon}>📞</Text>
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactBtn, styles.whatsappBtn]}
              onPress={() => handleWhatsApp(value!)}
              activeOpacity={0.7}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.contactBtnIcon}>💬</Text>
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const AdminOrderDetailsScreen = () => {
  const route = useRoute<any>();
  const orderId = String(route.params?.orderId || '');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const applyOrder = (data: any): OrderDetail => ({
    id: String(data.id),
    orderNo: data.orderNo || `#${data.id}`,
    product: data.product || 'Item',
    customer: data.customer || 'Devotee',
    status:
      data.status === 'Delivered'
        ? 'Delivered'
        : data.status === 'Shipped'
          ? 'Shipped'
          : data.status === 'Confirmed'
            ? 'Confirmed'
            : data.status === 'Under Review'
              ? 'Under Review'
              : 'Processing',
    orderType: data.orderType || '',
    orderSource: data.orderSource || '',
    paymentStatus: data.paymentStatus || '',
    quantity: Number(data.quantity || 1),
    remarks: data.remarks || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    customerEmail: data.customerEmail || '',
    customerMobile: data.customerMobile || '',
    userId: data.userId || null,
    challengeId: data.challengeId || null,
    rewardName: data.rewardName || null,
    delivery: data.delivery || {},
  });

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError('Missing order id.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get(`/admin/orders/${orderId}`);
      setOrder(applyOrder(response.data?.data || {}));
    } catch (err) {
      setOrder(null);
      setError(getApiError(err, 'Could not load order.'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder]),
  );

  const confirmOrder = async () => {
    if (!order) {
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.put(`/admin/orders/${order.id}/confirm`);
      setOrder(applyOrder(response.data?.data || {}));
      Alert.alert('Order Confirmed', `Order ${order.orderNo} is now confirmed.`);
    } catch (err) {
      Alert.alert(
        'Confirmation failed',
        getApiError(err, 'Could not confirm order.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const advanceStatus = async (next: AdminOrderStatus) => {
    if (!order) {
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.put(`/admin/orders/${order.id}/status`, {
        status: next,
      });
      setOrder(applyOrder(response.data?.data || {}));
      Alert.alert('Status updated', `Order is now ${next}.`);
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update order status.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const isBaanalingam =
    String(order?.product || '').toLowerCase().includes('banalingam') ||
    String(order?.product || '').toLowerCase().includes('baanalingam') ||
    String(order?.orderType || '').toLowerCase().includes('banalingam') ||
    String(order?.orderType || '').toLowerCase().includes('baanalingam') ||
    String(order?.rewardName || '').toLowerCase().includes('banalingam') ||
    String(order?.rewardName || '').toLowerCase().includes('baanalingam');

  const delivery = order?.delivery || {};
  const fullAddress = [
    delivery.address,
    delivery.city,
    delivery.state,
    delivery.pinCode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <AdminScreenLayout title="Order Details" tab="AdminOrders" showBack>
      <Text style={styles.heading}>Order Details</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadOrder}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {order ? (
        <>
          <Text style={styles.sub}>
            Order {order.orderNo} • {order.product}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Order</Text>
            <DetailRow label="Order number" value={order.orderNo} />
            <DetailRow label="Item" value={order.product} />
            <DetailRow label="Quantity" value={order.quantity} />
            <DetailRow label="Order type" value={order.orderType} />
            <DetailRow label="Source" value={order.orderSource} />
            {!isBaanalingam ? (
              <DetailRow label="Payment status" value={order.paymentStatus} />
            ) : null}
            <DetailRow label="Order status" value={order.status} />
            <DetailRow label="Placed at" value={formatWhen(order.createdAt)} />
            <DetailRow label="Updated at" value={formatWhen(order.updatedAt)} />
            {order.rewardName ? (
              <DetailRow label="Reward" value={order.rewardName} />
            ) : null}
            {order.challengeId ? (
              <DetailRow label="Challenge id" value={order.challengeId} />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Devotee</Text>
            <View style={styles.row}>
              <Text style={styles.customer}>{order.customer}</Text>
              <View
                style={[
                  styles.pill,
                  order.status === 'Under Review'
                    ? styles.pillReview
                    : order.status === 'Confirmed'
                      ? styles.pillConfirmed
                      : order.status === 'Delivered'
                        ? styles.pillDelivered
                        : styles.pillShipped,
                ]}>
                <Text
                  style={[
                    styles.pillText,
                    order.status === 'Under Review'
                      ? styles.pillTextReview
                      : order.status === 'Confirmed'
                        ? styles.pillTextConfirmed
                        : order.status === 'Delivered'
                          ? styles.pillTextDelivered
                          : styles.pillTextShipped,
                  ]}>
                  {order.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <DetailRow label="User id" value={order.userId} />
            <DetailRow label="Email" value={order.customerEmail} />
            <MobileDetailRow
              label="Mobile"
              value={order.customerMobile}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Delivery address</Text>
            <DetailRow
              label="Full name"
              value={delivery.fullName || order.customer}
            />
            <MobileDetailRow
              label="Mobile"
              value={delivery.mobile}
            />
            <DetailRow label="Email" value={delivery.email} />
            <DetailRow label="Address" value={delivery.address} />
            <DetailRow label="City" value={delivery.city} />
            <DetailRow label="State" value={delivery.state} />
            <DetailRow label="PIN code" value={delivery.pinCode} />
            {fullAddress ? (
              <DetailRow label="Full address" value={fullAddress} />
            ) : null}
            {delivery.gothram ? (
              <DetailRow label="Gothram" value={delivery.gothram} />
            ) : null}
            {delivery.nakshatram ? (
              <DetailRow label="Nakshatram" value={delivery.nakshatram} />
            ) : null}
          </View>

          {order.status === 'Under Review' ? (
            <PrimaryButton
              title={saving ? 'CONFIRMING...' : '✓ CONFIRM / APPROVE ORDER'}
              onPress={confirmOrder}
              disabled={saving}
            />
          ) : order.status === 'Confirmed' ? (
            <PrimaryButton
              title={saving ? 'UPDATING...' : '🚚 MARK AS SHIPPED'}
              onPress={() => advanceStatus('Shipped')}
              disabled={saving}
            />
          ) : order.status === 'Shipped' ? (
            <PrimaryButton
              title={saving ? 'UPDATING...' : '📦 MARK AS DELIVERED'}
              onPress={() => advanceStatus('Delivered')}
              disabled={saving}
            />
          ) : (
            <PrimaryButton
              title={saving ? 'UPDATING...' : '✓ ORDER DELIVERED (COMPLETED)'}
              onPress={() => Alert.alert('Order Completed', 'This order has already been delivered.')}
              disabled={saving}
            />
          )}
        </>
      ) : null}
    </AdminScreenLayout>
  );
};

export default AdminOrderDetailsScreen;

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
  centerBox: {paddingVertical: 20, alignItems: 'center'},
  errorText: {color: Colors.error, marginBottom: 12, fontWeight: '600'},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customer: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillReview: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  pillConfirmed: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  pillShipped: {
    backgroundColor: '#F3E8FF',
    borderColor: '#9333EA',
  },
  pillDelivered: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  pillText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
  },
  pillTextReview: {
    color: '#B45309',
  },
  pillTextConfirmed: {
    color: '#0369A1',
  },
  pillTextShipped: {
    color: '#7E22CE',
  },
  pillTextDelivered: {
    color: '#15803D',
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  detailValue: {
    color: Colors.sacredBrown,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 21,
  },
  mobileValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  phoneBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  whatsappBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  contactBtnIcon: {
    fontSize: 13,
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
});
