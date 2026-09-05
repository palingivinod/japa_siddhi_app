import React, {useState} from 'react';
import {Alert, Image, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';

const CheckoutScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};
  const [saving, setSaving] = useState(false);
  const title = params.title || 'Scan to Pay';
  const itemName = params.itemName || 'Annadanam Donation';
  const subtitle = params.subtitle || 'Scan the QR with any UPI app.';
  const amount = Number(params.amount || 1008);

  const pay = async () => {
    setSaving(true);
    try {
      const response = await apiService.post('/donations/checkout', {
        kind: params.kind || 'ANNADANAM',
        amount,
        fullName: params.fullName,
        mobile: params.mobile,
        address: params.address,
        occasion: params.occasion,
        nakshatram: params.nakshatram,
        gothram: params.gothram,
        remarks: params.remarks,
        paymentMethod: 'UPI',
      });
      const data = response.data.data || {};
      if (params.kind === 'NITHYA_HOMAM') {
        navigation.replace('HomamConfirmation', data);
        return;
      }
      if (params.kind === 'BANA_LINGAM') {
        navigation.replace('PaymentConfirmation', data);
        return;
      }
      navigation.replace('DonationConfirmation', data);
    } catch (error) {
      Alert.alert('Payment', getApiError(error, 'Could not record this payment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={title} showBack tab="SevaHub">
      <Text style={styles.heading}>{params.heading || 'Scan the UPI QR'}</Text>
      <MenuCard title={itemName} subtitle={subtitle} />
      <StatCards
        items={[
          {label: 'AMOUNT', value: `₹ ${amount.toLocaleString()}`},
          {label: params.methodLabel || 'METHOD', value: 'UPI QR'},
        ]}
      />
      <View style={styles.scanner}>
        <Image
          source={require('../../assets/images/phonepe_upi_qr.png')}
          style={styles.qr}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.hint}>
        This is a voluntary offering to Bilva Patra Trust, not a Google Play
        purchase. Open PhonePe, GPay, Paytm or any UPI app, scan this QR, then
        tap I HAVE PAID after the UPI app confirms success.
      </Text>
      <PrimaryButton
        title={saving ? 'RECORDING...' : params.button || 'I HAVE PAID'}
        onPress={pay}
        disabled={saving}
      />
    </ScreenLayout>
  );
};

export default CheckoutScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  scanner: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  qr: {
    width: '100%',
    height: 360,
  },
  hint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
});
