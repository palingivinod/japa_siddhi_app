import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
import AppIcon from '../../components/icons/AppIcon';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';

const TABS: Array<{id: string; key: TranslationKey}> = [
  {id: 'All', key: 'orderTabAll'},
  {id: 'Pending', key: 'orderTabPending'},
  {id: 'Shipped', key: 'orderTabShipped'},
  {id: 'Delivered', key: 'orderTabDelivered'},
];

const statusOf = (item: any) =>
  String(item.orderStatus || item.status || item.currentStatus || '').toLowerCase().trim();

const isDeliveredStatus = (raw: string) => {
  const s = String(raw || '').toLowerCase().trim();
  return s.includes('deliver') && !s.includes('out for delivery');
};

const isShippedStatus = (raw: string) => {
  const s = String(raw || '').toLowerCase().trim();
  if (isDeliveredStatus(s)) return false;
  return (
    s.includes('ship') ||
    s.includes('out for delivery') ||
    s.includes('transit')
  );
};

const isCancelledStatus = (raw: string) => {
  const s = String(raw || '').toLowerCase().trim();
  return s.includes('cancel');
};

const isPendingStatus = (raw: string) => {
  const s = String(raw || '').toLowerCase().trim();
  // Delivered, Shipped, or Cancelled orders are not pending
  if (isDeliveredStatus(s) || isShippedStatus(s) || isCancelledStatus(s)) {
    return false;
  }
  // Matches Under Review, Called, Sankalp, Confirmed, Packing, Processing, Ready,
  // or any other "not shipped yet" status
  return true;
};

const formatStatus = (raw: string, t: any) => {
  const value = String(raw || '').toLowerCase().trim();
  if (value.includes('deliver') && !value.includes('out for delivery')) {
    return t('orderTabDelivered');
  }
  if (value.includes('ship') || value.includes('out for delivery')) {
    return t('orderTabShipped');
  }
  if (value.includes('pack')) {
    return t('orderTabPacking');
  }
  if (value.includes('confirm')) {
    return 'Order Confirmed';
  }
  if (value.includes('sankalp')) {
    return 'Sankalp taken by devotee';
  }
  if (value.includes('call')) {
    return 'Called and talked with devotee';
  }
  if (value.includes('cancel')) {
    return t('orderTabCancelled');
  }
  if (value.includes('review') || value.includes('pend')) {
    return 'Under Review';
  }
  return 'Processing';
};

