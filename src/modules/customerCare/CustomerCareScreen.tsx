import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import {formMessageColor} from '../../theme/formMessage';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const CustomerCareScreen = () => {
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<'hub' | 'ticket'>('hub');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    setRawError(null);
    apiService
      .get('/customer-care')
      .then(response => setTickets(response.data.data ?? []))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load tickets.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      setStatus('Subject and message are required.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/customer-care', {
        subject: subject.trim(),
        message: message.trim(),
      });
      setStatus('Ticket raised.');
      setSubject('');
      setMessage('');
      load();
    } catch (err: any) {
      setStatus(getApiError(err, 'Could not raise the ticket.'));
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'hub') {
    return (
      <ScreenLayout title="Customer Care" showBack>
        <MenuCard
          title="Raise Ticket"
          subtitle="Report an issue"
          onPress={() => setMode('ticket')}
        />
        <MenuCard
          title="WhatsApp Support"
          subtitle="Chat with support"
          onPress={() => Linking.openURL('https://wa.me/917349483937')}
        />
        <MenuCard
          title="Call Support"
          subtitle="Speak to us"
          tone="green"
          onPress={() => Linking.openURL('tel:+917349483937')}
        />
        <MenuCard
          title="FAQ"
          subtitle="Find quick answers"
          tone="green"
          onPress={() => navigation.navigate('Faq')}
        />
        <PrimaryButton
          title="FEEDBACK FORM"
          onPress={() => navigation.navigate('Feedback')}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Raise Ticket" showBack>
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <TextInput
        style={styles.input}
        placeholder="Subject *"
        value={subject}
        onChangeText={setSubject}
      />
      <TextInput
        style={[styles.input, styles.area]}
        placeholder="Message *"
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={submit} disabled={saving}>
        <Text style={styles.buttonText}>
          {saving ? 'Sending...' : 'Raise Ticket'}
        </Text>
      </TouchableOpacity>
      {status ? (
        <Text style={[styles.status, {color: formMessageColor(status)}]}>
          {status}
        </Text>
      ) : null}
      {tickets.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>{item.subject}</Text>
          <Text style={styles.meta}>
            {item.status} · {item.message}
          </Text>
        </View>
      ))}
    </ScreenLayout>
  );
};

export default CustomerCareScreen;

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  area: {minHeight: 90, textAlignVertical: 'top'},
  button: {
    backgroundColor: Colors.templeGold,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {color: Colors.white, fontWeight: '800'},
  status: {marginTop: 8, marginBottom: 8, fontWeight: '600'},
  meta: {marginTop: 6, color: Colors.textSecondary},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  name: {fontSize: 16, fontWeight: '700', color: Colors.sacredBrown},
});
