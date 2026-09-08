import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_CONTROL_ITEMS, ADMIN_DASHBOARD_STATS} from './adminData';

const StatCard = ({label, value}: {label: string; value: string}) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const stats = ADMIN_DASHBOARD_STATS;

  const openControl = (route?: string, title?: string) => {
    if (route) {
      navigation.navigate(route);
      return;
    }
    Alert.alert(title || 'Coming soon', 'This admin module will be added next.');
  };

  return (
    <AdminScreenLayout title="Admin Dashboard" tab="AdminDashboard">
      <Text style={styles.heading}>Admin Dashboard</Text>
      <Text style={styles.sub}>
        Centralized control for the Japa Siddhi platform.
      </Text>

      <View style={styles.stats}>
        <StatCard label="Users" value={stats.users.toLocaleString('en-IN')} />
        <StatCard label="Japa" value={stats.japa.toLocaleString('en-IN')} />
        <StatCard label="Orders" value={stats.orders.toLocaleString('en-IN')} />
        <StatCard label="Donations" value={stats.donationsLabel} />
      </View>

      <Text style={styles.section}>Admin Controls</Text>
      {ADMIN_CONTROL_ITEMS.map(item => (
        <View key={item.title} style={styles.controlCard}>
          <View style={styles.controlCopy}>
            <Text style={styles.controlTitle}>{item.title}</Text>
            <Text style={styles.controlSub}>Central management</Text>
          </View>
          <TouchableOpacity
            style={styles.openBtn}
            onPress={() => openControl(item.route, item.title)}>
            <Text style={styles.openText}>Open</Text>
          </TouchableOpacity>
        </View>
      ))}
    </AdminScreenLayout>
  );
};

export default AdminDashboardScreen;

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
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
  },
  statLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
  },
  statValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  section: {
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  controlCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlCopy: {flex: 1},
  controlTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  controlSub: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  openBtn: {
    borderWidth: 1,
    borderColor: Colors.leafGreen,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  openText: {
    color: Colors.leafGreen,
    fontWeight: '800',
  },
});
