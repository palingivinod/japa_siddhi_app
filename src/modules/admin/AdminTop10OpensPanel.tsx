import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import {
  EngagementNote,
  emptyPeriods,
  n,
  PeriodBoxes,
  PeriodCounts,
} from './EngagementUi';

type DayRow = {
  date: string;
  opens: number;
  members: number;
  fromHome: number;
  fromPush: number;
  pushSent: number;
};

/** "Top 10 Opens" tab of Banner Management: who opened the Top 10 Chanters list. */
const AdminTop10OpensPanel = () => {
  const [totals, setTotals] = useState<PeriodCounts>(emptyPeriods());
  const [days, setDays] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/analytics/top-chanters');
      const d = response.data?.data || {};
      setTotals(d.totals || emptyPeriods());
      setDays(Array.isArray(d.days) ? d.days : []);
    } catch (err) {
      setError(getApiError(err, 'Could not load Top 10 analytics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View>
      <Text style={styles.sub}>
        Members who opened the Top 10 Chanters list (each member counted once
        per period).
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {!loading && error ? (
        <TouchableOpacity onPress={() => void load()}>
          <Text style={styles.error}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && !error ? (
        <>
          <PeriodBoxes totals={totals} opensLabel="opens" />
          <EngagementNote>
            Counting starts from the app update that records these opens.
          </EngagementNote>

          <Text style={styles.section}>Each report day</Text>
          {days.length === 0 ? (
            <Text style={styles.empty}>No opens recorded yet.</Text>
          ) : null}
          {days.map(day => (
            <View key={day.date} style={styles.card}>
              <Text style={styles.cardTitle}>Report of {day.date}</Text>
              <View style={styles.cols}>
                <View style={styles.col}>
                  <Text style={styles.colValue}>{n(day.members)}</Text>
                  <Text style={styles.colLabel}>Members</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.colValue}>{n(day.opens)}</Text>
                  <Text style={styles.colLabel}>Opens</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.colValue}>{n(day.fromHome)}</Text>
                  <Text style={styles.colLabel}>From Home</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.colValue}>{n(day.fromPush)}</Text>
                  <Text style={styles.colLabel}>From push</Text>
                </View>
              </View>
              <Text style={styles.pushLine}>
                Rank pushes sent next morning: {n(day.pushSent)}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
};

export default AdminTop10OpensPanel;

const styles = StyleSheet.create({
  sub: {marginTop: 10, color: Colors.textSecondary, lineHeight: 20},
  center: {paddingVertical: 30, alignItems: 'center'},
  error: {color: '#B3261E', fontWeight: '700', marginTop: 16},
  section: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  empty: {marginTop: 10, color: Colors.textSecondary},
  card: {
    marginTop: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
  },
  cardTitle: {fontSize: 15, fontWeight: '800', color: Colors.sacredBrown},
  cols: {flexDirection: 'row', marginTop: 12},
  col: {flex: 1, alignItems: 'center'},
  colValue: {fontSize: 20, fontWeight: '800', color: Colors.sacredBrown},
  colLabel: {fontSize: 11.5, fontWeight: '700', color: Colors.textSecondary},
  pushLine: {
    marginTop: 10,
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
});
