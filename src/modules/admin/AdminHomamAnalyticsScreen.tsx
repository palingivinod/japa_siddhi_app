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

type MessageRow = {
  id: number;
  title: string;
  message: string;
  sentAt: string;
  received: number;
  opened: number;
  openedRate: number;
};

type Data = {
  devoteesMessaged: number;
  devoteesOpened: number;
  viaServices: PeriodCounts;
  viaNotifications: PeriodCounts;
  messages: MessageRow[];
};

/** Nithya Homam messages: who got them and who opened them (and how). */
const AdminHomamAnalyticsScreen = () => {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/analytics/nithya-homam');
      const d = response.data?.data || {};
      setData({
        devoteesMessaged: Number(d.devoteesMessaged || 0),
        devoteesOpened: Number(d.devoteesOpened || 0),
        viaServices: d.viaServices || emptyPeriods(),
        viaNotifications: d.viaNotifications || emptyPeriods(),
        messages: Array.isArray(d.messages) ? d.messages : [],
      });
    } catch (err) {
      setError(getApiError(err, 'Could not load Nithya Homam analytics.'));
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
    <AdminScreenLayout
      title="Nithya Homam Analytics"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Nithya Homam Analytics</Text>
      <Text style={styles.sub}>
        Devotees who received homam messages and how many opened them.
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
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{n(data.devoteesMessaged)}</Text>
              <Text style={styles.summaryLabel}>Devotees got a message</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryValue}>{n(data.devoteesOpened)}</Text>
              <Text style={styles.summaryLabel}>Devotees opened one</Text>
            </View>
          </View>

          <Text style={styles.section}>Opened through Our Services</Text>
          <PeriodBoxes totals={data.viaServices} opensLabel="opens" />

          <Text style={styles.section}>Opened through Notifications</Text>
          <PeriodBoxes totals={data.viaNotifications} opensLabel="opens" />
          <EngagementNote>
            Services = the Nithya Homam card, then Homam updates. Notifications
            = tapping the push or the notification list. These two counts start
            from the app update that records them.
          </EngagementNote>

          <Text style={styles.section}>Each message</Text>
          {data.messages.length === 0 ? (
            <Text style={styles.empty}>No homam messages sent yet.</Text>
          ) : null}
          {data.messages.map(item => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title || 'Nithya Homam'}
              </Text>
              {item.sentAt ? (
                <Text style={styles.cardDate}>{item.sentAt} (IST)</Text>
              ) : null}
              <Text style={styles.cardMsg} numberOfLines={2}>
                {item.message}
              </Text>
              <View style={styles.cols}>
                <View style={styles.col}>
                  <Text style={styles.colValue}>{n(item.received)}</Text>
                  <Text style={styles.colLabel}>Got it</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.colValue}>{n(item.opened)}</Text>
                  <Text style={styles.colLabel}>Opened</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.colValue}>{item.openedRate}%</Text>
                  <Text style={styles.colLabel}>Opened rate</Text>
                </View>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </AdminScreenLayout>
  );
};

export default AdminHomamAnalyticsScreen;

const styles = StyleSheet.create({
  heading: {fontSize: 26, fontWeight: '800', color: Colors.sacredBrown},
  sub: {marginTop: 6, color: Colors.textSecondary, lineHeight: 20},
  center: {paddingVertical: 30, alignItems: 'center'},
  error: {color: '#B3261E', fontWeight: '700', marginTop: 16},
  summaryRow: {flexDirection: 'row', gap: 8, marginTop: 14},
  summaryBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    alignItems: 'center',
  },
  summaryValue: {fontSize: 28, fontWeight: '800', color: Colors.sacredBrown},
  summaryLabel: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.sacredBrown,
    lineHeight: 21,
  },
  cardDate: {marginTop: 2, fontSize: 12, color: Colors.textSecondary},
  cardMsg: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  cols: {flexDirection: 'row', marginTop: 12},
  col: {flex: 1, alignItems: 'center'},
  colValue: {fontSize: 22, fontWeight: '800', color: Colors.sacredBrown},
  colLabel: {fontSize: 12, fontWeight: '700', color: Colors.textSecondary},
});
