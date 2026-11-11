import React, {useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';

type Props = {
  orderId: number | string;
  userReceived: boolean;
  confirming?: boolean;
  onConfirm: () => void;
};

const isShippedNotification = (item: any, orderId: number) => {
  const action = String(item?.actionType || item?.action_type || '').toUpperCase();
  if (action !== 'ORDER_STATUS') {
    return false;
  }
  const actionId = Number(item?.actionId ?? item?.action_id ?? 0);
  const extra =
    item?.extraData && typeof item.extraData === 'object'
      ? item.extraData
      : typeof item?.extra_data === 'string'
        ? (() => {
            try {
              return JSON.parse(item.extra_data);
            } catch {
              return {};
            }
          })()
        : item?.extra_data && typeof item.extra_data === 'object'
          ? item.extra_data
          : {};
  const extraOrderId = Number(extra?.orderId ?? 0);
  if (actionId !== orderId && extraOrderId !== orderId) {
    return false;
  }
  const status = String(extra?.orderStatus || '').toUpperCase();
  const text = `${item?.title || ''} ${item?.message || item?.body || ''}`.toLowerCase();
  return status === 'SHIPPED' || text.includes('shipped');
};

/** Opens the inbox and highlights the shipped notification for this order. */
export const openShippedOrderNotification = async (
  navigation: any,
  orderId: number | string,
) => {
  const id = Number(orderId);
  let highlightId = String(orderId);
  if (Number.isFinite(id) && id > 0) {
    try {
      const response = await apiService.get('/notifications');
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      const match = list.find((row: any) => isShippedNotification(row, id));
      if (match?.id != null) {
        highlightId = String(match.id);
      }
    } catch {
      // Fall back to order id — NotificationsScreen also matches actionId.
    }
  }
  navigation.navigate('Notifications', {highlightId});
};

const ShippedOrderConfirmPanel = ({
  orderId,
  userReceived,
  confirming = false,
  onConfirm,
}: Props) => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [opening, setOpening] = useState(false);

  const openNotification = async () => {
    if (opening) {
      return;
    }
    setOpening(true);
    try {
      await openShippedOrderNotification(navigation, orderId);
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.panel}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={openNotification}
        disabled={opening}
        style={styles.notifyLinkWrap}>
        {opening ? (
          <ActivityIndicator color={Colors.templeGold} size="small" />
        ) : (
          <Text style={styles.notifyLink}>
            {t('shippedOrderNotifyLink') ||
              'You have a notification about this order. Please tap here to view it.'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.confirmCopy}>
        {t('shippedOrderConfirmCopy') ||
          'Please confirm that you have received your order. Until you confirm, you will not be able to place a new order.'}
      </Text>

      {userReceived ? (
        <View style={styles.receivedNotice}>
          <Text style={styles.receivedNoticeText}>
            {t('youConfirmedReceivingOrder') ||
              '✓ You confirmed receiving this order'}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.receivedBtn}
          onPress={onConfirm}
          disabled={confirming}
          activeOpacity={0.85}>
          <Text style={styles.receivedBtnText}>
            {confirming
              ? t('confirmingSelection') || 'CONFIRMING...'
              : t('yesIReceivedMyOrder') || 'YES, I RECEIVED MY ORDER'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ShippedOrderConfirmPanel;

const styles = StyleSheet.create({
  panel: {
    marginTop: 12,
    backgroundColor: '#FFF8EE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
  },
  notifyLinkWrap: {
    marginBottom: 10,
    minHeight: 22,
    justifyContent: 'center',
  },
  notifyLink: {
    color: Colors.templeGold,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  confirmCopy: {
    color: Colors.sacredBrown,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  receivedBtn: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#16A34A',
  },
  receivedBtnText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 14.5,
  },
  receivedNotice: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  receivedNoticeText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 13,
  },
});
