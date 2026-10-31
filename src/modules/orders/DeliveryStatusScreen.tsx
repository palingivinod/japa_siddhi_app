import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, View} from 'react-native';
import {useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';

const DeliveryStatusScreen = () => {
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [item, setItem] = useState<any>(route.params?.order || null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const id = route.params?.id || route.params?.order?.id;

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
        setError(getApiError(err, t('couldNotLoadDelivery')));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const status = String(item?.orderStatus || item?.status || '').toUpperCase();
  const canMarkReceived =
    Boolean(item?.canMarkReceived) || status === 'SHIPPED';
  const isDelivered = status === 'DELIVERED';

  const markReceived = async () => {
    if (!id || saving) {
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.put(`/orders/${id}/received`);
      setItem(response.data?.data || {...item, orderStatus: 'DELIVERED'});
      Alert.alert(t('orderReceivedTitle'), t('orderReceivedMessage'));
    } catch (err) {
      Alert.alert(
        t('validationTitle'),
        getApiError(err, t('orderReceivedFailed')),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('deliveryStatus')} showBack tab="Orders">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <MenuCard
        emoji="🚚"
        title={
          item?.currentStatus ||
          (isDelivered ? t('orderTabDelivered') : t('outForDelivery'))
        }
        subtitle={
          isDelivered ? t('orderReceivedMessage') : t('itemOnTheWay')
        }
      />
      <StatCards
        items={[
          {
            label: t('statusLabel'),
            value:
              item?.orderStatus ||
              item?.currentStatus ||
              t('shipped'),
          },
          {label: t('etaLabel'), value: item?.eta || '—'},
        ]}
      />
      {canMarkReceived ? (
        <View style={styles.actions}>
          <PrimaryButton
            title={
              saving
                ? t('updatingStatus')
                : t('iHaveReceivedOrder')
            }
            onPress={markReceived}
            disabled={saving}
          />
        </View>
      ) : null}
      {isDelivered ? (
        <View style={styles.actions}>
          <PrimaryButton
            title={t('orderAlreadyDelivered')}
            onPress={() =>
              Alert.alert(t('orderReceivedTitle'), t('orderReceivedMessage'))
            }
            disabled
          />
        </View>
      ) : null}
    </ScreenLayout>
  );
};

export default DeliveryStatusScreen;

const styles = StyleSheet.create({
  actions: {
    marginTop: 16,
  },
});
