import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from 'react-native/Libraries/Components/Clipboard/Clipboard';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import {
  buildPanchangShareText,
  emptyPanchang,
  festivalDateLabel,
  festivalName,
  formatPanchangDisplayDate,
  PanchangPayload,
} from '../../services/panchang';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import PanchangDetails from '../common/PanchangDetails';
import ScreenLayout from '../common/ScreenLayout';

interface Festival {
  id: number;
  festivalName: string;
  description: string;
  festivalDate: string;
  festivalType: string;
}

const FestivalsScreen = () => {
  const {t, tt, language} = useLanguage();
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

  const onSharePanchang = async () => {
    const festival = panchang.festival ? tt(festivalName(panchang.festival)) : '';
    const nextLine =
      panchang.nextFestival && !panchang.festival
        ? `${t('next')}: ${tt(festivalName(panchang.nextFestival))} · ${festivalDateLabel(
            panchang.nextFestival.festivalDate,
            t,
          )}`
        : '';
    const message = buildPanchangShareText(panchang, t, language, {
      festival,
      nextLine,
    });
    (Clipboard as {setString?: (value: string) => void}).setString?.(message);
    try {
      await Share.share({message});
    } catch {
      // The text is already on the clipboard if the share sheet is dismissed.
    }
  };

  return (
    <ScreenLayout title="">
      {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}

      <View style={styles.card}>
        <View style={styles.kickerRow}>
          <Text style={[styles.kicker, styles.kickerTitle]}>{t('todayPanchangam')}</Text>
          <TouchableOpacity
            onPress={onSharePanchang}
            hitSlop={{top: 10, bottom: 10, left: 8, right: 4}}
            activeOpacity={0.7}>
            <Text style={styles.kicker}>{t('sharePanchangam')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.date}>
          {formatPanchangDisplayDate(panchang, t) ||
            panchang.displayDate ||
            t('loadingToday')}
        </Text>
        {panchang.festival ? (
          <>
            <Text style={styles.name}>{tt(festivalName(panchang.festival))}</Text>
            {panchang.festival.description ? (
              <Text style={styles.description}>
                {tt(panchang.festival.description)}
              </Text>
            ) : null}
          </>
        ) : null}
        {panchang.nextFestival && !panchang.festival ? (
          <Text style={styles.description}>
            {t('next')}: {tt(festivalName(panchang.nextFestival))} ·{' '}
            {festivalDateLabel(panchang.nextFestival.festivalDate, t)}
          </Text>
        ) : null}
        <PanchangDetails panchang={panchang} />
      </View>

      {festivals.length > 0 ? (
        <Text style={styles.sectionHeading}>{t('upcomingFestivals')}</Text>
      ) : null}

      {festivals.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.date}>
            {festivalDateLabel(item.festivalDate, t)}
          </Text>
          <Text style={styles.name}>{tt(item.festivalName)}</Text>
          {item.description ? (
            <Text style={styles.description}>{tt(item.description)}</Text>
          ) : null}
        </View>
      ))}
    </ScreenLayout>
  );
};

export default FestivalsScreen;

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginTop: 10,
    marginBottom: 10,
    letterSpacing: 0.3,
    paddingVertical: 4,
    includeFontPadding: true,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  kickerTitle: {
    flex: 1,
  },
  kicker: {
    color: Colors.leafGreen,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 2,
    includeFontPadding: true,
  },
  date: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 2,
    includeFontPadding: true,
  },
  name: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 32,
    paddingVertical: 4,
    includeFontPadding: true,
  },
  description: {
    marginTop: 6,
    color: '#3E3024',
    lineHeight: 24,
    fontSize: 14,
    paddingVertical: 4,
    includeFontPadding: true,
  },
});
