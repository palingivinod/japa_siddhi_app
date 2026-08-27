import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Linking} from 'react-native';
import {useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';

const DeliveryStatusScreen = () => {
  const route = useRoute<any>();
  const [item, setItem] = useState<any>(route.params?.order || null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
        setError(getApiError(err, 'Could not load delivery status.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  return (
    <ScreenLayout title="Delivery Status" showBack tab="Orders">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <MenuCard
        title={item?.currentStatus || 'Out for delivery'}
        subtitle="Your spiritual item is on the way."
      />
      <StatCards
        items={[
          {label: 'STATUS', value: item?.orderStatus || 'Shipped'},
          {label: 'ETA', value: item?.eta || 'Aug 22'},
        ]}
      />
      <PrimaryButton
        title="TRACK LIVE"
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/search?q=${encodeURIComponent(
              item?.orderNumber || 'order tracking',
            )}`,
          )
        }
      />
    </ScreenLayout>
  );
};

export default DeliveryStatusScreen;
