import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';

const FaqScreen = () => {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiService
      .get('/customer-care/faq')
      .then(response => setItems(response.data.data ?? []))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, 'Could not load FAQ.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenLayout title="FAQ" showBack tab="Profile">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {items.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => setOpen(open === item.id ? null : item.id)}>
          <View style={styles.row}>
            <Text style={styles.q}>{item.question}</Text>
            <Text style={styles.plus}>{open === item.id ? '−' : '+'}</Text>
          </View>
          {open === item.id ? <Text style={styles.a}>{item.answer}</Text> : null}
        </TouchableOpacity>
      ))}
    </ScreenLayout>
  );
};

export default FaqScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  q: {flex: 1, fontWeight: '800', color: Colors.sacredBrown},
  plus: {fontSize: 22, color: Colors.templeGold, fontWeight: '800'},
  a: {marginTop: 10, color: Colors.textSecondary, lineHeight: 20},
});
