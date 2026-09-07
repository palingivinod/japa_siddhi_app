import React, {useEffect, useState} from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
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

const CheckoutScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};
  const [saving, setSaving] = useState(false);
  const [upiId, setUpiId] = useState(TRUST_UPI_ID);
  const [payeeName, setPayeeName] = useState('Bilva Patra Trust');
  const title = params.title || 'Proceed to Pay';
  const itemName = params.itemName || 'Annadanam Donation';
  const subtitle = params.subtitle || 'Scan the QR with any UPI app.';
  const amount = Number(params.amount || 1008);

  useEffect(() => {
    apiService
      .get('/donations/payment-details')
      .then(response => {
        const data = response.data.data || {};
        setUpiId(TRUST_UPI_ID);
        if (data.accountHolderName) {
          setPayeeName(String(data.accountHolderName));
        }
      })
      .catch(() => undefined);
  }, []);

  const payQuery = () => {
    const parts = [
      `pa=${encodeURIComponent(upiId || TRUST_UPI_ID)}`,
      `pn=${encodeURIComponent(payeeName)}`,
      amount > 0 ? `am=${amount}` : '',
      'cu=INR',
      `tn=${encodeURIComponent(itemName)}`,
    ].filter(Boolean);
    return parts.join('&');
  };

  const openPayApp = async (app: (typeof PAY_APPS)[number]) => {
    const query = payQuery();
    const urls = [
      Platform.OS === 'android'
        ? `intent://pay?${query}#Intent;scheme=upi;package=${app.packageName};end`
        : '',
      ...app.schemes.map(base => `${base}?${query}`),
      `upi://pay?${query}`,
    ].filter(Boolean);
    for (const url of urls) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        undefined;
      }
    }
    Alert.alert(
      app.label,
      `Could not open ${app.label}. Install the app or scan the QR to pay ₹${amount.toLocaleString()}.`,
    );
  };

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
      <Text style={styles.heading}>{params.heading || 'Proceed to pay'}</Text>
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
      {upiId ? <Text style={styles.upiId}>UPI ID: {upiId}</Text> : null}
      <Text style={styles.hint}>
        This is a voluntary offering to Bilva Patra Trust, not a Google Play
        purchase. Open PhonePe, GPay, Paytm or any UPI app, scan this QR, then
        tap Proceed to Pay after the UPI app confirms success.
      </Text>
      <PrimaryButton
        title={saving ? 'RECORDING...' : params.button || 'PROCEED TO PAY'}
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
  hint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
});
