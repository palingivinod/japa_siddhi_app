import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
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
  const {t, language} = useLanguage();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [panchang, setPanchang] = useState<PanchangPayload>(emptyPanchang());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    setRawError(null);
    Promise.allSettled([
      apiService.get('/festivals'),
      apiService.get('/festivals/panchang', {params: {lang: language}}),
    ])
      .then(([response, panchangRes]) => {
        if (response.status === 'fulfilled') {
          setFestivals(response.value.data.data ?? []);
        }
        if (panchangRes.status === 'fulfilled' && panchangRes.value.data.data) {
          setPanchang(panchangRes.value.data.data);
        } else if (
          panchangRes.status === 'rejected' &&
          response.status === 'rejected'
        ) {
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
  }, [language]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenLayout title="Festivals">
      {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      <View style={styles.card}>
        <Text style={styles.kicker}>{t('todayPanchangam')}</Text>
        <Text style={styles.date}>
          {panchang.displayDate || t('loadingToday')}
        </Text>
        <Text style={styles.name}>
          {festivalName(panchang.festival) || t('todaysPanchangam')}
        </Text>
        {panchang.festival?.description ? (
          <Text style={styles.description}>{panchang.festival.description}</Text>
        ) : null}
        {panchang.nextFestival && !panchang.festival ? (
          <Text style={styles.description}>
            {t('next')}: {festivalName(panchang.nextFestival)} ·{' '}
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
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kicker: {
    color: Colors.leafGreen,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontSize: 12,
  },
  date: {
    marginTop: 6,
    color: Colors.mutedText,
    fontStyle: 'italic',
  },
  name: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontSize: 20,
    fontWeight: '800',
  },
  description: {
    marginTop: 8,
    color: Colors.mutedText,
    lineHeight: 20,
  },
  gap: {
    height: 12,
  },
});
