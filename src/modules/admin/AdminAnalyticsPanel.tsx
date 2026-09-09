import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {io, Socket} from 'socket.io-client';

import Colors from '../../theme/colors';
import ENV from '../../env';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

const socketOrigin = String(ENV.API_URL).replace(/\/api\/v1\/?$/, '');
const CHART_HEIGHT = 160;

type Metric =
  | 'overview'
  | 'japa'
  | 'users'
  | 'donations'
  | 'challenges'
  | 'festivals';

type Props = {
  title: string;
  metric?: Metric;
  kpiValue?: string;
  changeValue?: string;
  bars?: number[];
};

type BarPoint = {label: string; value: number};

type DateRange = '7d' | '30d' | 'today' | 'all';
type Region = 'all' | 'in';

const DATE_OPTIONS: Array<{id: DateRange; label: string}> = [
  {id: 'today', label: 'Today'},
  {id: '7d', label: '7 days'},
  {id: '30d', label: '30 days'},
  {id: 'all', label: 'All'},
];

const REGION_OPTIONS: Array<{id: Region; label: string}> = [
  {id: 'all', label: 'All'},
  {id: 'in', label: 'India'},
];

const METRIC_COPY: Record<
  string,
  {sub: string; empty: string; fallbackLabel: string}
> = {
  users: {
    sub: 'Live user counts, gender mix, and date/region filters.',
    empty: 'No user data for this filter.',
    fallbackLabel: 'Users',
  },
  japa: {
    sub: 'Live japa counts, date/region filters, and bar totals.',
    empty: 'No japa data for this filter.',
    fallbackLabel: 'Japa',
  },
  donations: {
    sub: 'Live donation totals, date/region filters, and daily amounts.',
    empty: 'No donation data for this filter.',
    fallbackLabel: 'Donations ₹',
  },
  challenges: {
    sub: 'Live challenge joins, top challenges, and date/region filters.',
    empty: 'No challenge data for this filter.',
    fallbackLabel: 'Participants',
  },
  festivals: {
    sub: 'Live festival counts by date window and type.',
    empty: 'No festival data for this filter.',
    fallbackLabel: 'Festivals',
  },
};

const resolveApiMetric = (metric: Metric) => {
  if (metric === 'users') {
    return 'users';
  }
  if (metric === 'donations') {
    return 'donations';
  }
  if (metric === 'challenges') {
    return 'challenges';
  }
  if (metric === 'festivals') {
    return 'festivals';
  }
  return 'japa';
};

