import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import {formMessageColor} from '../../theme/formMessage';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const DonateScreen = () => {
  const [service, setService] = useState<'JAPA' | 'GENERAL' | null>(null);
  const [amount, setAmount] = useState('200');
  const [details, setDetails] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [payment, donations] = await Promise.all([
      apiService.get('/donations/payment-details'),
      apiService.get('/donations/history'),
    ]);
    setDetails(payment.data.data);
    setHistory(donations.data.data ?? []);
  };

  const reload = () => {
    setLoading(true);
    setError('');
    setRawError(null);
    load()
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load donation details.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const donate = async () => {
    const value = Number(amount);
    if (!value) {
      setMessage('Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/donations', {
        donationType: 'ANNADANAM',
        amount: value,
        paymentMethod: 'UPI',
        remarks: service === 'JAPA' ? 'Japa Annadanam' : 'General Annadanam',
      });
      setMessage(`Donation of ₹${value} saved.`);
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message ?? 'Donation failed.');
    } finally {
      setSaving(false);
    }
  };

  if (!service) {
    return (
      <ScreenLayout title="Annadanam" showBack tab="SevaHub">
        <Text style={styles.heading}>Offer Annadanam</Text>
        <MenuCard
          title="Japa Annadanam"
          subtitle="Sponsor food after your Japa milestone."
          onPress={() => setService('JAPA')}
        />
        <MenuCard
          title="General Annadanam"
          subtitle="Offer food service for an occasion."
          tone="green"
          onPress={() => setService('GENERAL')}
        />
        <PrimaryButton
          title="CHOOSE SERVICE"
          onPress={() => setService('GENERAL')}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Annadanam" showBack tab="SevaHub">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={reload} />
      ) : null}
      <Text style={styles.heading}>
        {service === 'JAPA' ? 'Japa Annadanam' : 'General Annadanam'}
      </Text>
      <View style={styles.card}>
        <Text style={styles.scanTitle}>Scan to pay</Text>
        <Text style={styles.trustName}>Bilva Patra Trust</Text>
        <Image
          source={require('../../assets/images/phonepe_upi_qr.png')}
          style={styles.qr}
          resizeMode="contain"
        />
        <Text style={styles.scanHint}>
          Open PhonePe, GPay, or any UPI app and scan this QR
        </Text>
        {details?.upiId ? (
          <View style={styles.details}>
            <Text style={styles.label}>UPI ID</Text>
            <Text style={styles.value}>{details.upiId}</Text>
          </View>
        ) : null}
      </View>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount"
      />
      <TouchableOpacity style={styles.button} onPress={donate} disabled={saving}>
        <Text style={styles.buttonText}>
          {saving ? 'Saving...' : 'Donate Now'}
        </Text>
      </TouchableOpacity>
      {message ? (
        <Text style={[styles.message, {color: formMessageColor(message)}]}>
          {message}
        </Text>
      ) : null}
      <Text style={styles.section}>History</Text>
      {history.map(item => (
        <View key={item.id} style={styles.historyCard}>
          <Text style={styles.value}>
            ₹{item.amount} · {item.donationType}
          </Text>
          <Text style={styles.meta}>
            {item.donationStatus} · {String(item.donatedAt || '').slice(0, 10)}
          </Text>
        </View>
      ))}
    </ScreenLayout>
  );
};

export default DonateScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  trustName: {
    marginTop: 6,
    color: Colors.leafGreen,
    fontWeight: '700',
  },
  qr: {
    width: 240,
    height: 280,
    marginVertical: 12,
  },
  scanHint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  details: {width: '100%', marginTop: 8},
  label: {color: Colors.leafGreen, marginTop: 8, fontWeight: '700'},
  value: {color: Colors.sacredBrown, fontWeight: '700', fontSize: 16},
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  button: {
    backgroundColor: Colors.templeGold,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {color: Colors.white, fontWeight: '800'},
  message: {marginTop: 12, fontWeight: '600'},
  section: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  historyCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  meta: {color: Colors.textSecondary, marginTop: 4},
});
