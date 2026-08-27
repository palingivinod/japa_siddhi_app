import React, {useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const WelcomeGiftScreen = () => {
  const navigation = useNavigation<any>();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const claim = async () => {
    if (address.trim().length < 6) {
      Alert.alert('Address', 'Please confirm your shipping address.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.post('/orders', {
        orderType: 'SPIRITUAL_PRODUCT',
        orderSource: 'ADMIN_GIFT',
        itemName: 'Karungali Mala Welcome Gift',
        quantity: 1,
        remarks: `${address.trim()}, ${city.trim()}`.trim(),
      });
      const order = response.data.data || {};
      navigation.replace('Orders');
      if (order.id) {
        navigation.navigate('OrderDetails', {id: order.id, order});
      }
    } catch (error) {
      Alert.alert(
        'Welcome gift',
        getApiError(error, 'Could not create the welcome gift order.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Welcome Gift" showBack>
      <Text style={styles.title}>A gift for your first registration</Text>
      <Text style={styles.copy}>
        Admin has configured a Karungali Mala welcome gift. Confirm your
        shipping address and the order will appear in Orders & Tracking.
      </Text>
      <FormField
        label="Shipping address"
        placeholder="House / street"
        value={address}
        onChangeText={setAddress}
      />
      <FormField
        label="City"
        placeholder="City"
        value={city}
        onChangeText={setCity}
      />
      <PrimaryButton
        title={saving ? 'CREATING ORDER...' : 'CLAIM GIFT'}
        onPress={claim}
        disabled={saving}
      />
      <Text style={styles.gap} />
      <OutlineButton
        title="SKIP FOR NOW"
        onPress={() => navigation.replace('Home')}
      />
    </ScreenLayout>
  );
};

export default WelcomeGiftScreen;

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  copy: {
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 18,
  },
  gap: {height: 12},
});
