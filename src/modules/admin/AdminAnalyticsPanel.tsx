import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';

type Props = {
  title: string;
  kpiValue?: string;
  changeValue?: string;
  bars?: number[];
};

const DEFAULT_BARS = [0.45, 0.72, 0.38, 0.9, 0.55, 0.68];

const AdminAnalyticsPanel = ({
  title,
  kpiValue = '1,284',
  changeValue = '+18%',
  bars = DEFAULT_BARS,
}: Props) => {
  const [dateOn, setDateOn] = useState(false);
  const [regionOn, setRegionOn] = useState(false);

  return (
    <AdminScreenLayout title={title} tab="AdminDashboard" showBack>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.sub}>KPI cards, filters and graphical analytics.</Text>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>KPI</Text>
          <Text style={styles.kpiValue}>{kpiValue}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Change</Text>
          <Text style={styles.kpiValue}>{changeValue}</Text>
        </View>
      </View>

      <Text style={styles.filtersTitle}>Filters</Text>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, dateOn && styles.filterPillOn]}
          onPress={() => {
            setDateOn(v => !v);
            Alert.alert('Date filter', 'Date range picker will be wired next.');
          }}>
          <Text style={styles.filterText}>DATE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, regionOn && styles.filterPillOn]}
          onPress={() => {
            setRegionOn(v => !v);
            Alert.alert('Region filter', 'Region picker will be wired next.');
          }}>
          <Text style={styles.filterText}>REGION</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartRow}>
          {bars.map((height, index) => (
            <View key={`${title}-bar-${index}`} style={styles.barTrack}>
              <View style={[styles.bar, {height: `${Math.round(height * 100)}%`}]} />
            </View>
          ))}
        </View>
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
    gap: 12,
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
    gap: 10,
    marginBottom: 16,
  },
  filterPill: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 18,
    paddingVertical: 10,
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
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 22,
    minHeight: 220,
  },
  chartRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 170,
  },
  barTrack: {
    flex: 1,
    height: 170,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: Colors.gold,
  },
});