const OrdersScreen = () => {
  const navigation = useNavigation<any>();
  const {t, tt} = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    setRawError(null);
    apiService
      .get('/orders')
      .then(response => setOrders(response.data.data ?? []))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, t('couldNotLoadOrders')));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submitCancel = async () => {
    const nextReason = reason.trim();
    if (nextReason.length < 3 || !cancelTarget?.id) {
      setCancelError(t('cancelReasonRequired'));
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      await apiService.put(`/orders/${cancelTarget.id}/cancel`, {reason: nextReason});
      setOrders(prev =>
        prev.map(item =>
          item.id === cancelTarget.id
            ? {...item, orderStatus: 'CANCELLED', cancelReason: nextReason}
            : item,
        ),
      );
      setCancelTarget(null);
      setReason('');
    } catch (err) {
      setCancelError(getApiError(err, t('cancelReasonRequired')));
    } finally {
      setCancelling(false);
    }
  };

  const confirmDelete = (item: any) => {
    Alert.alert(
      t('delete') || 'Delete',
      'Are you sure you want to delete this order from your list?',
      [
        {text: t('cancel') || 'Cancel', style: 'cancel'},
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: () => void deleteOrder(item.id),
        },
      ],
    );
  };

  const deleteOrder = async (id: number) => {
    setDeletingId(id);
    try {
      await apiService.delete(`/orders/${id}`);
      setOrders(prev => prev.filter(order => order.id !== id));
    } catch (err) {
      Alert.alert(
        t('deleteFailed') || 'Delete Failed',
        getApiError(err, 'Could not delete order.'),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const confirmReceived = (orderItem: any) => {
    Alert.alert(
      'Confirm Delivery',
      'Have you received your order package safely?',
      [
        {text: t('cancel') || 'Cancel', style: 'cancel'},
        {
          text: 'Yes, I Received It',
          style: 'default',
          onPress: async () => {
            setConfirmingId(orderItem.id);
            try {
              await apiService.put(`/orders/${orderItem.id}/received`);
              setOrders(prev =>
                prev.map(o =>
                  o.id === orderItem.id
                    ? {...o, userReceived: true, user_received: 1}
                    : o,
                ),
              );
              Alert.alert('Delivery Confirmed', 'Thank you for confirming receipt of your order!');
            } catch (err) {
              Alert.alert('Error', getApiError(err, 'Could not confirm order receipt.'));
            } finally {
              setConfirmingId(null);
            }
          },
        },
      ],
    );
  };

  const visible = useMemo(() => {
    if (tab === 'All') {
      return orders;
    }
    if (tab === 'Pending') {
      return orders.filter(item => isPendingStatus(statusOf(item)));
    }
    if (tab === 'Shipped') {
      return orders.filter(item => isShippedStatus(statusOf(item)));
    }
    if (tab === 'Delivered') {
      return orders.filter(item => isDeliveredStatus(statusOf(item)));
    }
    return orders;
  }, [orders, tab]);

  return (
    <ScreenLayout title="My Orders" showBack tab="Orders">
      <View style={styles.tabs}>
        {TABS.map(item => (
          <TouchableOpacity key={item.id} onPress={() => setTab(item.id)}>
            <Text style={[styles.tab, tab === item.id && styles.tabActive]}>
              {t(item.key)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {!loading && !error && visible.length === 0 ? (
        <Text style={styles.empty}>{t('noOrdersYet')}</Text>
      ) : null}
      {visible.map(item => {
        const itemText = `${item.itemName || ''} ${item.productName || ''} ${item.donationType || ''} ${item.orderNumber || ''}`.toLowerCase();
        const isBaanalingam = itemText.includes('banalingam') || itemText.includes('baanalingam') || itemText.includes('lingam') || itemText.includes('shiva');
        const isRamakoti = itemText.includes('ramakoti') || itemText.includes('rk0');
        const isHoma = itemText.includes('homa bhasma') || itemText.includes('hb0');
        const isBirava = itemText.includes('birava') || itemText.includes('bp0');
        const rawStatus = statusOf(item);
        const isDelivered = isDeliveredStatus(rawStatus);
        const userReceived = Boolean(item.userReceived || item.user_received);
        const canCancel = !rawStatus.includes('deliver') && !rawStatus.includes('cancel');
        const canDelete = isDeliveredStatus(rawStatus) || isCancelledStatus(rawStatus);

        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.dot}>
              {isBaanalingam ? (
                <AppIcon name="banalingam" size={30} />
              ) : isRamakoti ? (
                <AppIcon name="ramakoti" size={30} />
              ) : isHoma ? (
                <AppIcon name="homaBhasma" size={30} />
              ) : isBirava ? (
                <AppIcon name="biravaPendant" size={30} />
              ) : (
                <Text style={styles.emoji}>📦</Text>
              )}
            </View>
            <View style={styles.copy}>
              <Text style={styles.name}>
                {item.orderNumber || `Order #${item.id}`}
              </Text>
              <Text style={styles.meta}>
                {tt(String(item.itemName || item.productName || item.donationType || t('seva')))}{' '}
                • {formatStatus(String(item.orderStatus || item.status || ''), t)}
              </Text>
            </View>
            <View style={styles.actions}>
              {isDelivered && !userReceived ? (
                <TouchableOpacity
                  style={styles.receivedBtn}
                  disabled={confirmingId === item.id}
                  onPress={() => confirmReceived(item)}>
                  <Text style={styles.receivedBtnText}>
                    {confirmingId === item.id ? t('loading') : 'I received my order'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {isDelivered && userReceived ? (
                <View style={styles.receivedBadge}>
                  <Text style={styles.receivedBadgeText}>✓ Received</Text>
                </View>
              ) : null}
              {canCancel ? (
                <TouchableOpacity
                  style={styles.cancel}
                  onPress={() => {
                    setCancelTarget(item);
                    setReason('');
                    setCancelError('');
                  }}>
                  <Text style={styles.cancelText}>{t('cancelOrder')}</Text>
                </TouchableOpacity>
              ) : null}
              {canDelete ? (
                <TouchableOpacity
                  style={styles.delete}
                  disabled={deletingId === item.id}
                  onPress={() => confirmDelete(item)}>
                  <Text style={styles.deleteText}>
                    {deletingId === item.id ? t('loading') : t('delete')}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.view}
                onPress={() =>
                  navigation.navigate('OrderDetails', {id: item.id, order: item})
                }>
                <Text style={styles.viewText}>{t('view')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <Modal
        transparent
        visible={Boolean(cancelTarget)}
        animationType="fade"
        onRequestClose={() => setCancelTarget(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('cancelOrder')}</Text>
            <Text style={styles.sheetCopy}>{t('cancelReasonPrompt')}</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder={t('cancelReasonPrompt')}
              placeholderTextColor={Colors.textSecondary}
              multiline
            />
            {cancelError ? <Text style={styles.sheetError}>{cancelError}</Text> : null}
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setCancelTarget(null)}>
                <Text style={styles.keepText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCancel}
                disabled={cancelling}
                onPress={submitCancel}>
                {cancelling ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.confirmCancelText}>{t('cancelOrder')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#F3E2C6',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
  copy: {flex: 1},
  name: {fontSize: 15, fontWeight: '800', color: Colors.sacredBrown},
  meta: {marginTop: 4, color: '#4A3B2C', fontSize: 13, lineHeight: 18},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  receivedBtn: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  receivedBtnText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 12,
  },
  receivedBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  receivedBadgeText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 11,
  },
  cancel: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cancelText: {color: '#B91C1C', fontWeight: '800', fontSize: 12},
  delete: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteText: {color: '#B91C1C', fontWeight: '800'},
  view: {
    backgroundColor: Colors.lightGold,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewText: {color: Colors.sacredBrown, fontWeight: '800'},
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sheetCopy: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  reasonInput: {
    marginTop: 12,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  sheetError: {marginTop: 8, color: '#B91C1C', fontWeight: '600'},
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  keepBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  keepText: {color: Colors.sacredBrown, fontWeight: '700'},
  confirmCancel: {
    backgroundColor: '#B91C1C',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  confirmCancelText: {color: Colors.white, fontWeight: '800'},
});
