import React, {useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import {saveDeliveryAddress} from '../../services/savedAddresses';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const BanaLingamReviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [saving, setSaving] = useState(false);
  const params = route.params || {};
  const address = String(params.address || '').trim();
  const hasAddress = address.length > 0;

  const placeOrder = async () => {
    if (!hasAddress) {
      Alert.alert('Baanalingam', 'Add a delivery address before placing the order.');
      return;
    }
    setSaving(true);
    try {
      await saveDeliveryAddress(address);
      const response = await apiService.post('/donations/checkout', {
        kind: 'BANA_LINGAM',
        fullName: params.fullName,
        mobile: params.mobile,
        address,
        nakshatram: params.nakshatram,
        gothram: params.gothram,
        remarks: 'Baanalingam application',
      });
      const data = response.data.data || {};
      navigation.replace('PaymentConfirmation', {
        ...data,
        itemName: 'Baanalingam',
      });
    } catch (error) {
      Alert.alert('Order', getApiError(error, 'Could not place this order.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Review Application" showBack tab="SevaHub">
      <MenuCard
        icon="banalingam"
        title="Baanalingam"
        subtitle={`${params.fullName || 'Devotee'} • ${params.mobile || ''}`}
      />
      <MenuCard
        emoji="🏠"
        title="Address"
        subtitle={hasAddress ? address : 'Add a delivery address to place this order.'}
      />
      {hasAddress ? (
        <PrimaryButton
          title={saving ? 'PLACING ORDER...' : 'PLACE ORDER'}
          onPress={placeOrder}
          disabled={saving}
        />
      ) : (
        <>
          <Text style={styles.hint}>
            Add your delivery address first. The order button appears after that.
          </Text>
          <PrimaryButton
            title="ADD ADDRESS"
            onPress={() => navigation.navigate('BanaLingam')}
          />
        </>
      )}
    </ScreenLayout>
  );
};

export default BanaLingamReviewScreen;

const styles = StyleSheet.create({
  hint: {
    color: Colors.textSecondary,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 16,
  },
});
