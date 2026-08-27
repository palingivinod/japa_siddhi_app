import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
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
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const FeedbackScreen = () => {
  const navigation = useNavigation<any>();
  const [rating, setRating] = useState(4);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<any[]>([]);
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
      .get('/feedback')
      .then(response => setItems(response.data.data ?? []))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load feedback.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!message.trim()) {
      setStatus('Tell us more about your experience.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/feedback', {
        rating,
        title: `${rating} star feedback`,
        message: message.trim(),
      });
      setStatus('Feedback submitted.');
      setMessage('');
      load();
    } catch (err: any) {
      setStatus(getApiError(err, 'Could not submit feedback.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Share Feedback" showBack tab="Profile">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <Text style={styles.question}>How was your experience?</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, star <= rating && styles.starOn]}>
              {star <= rating ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Comments</Text>
      <TextInput
        style={[styles.input, styles.area]}
        placeholder="Tell us more"
        placeholderTextColor={Colors.placeholder}
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <PrimaryButton
        title={saving ? 'SUBMITTING...' : 'SUBMIT FEEDBACK'}
        onPress={submit}
        disabled={saving}
      />
      <View style={styles.spacer} />
      <PrimaryButton title="Skip" onPress={() => navigation.goBack()} />
      {status ? (
        <Text style={[styles.status, {color: formMessageColor(status)}]}>
          {status}
        </Text>
      ) : null}
      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>
            {item.title} · {item.rating}★
          </Text>
          <Text style={styles.meta}>{item.message}</Text>
        </View>
      ))}
    </ScreenLayout>
  );
};

export default FeedbackScreen;

const styles = StyleSheet.create({
  question: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  star: {
    fontSize: 34,
    color: Colors.templeGold,
  },
  starOn: {
    color: Colors.templeGold,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  area: {minHeight: 90, textAlignVertical: 'top'},
  spacer: {height: 10},
  status: {marginTop: 12, fontWeight: '600'},
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
