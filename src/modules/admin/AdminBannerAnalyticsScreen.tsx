import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {
  EngagementNote,
  emptyPeriods,
  n,
  PeriodBoxes,
  PeriodCounts,
} from './EngagementUi';

type BannerRow = PeriodCounts & {
  bannerId: string;
  title: string;
  status: string;
};

type Data = {totals: PeriodCounts; items: BannerRow[]};

/** How many members tapped each Home banner. */
const AdminBannerAnalyticsScreen = () => {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/analytics/banners');
      const d = response.data?.data || {};
      setData({
        totals: d.totals || emptyPeriods(),
        items: Array.isArray(d.items) ? d.items : [],
      });
    } catch (err) {
      setError(getApiError(err, 'Could not load banner analytics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <AdminScreenLayout title="Banner Analytics" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Banner Analytics</Text>
      <Text style={styles.sub}>
        Members who tapped the Home banner (each member counted once per
        period).
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

      {!loading && data ? (
        <>
          <Text style={styles.section}>All banners</Text>
          <PeriodBoxes totals={data.totals} />
          <EngagementNote>
            Counting starts from the app update that records banner taps, so
            earlier taps are not included.
          </EngagementNote>

          <Text style={styles.section}>Each banner</Text>
          {data.items.length === 0 ? (
            <Text style={styles.empty}>No banners yet.</Text>
          ) : null}
          {data.items.map(item => (
            <View key={item.bannerId} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <View style={styles.cols}>
                {(
                  [
                    ['Today', item.today],
                    ['7 days', item.week],
                    ['All time', item.all],
                  ] as const
                ).map(([label, c]) => (
                  <View key={label} style={styles.col}>
                    <Text style={styles.colLabel}>{label}</Text>
                    <Text style={styles.colValue}>{n(c.members)}</Text>
                    <Text style={styles.colSub}>{n(c.opens)} taps</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      ) : null}
    </AdminScreenLayout>
  );
};

export default AdminBannerAnalyticsScreen;

const styles = StyleSheet.create({
  heading: {fontSize: 26, fontWeight: '800', color: Colors.sacredBrown},
  sub: {marginTop: 6, color: Colors.textSecondary, lineHeight: 20},
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
  cardHead: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.sacredBrown,
    lineHeight: 21,
  },
  status: {fontSize: 12, fontWeight: '700', color: Colors.textSecondary},
  cols: {flexDirection: 'row', marginTop: 10},
  col: {flex: 1, alignItems: 'center'},
  colLabel: {fontSize: 12, fontWeight: '700', color: Colors.textSecondary},
  colValue: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  colSub: {fontSize: 12, color: Colors.leafGreen, fontWeight: '700'},
});
