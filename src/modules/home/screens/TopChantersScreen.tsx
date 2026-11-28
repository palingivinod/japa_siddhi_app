import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {useRoute} from '@react-navigation/native';

import {useLanguage} from '../../../i18n/LanguageContext';
import apiService, {getApiError} from '../../../services/apiService';
import {logEngagement} from '../../../services/engagement';
import Colors from '../../../theme/colors';
import {formatIsoDateLabel, topChantersReportIso} from '../../../utils/istDate';
import ScreenLayout from '../../common/ScreenLayout';

type Chanter = {
  rank: number;
  userId: number;
  name: string;
  city: string;
  total: number;
};

const MEDALS: Record<number, string> = {1: '🥇', 2: '🥈', 3: '🥉'};

/** Card colours by rank: gold, silver, bronze, then India-flag and festive tones. */
const CARD_COLORS = [
  '#E3A410',
  '#A9B2BD',
  '#C27A3A',
  '#C9852E',
  '#4E6B21',
  '#1F4E9C',
  '#8B2635',
  '#0F766E',
  '#6B3FA0',
  '#B83280',
];

/** Gold and silver cards use dark text; the rest use white. */
const DARK_TEXT_RANKS = new Set([1, 2]);

/**
 * Top 10 chanters report. The backend picks the list every day at 9 PM (India
 * time): until then everyone sees yesterday's report, after that today's.
 */
const TopChantersScreen = () => {
  const {t} = useLanguage();
  const route = useRoute<any>();
  const openLogged = useRef(false);
  const [date, setDate] = useState(topChantersReportIso());
  const [chanters, setChanters] = useState<Chanter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/japa/top-chanters');
      const data = response.data?.data || {};
      const rows: any[] = Array.isArray(data.chanters) ? data.chanters : [];
      if (data.date) {
        setDate(String(data.date));
      }
      // Counted once per visit, after the list actually loaded (admin analytics).
      if (!openLogged.current) {
        openLogged.current = true;
        logEngagement(
          'TOP10_OPEN',
          data.date || topChantersReportIso(),
          route.params?.source === 'notification' ? 'notification' : 'home',
        );
      }
      setChanters(
        rows.map(row => ({
          rank: Number(row.rank) || 0,
          userId: Number(row.userId) || 0,
          name: String(row.name || '').trim() || '—',
          city: String(row.city || '').trim(),
          total: Number(row.total) || 0,
        })),
      );
    } catch (err) {
      setChanters([]);
      setError(getApiError(err, t('topChantersLoadError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenLayout title={t('topChantersTitle')} showBack>
      <View style={styles.head}>
        <Text style={styles.headTitle}>🏆 {t('topChantersTitle')}</Text>
        <Text style={styles.headDate}>{formatIsoDateLabel(date)}</Text>
        <Text style={styles.headNote}>{t('topChantersNote')}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.center}>
          <Text style={styles.messageText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void load()}
            accessibilityRole="button">
            <Text style={styles.retryText}>↻</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && chanters.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.messageText}>{t('topChantersEmpty')}</Text>
        </View>
      ) : null}

      {!loading && !error
        ? chanters.map(item => {
            const dark = DARK_TEXT_RANKS.has(item.rank);
            const textColor = dark ? '#3B2506' : '#FFFFFF';
            const medal = MEDALS[item.rank];
            return (
              <View
                key={`${item.rank}-${item.userId}`}
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      CARD_COLORS[(item.rank - 1) % CARD_COLORS.length],
                  },
                ]}>
                <View style={[styles.rankBox, medal ? styles.rankMedal : null]}>
                  <Text
                    style={[
                      styles.rankText,
                      medal ? styles.rankTextMedal : {color: textColor},
                    ]}>
                    {medal || String(item.rank)}
                  </Text>
                </View>
                <View style={styles.who}>
                  <Text
                    style={[styles.nameText, {color: textColor}]}
                    numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.city ? (
                    <Text
                      style={[styles.cityText, {color: textColor}]}
                      numberOfLines={1}>
                      📍 {item.city}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.countBox}>
                  <Text style={[styles.countText, {color: textColor}]}>
                    {item.total.toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.countLabel, {color: textColor}]}>
                    {t('topChantersChantsLabel')}
                  </Text>
                </View>
              </View>
            );
          })
        : null}
    </ScreenLayout>
  );
};

export default TopChantersScreen;

const styles = StyleSheet.create({
  head: {alignItems: 'center', marginBottom: 14},
  headTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  headDate: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  headNote: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  center: {paddingVertical: 36, alignItems: 'center'},
  messageText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  retryText: {color: Colors.sacredBrown, fontWeight: '800', fontSize: 18},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  rankBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMedal: {backgroundColor: 'rgba(255,255,255,0.45)'},
  rankText: {fontSize: 16, fontWeight: '800'},
  rankTextMedal: {fontSize: 20},
  who: {flex: 1, marginHorizontal: 12},
  nameText: {fontSize: 16, fontWeight: '800'},
  cityText: {fontSize: 12, marginTop: 1, opacity: 0.92},
  countBox: {alignItems: 'flex-end'},
  countText: {fontSize: 17, fontWeight: '800'},
  countLabel: {fontSize: 11, opacity: 0.92},
});
