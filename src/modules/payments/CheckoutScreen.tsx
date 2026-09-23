import React, {useEffect, useState} from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';

const PAYMENTS_URL = 'https://japasiddhi.com/payments';

/*
const TRUST_UPI_ID = 'q007640149@ybl';

const PAY_APPS = [
  {
    key: 'gpay',
    label: 'GPay',
    logo: require('../../assets/images/gpay-official.png'),
    packageName: 'com.google.android.apps.nbu.paisa.user',
    schemes: ['tez://upi/pay', 'gpay://upi/pay'],
  },
  {
    key: 'phonepe',
    label: 'PhonePe',
    logo: require('../../assets/images/phonepe-logo.png'),
    packageName: 'com.phonepe.app',
    schemes: ['phonepe://pay', 'phonepe://upi/pay'],
  },
  {
    key: 'paytm',
    label: 'Paytm',
    logo: require('../../assets/images/paytm-official.png'),
    packageName: 'net.one97.paytm',
    schemes: ['paytmmp://pay', 'paytmmp://upi/pay'],
  },
];
*/

const CheckoutScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};
  const [saving, setSaving] = useState(false);
  const title = params.title || 'Proceed to Pay';
  const itemName = params.itemName || 'Annadanam Donation';
  const subtitle = params.subtitle || 'Complete payment at https://japasiddhi.com/payments';
  const amount = Number(params.amount || 1008);

  const pay = async () => {
    try {
      await Linking.openURL(PAYMENTS_URL);
    } catch {
      Alert.alert('Payment', 'Could not open payments page.');
    }
  };

  return (
    <ScreenLayout title={title} showBack tab="SevaHub">
      <Text style={styles.heading}>{params.heading || 'Proceed to pay'}</Text>
      <MenuCard title={itemName} subtitle={subtitle} emoji="💳" />
      <StatCards
        items={[
          {label: 'AMOUNT', value: `₹ ${amount.toLocaleString()}`},
          {label: params.methodLabel || 'METHOD', value: 'Online Payment'},
        ]}
      />
      {/* Payment screen QR codes, PhonePe, and GPay options hidden/commented out
      <View style={styles.scanner}>
        <Image
          source={require('../../assets/images/phonepe_upi_qr.png')}
          style={styles.qr}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.payLabel}>Pay with</Text>
      <View style={styles.payRow}>
        {PAY_APPS.map(app => (
          <TouchableOpacity
            key={app.key}
            style={styles.payBtn}
            onPress={() => openPayApp(app)}
            activeOpacity={0.85}>
            <Image source={app.logo} style={styles.payLogo} resizeMode="contain" />
            <Text style={styles.payText}>{app.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      */}
      <Text style={styles.hint}>
        Tap below to continue to the secure online payments page.
      </Text>
      <PrimaryButton
        title={params.button || 'CONTINUE TO PAYMENT'}
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
  payLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
  },
  payRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  payBtn: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 10,
  },
  payLogo: {
    width: 52,
    height: 36,
    marginBottom: 6,
  },
  payText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
  },
  upiId: {
    textAlign: 'center',
    color: Colors.sacredBrown,
    fontWeight: '700',
    marginBottom: 10,
  },
  utrLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 8,
  },
  utrInput: {
    height: 54,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  utrHint: {
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
    fontSize: 13,
  },
  hint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
});
