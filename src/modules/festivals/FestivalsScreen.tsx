import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import {
  emptyPanchang,
  festivalDateLabel,
  festivalName,
  PanchangPayload,
} from '../../services/panchang';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import PanchangDetails from '../common/PanchangDetails';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

interface Festival {
  id: number;
  festivalName: string;
  description: string;
  festivalDate: string;
  festivalType: string;
}

const FestivalsScreen = () => {
  const navigation = useNavigation<any>();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [panchang, setPanchang] = useState<PanchangPayload>(emptyPanchang());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

  const load = () => {
    setLoading(true);
    setError('');
    setRawError(null);
    Promise.allSettled([
      apiService.get('/festivals'),
      apiService.get('/festivals/panchang'),
    ])
      .then(([response, panchangRes]) => {
        if (response.status === 'fulfilled') {
          setFestivals(response.value.data.data ?? []);
        }
        if (panchangRes.status === 'fulfilled' && panchangRes.value.data.data) {
          setPanchang(panchangRes.value.data.data);
        } else if (panchangRes.status === 'rejected' && response.status === 'rejected') {
          setRawError(panchangRes.reason);
          setError(
            getApiError(
              panchangRes.reason,
              'Could not load panchangam from the API.',
            ),
          );
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenLayout title="Festivals">
      {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <View style={styles.card}>
        <Text style={styles.kicker}>TODAY · PANCHANGAM</Text>
        <Text style={styles.date}>
          {panchang.displayDate || 'Loading today...'}
        </Text>
        <Text style={styles.name}>
          {festivalName(panchang.festival) || "Today's Panchangam"}
        </Text>
        {panchang.festival?.description ? (
          <Text style={styles.description}>{panchang.festival.description}</Text>
        ) : null}
        {panchang.nextFestival && !panchang.festival ? (
          <Text style={styles.description}>
            Next festival: {festivalName(panchang.nextFestival)} on{' '}
            {festivalDateLabel(panchang.nextFestival.festivalDate)}
          </Text>
        ) : null}
        <PanchangDetails panchang={panchang} />
      </View>
      {festivals.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.date}>{festivalDateLabel(item.festivalDate)}</Text>
          <Text style={styles.name}>{item.festivalName}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <View style={styles.gap} />
          <PrimaryButton
            title="JOIN FESTIVAL JAPA"
            onPress={() => navigation.navigate('Challenges')}
          />
        </View>
      ))}
    </ScreenLayout>
  );
};

export default FestivalsScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cream,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  kicker: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  date: {
    marginTop: 6,
    color: Colors.templeGold,
    fontWeight: '800',
  },
  name: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  description: {
    marginTop: 6,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  gap: {height: 12},
});