const AdminAnalyticsPanel = ({title, metric = 'japa'}: Props) => {
  const apiMetric = resolveApiMetric(metric);
  const copy = METRIC_COPY[apiMetric] || METRIC_COPY.japa;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpi, setKpi] = useState('0');
  const [kpiLabel, setKpiLabel] = useState(copy.fallbackLabel);
  const [change, setChange] = useState('0%');
  const [bars, setBars] = useState<BarPoint[]>([]);
  const [range, setRange] = useState<DateRange>('7d');
  const [region, setRegion] = useState<Region>('all');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showRegionMenu, setShowRegionMenu] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError('');
      try {
        const response = await apiService.get('/admin/analytics', {
          params: {range, region, metric: apiMetric},
        });
        const data = response.data?.data || {};
        const value = Number(data.kpi || 0);
        const formatted =
          data.kpiFormat === 'currency' || apiMetric === 'donations'
            ? `₹${value.toLocaleString('en-IN')}`
            : value.toLocaleString('en-IN');
        setKpi(formatted);
        setKpiLabel(String(data.kpiLabel || copy.fallbackLabel));
        setChange(String(data.change || '0%'));
        const points = Array.isArray(data.bars) ? data.bars : [];
        setBars(
          points.map((item: any) => ({
            label: String(item.label || ''),
            value: Number(item.value || 0),
          })),
        );
      } catch (err) {
        if (!silent) {
          setError(getApiError(err, 'Could not load analytics.'));
          setKpi('0');
          setChange('0%');
          setBars([]);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [range, region, apiMetric, copy.fallbackLabel],
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
      const poll = setInterval(() => {
        load(true);
      }, 15000);
      return () => clearInterval(poll);
    }, [load]),
  );

  useEffect(() => {
    let socket: Socket | null = null;
    try {
      socket = io(socketOrigin, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
      });
      socket.on('globalCountUpdated', () => {
        load(true);
      });
    } catch {
      // keep polling fallback
    }
    return () => {
      socket?.disconnect();
    };
  }, [load]);

  const maxValue = Math.max(...bars.map(item => item.value), 1);

  return (
    <AdminScreenLayout title={title} tab="AdminDashboard" showBack>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.sub}>{copy.sub}</Text>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>{kpiLabel}</Text>
          <Text style={styles.kpiValue}>{kpi}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Change</Text>
          <Text style={styles.kpiValue}>{change}</Text>
        </View>
      </View>

      <Text style={styles.filtersTitle}>Filters</Text>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, showDateMenu && styles.filterPillOn]}
          onPress={() => {
            setShowDateMenu(v => !v);
            setShowRegionMenu(false);
          }}>
          <Text style={styles.filterText}>
            DATE · {DATE_OPTIONS.find(item => item.id === range)?.label}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, showRegionMenu && styles.filterPillOn]}
          onPress={() => {
            setShowRegionMenu(v => !v);
            setShowDateMenu(false);
          }}>
          <Text style={styles.filterText}>
            REGION · {REGION_OPTIONS.find(item => item.id === region)?.label}
          </Text>
        </TouchableOpacity>
      </View>

      {showDateMenu ? (
        <View style={styles.menuRow}>
          {DATE_OPTIONS.map(option => {
            const active = option.id === range;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.menuChip, active && styles.menuChipOn]}
                onPress={() => {
                  setRange(option.id);
                  setShowDateMenu(false);
                }}>
                <Text
                  style={[styles.menuChipText, active && styles.menuChipTextOn]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {showRegionMenu ? (
        <View style={styles.menuRow}>
          {REGION_OPTIONS.map(option => {
            const active = option.id === region;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.menuChip, active && styles.menuChipOn]}
                onPress={() => {
                  setRegion(option.id);
                  setShowRegionMenu(false);
                }}>
                <Text
                  style={[styles.menuChipText, active && styles.menuChipTextOn]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={() => load(false)}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.chartCard}>
        {!loading && bars.length === 0 ? (
          <Text style={styles.emptyChart}>{copy.empty}</Text>
        ) : (
          <View style={styles.chartRow}>
            {bars.map((item, index) => {
              const barHeight = Math.max(
                8,
                Math.round((item.value / maxValue) * CHART_HEIGHT),
              );
              return (
                <View key={`${item.label}-${index}`} style={styles.barTrack}>
                  <Text style={styles.barCount}>
                    {item.value.toLocaleString('en-IN')}
                  </Text>
                  <View style={[styles.bar, {height: barHeight}]} />
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </AdminScreenLayout>
  );
};

export default AdminAnalyticsPanel;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    color: Colors.textSecondary,
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginRight: 12,
  },
  kpiLabel: {
    color: Colors.leafGreen,
    fontWeight: '700',
    fontSize: 13,
  },
  kpiValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  filterPill: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
  },
  filterPillOn: {
    backgroundColor: Colors.lightGold,
  },
  filterText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  menuRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  menuChip: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  menuChipOn: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#E4EFDF',
  },
  menuChipText: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  menuChipTextOn: {
    color: Colors.leafGreen,
  },
  centerBox: {paddingVertical: 12, alignItems: 'center'},
  errorText: {color: Colors.error, marginBottom: 10, fontWeight: '600'},
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 18,
    minHeight: 240,
  },
  emptyChart: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontWeight: '600',
    paddingVertical: 40,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: CHART_HEIGHT + 40,
  },
  barTrack: {
    flex: 1,
    height: CHART_HEIGHT + 40,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  barCount: {
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  bar: {
    width: '78%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: Colors.gold,
    minHeight: 8,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
