import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {useLanguage} from '../../../i18n/LanguageContext';
import apiService, {getApiError} from '../../../services/apiService';
import Colors from '../../../theme/colors';
import {
  formatIsoDateLabel,
  istTodayIso,
  shiftIsoDate,
} from '../../../utils/istDate';
import ScreenLayout from '../../common/ScreenLayout';

type Chanter = {
  rank: number;
  userId: number;
  name: string;
  total: number;
};

const MEDALS: Record<number, string> = {1: '🥇', 2: '🥈', 3: '🥉'};

/** Top 10 chanters of one day (India time). Opens from the Home button. */
const TopChantersScreen = () => {
  const {t} = useLanguage();
  const [date, setDate] = useState(istTodayIso());
  const [chanters, setChanters] = useState<Chanter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (day: string) => {
      setLoading(true);
      setError('');
      try {
        const response = await apiService.get('/japa/top-chanters', {
          params: {date: day},
        });
        const data = response.data?.data || {};
        const rows: any[] = Array.isArray(data.chanters) ? data.chanters : [];
        setChanters(
          rows.map(row => ({
            rank: Number(row.rank) || 0,
            userId: Number(row.userId) || 0,
            name: String(row.name || '').trim() || '—',
            total: Number(row.total) || 0,
          })),
        );
      } catch (err) {
        setChanters([]);
        setError(getApiError(err, t('topChantersLoadError')));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load(date);
  }, [date, load]);

  const today = istTodayIso();
  const isToday = date >= today;

  return (
    <ScreenLayout title={t('topChantersTitle')} showBack>
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={styles.arrowBtn}
          onPress={() => setDate(prev => shiftIsoDate(prev, -1))}
          accessibilityRole="button"
          accessibilityLabel="Previous day">
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatIsoDateLabel(date)}</Text>
          {isToday ? (
            <Text style={styles.todayText}>{t('topChantersToday')}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.arrowBtn, isToday && styles.arrowDisabled]}
          disabled={isToday}
          onPress={() => setDate(prev => shiftIsoDate(prev, 1))}
          accessibilityRole="button"
          accessibilityLabel="Next day">
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
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
            onPress={() => void load(date)}>
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
        ? chanters.map(item => (
            <View
              key={`${item.rank}-${item.userId}`}
              style={[styles.row, item.rank <= 3 && styles.rowTop]}>
              <View style={styles.rankBox}>
                <Text style={styles.rankText}>
                  {MEDALS[item.rank] || String(item.rank)}
                </Text>
              </View>
              <Text style={styles.nameText} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.countText}>
                {t('topChantersChants', {count: item.total.toLocaleString('en-IN')})}
              </Text>
            </View>
          ))
        : null}
    </ScreenLayout>
  );
};

export default TopChantersScreen;

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {opacity: 0.3},
  arrowText: {
    fontSize: 26,
    lineHeight: 30,
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  dateCenter: {alignItems: 'center'},
  dateText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  todayText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.leafGreen,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rowTop: {
    borderColor: Colors.templeGold,
    backgroundColor: '#FFFDF7',
  },
  rankBox: {width: 38, alignItems: 'center'},
  rankText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  nameText: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
});
