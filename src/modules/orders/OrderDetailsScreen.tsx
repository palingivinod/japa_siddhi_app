import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const OrderDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [item, setItem] = useState<any>(route.params?.order || null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmingReceived, setConfirmingReceived] = useState(false);

  const id = route.params?.id || route.params?.order?.id || route.params?.order?.orderId;

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
        setError(getApiError(err, 'Could not load order details.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const rawStatus = String(item?.orderStatus || item?.status || '').toLowerCase();
  const isDelivered = rawStatus.includes('deliver') && !rawStatus.includes('out for delivery');
  const userReceived = Boolean(item?.userReceived || item?.user_received);
  const canDelete = rawStatus.includes('deliver') || rawStatus.includes('cancel');

  const confirmReceived = () => {
    Alert.alert(
      'Confirm Delivery',
      'Have you received your order package safely?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes, I Received It',
          style: 'default',
          onPress: async () => {
            if (!id) return;
            setConfirmingReceived(true);
            try {
              await apiService.put(`/orders/${id}/received`);
              setItem((prev: any) => ({
                ...prev,
                userReceived: true,
                user_received: 1,
              }));
              Alert.alert('Delivery Confirmed', 'Thank you for confirming receipt of your order!');
            } catch (err) {
              Alert.alert('Error', getApiError(err, 'Could not confirm order receipt.'));
            } finally {
              setConfirmingReceived(false);
            }
          },
        },
      ],
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order from your list?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await apiService.delete(`/orders/${id}`);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Delete Failed', getApiError(err, 'Could not delete order.'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenLayout title="Order Details" showBack tab="Orders">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <Text style={styles.order}>
        {item?.orderNumber
          ? item.orderNumber.startsWith('BL-')
            ? `Order ${item.orderNumber}`
            : item.orderNumber.startsWith('#')
              ? item.orderNumber
              : `Order #${item.orderNumber}`
          : `Order #${item?.confirmationId || id || 'BL-0001'}`}
      </Text>
      {(() => {
        const itemText = `${item?.itemName || ''} ${item?.productName || ''} ${item?.orderNumber || ''}`.toLowerCase();
        const isBaanalingam = itemText.includes('banalingam') || itemText.includes('baanalingam') || itemText.includes('lingam') || itemText.includes('shiva');

        return (
          <MenuCard
            icon={isBaanalingam ? 'banalingam' : undefined}
            emoji={isBaanalingam ? undefined : '📦'}
            title={item?.itemName || item?.productName || 'Baanalingam'}
          />
        );
      })()}
      <Text style={styles.section}>Status</Text>
      {(item?.steps || []).map((step: any) => {
        const dateLabel = String(step?.date || '').trim() || 'Update soon';
        return (
          <View key={step.key} style={styles.step}>
            <View style={[styles.dot, step.done && styles.dotOn]} />
            <View style={styles.stepCopy}>
              <Text style={styles.stepText}>{step.label}</Text>
              <Text
                style={[
                  styles.stepDate,
                  dateLabel === 'Update soon' && styles.stepDateSoon,
                ]}>
                {dateLabel}
              </Text>
            </View>
          </View>
        );
      })}
      <View style={styles.gap} />
      <PrimaryButton
        title="TRACK ORDER"
        onPress={() => navigation.navigate('OrderTracking', {id, order: item})}
      />
      {isDelivered && !userReceived ? (
        <TouchableOpacity
          style={styles.receivedBtn}
          onPress={confirmReceived}
          disabled={confirmingReceived}>
          <Text style={styles.receivedBtnText}>
            {confirmingReceived ? 'CONFIRMING...' : 'I RECEIVED MY ORDER'}
          </Text>
        </TouchableOpacity>
      ) : null}
      {isDelivered && userReceived ? (
        <View style={styles.receivedNotice}>
          <Text style={styles.receivedNoticeText}>
            ✓ You confirmed receiving this order package
          </Text>
        </View>
      ) : null}
      {canDelete ? (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={confirmDelete}
          disabled={deleting}>
          <Text style={styles.deleteBtnText}>
            {deleting ? 'DELETING...' : 'DELETE ORDER'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </ScreenLayout>
  );
};

export default OrderDetailsScreen;

const styles = StyleSheet.create({
  order: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  section: {color: Colors.leafGreen, fontWeight: '800', fontSize: 14.5, marginBottom: 10},
  step: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16},
  stepCopy: {flex: 1, paddingRight: 8},
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.lightGold,
    marginRight: 12,
    marginTop: 3,
  },
  dotOn: {backgroundColor: Colors.templeGold},
  stepText: {color: Colors.sacredBrown, fontWeight: '700', fontSize: 14, lineHeight: 20},
  stepDate: {
    marginTop: 3,
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 12.5,
  },
  stepDateSoon: {color: Colors.textSecondary, fontWeight: '600'},
  gap: {height: 16},
  receivedBtn: {
    marginTop: 12,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#16A34A',
  },
  receivedBtnText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 15,
  },
  receivedNotice: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  receivedNoticeText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteBtn: {
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 15,
  },
});
