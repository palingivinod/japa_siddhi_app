import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
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
import ScreenLayout from '../common/ScreenLayout';

const BanaLingamScreen = () => {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    setRawError(null);
    apiService
      .get('/bana-lingam')
      .then(response => setItems(response.data.data ?? []))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load Baanalingam requests.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!fullName.trim() || !mobile.trim() || !address.trim()) {
      setMessage('Name, mobile, and address are required.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/bana-lingam', {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        gothram: gothram.trim() || undefined,
        nakshatram: nakshatram.trim() || undefined,
        countryId: 1,
        stateId: 1,
        cityId: 1,
        postalCode: '000000',
        quantity: 1,
      });
      setMessage('Baanalingam application submitted.');
      setFullName('');
      setMobile('');
      setAddress('');
      await load();
    } catch (err: any) {
      setMessage(getApiError(err, 'Could not submit the application.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Baanalingam">
      {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <Text style={styles.hint}>
        Apply for Baanalingam distribution. Payment can be completed later.
      </Text>
      <TextInput style={styles.input} placeholder="Name *" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Mobile *" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Address *" value={address} onChangeText={setAddress} />
      <TextInput style={styles.input} placeholder="Gothram" value={gothram} onChangeText={setGothram} />
      <TextInput style={styles.input} placeholder="Nakshatram" value={nakshatram} onChangeText={setNakshatram} />
      <TouchableOpacity style={styles.button} onPress={submit} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Submitting...' : 'Submit Application'}</Text>
      </TouchableOpacity>
      {message ? (
        <Text style={[styles.message, {color: formMessageColor(message)}]}>
          {message}
        </Text>
      ) : null}
      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.meta}>{item.requestStatus} · {item.mobile}</Text>
        </View>
      ))}
    </ScreenLayout>
  );
};

export default BanaLingamScreen;

const styles = StyleSheet.create({
  hint: {color: Colors.textSecondary, marginBottom: 12, lineHeight: 20},
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {color: Colors.white, fontWeight: '700'},
  message: {marginBottom: 12, fontWeight: '600'},
  card: {
    backgroundColor: Colors.cream,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  name: {fontSize: 16, fontWeight: '700', color: Colors.textPrimary},
  meta: {marginTop: 6, color: Colors.textSecondary},
});
