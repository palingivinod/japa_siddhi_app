import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_CONTROL_ITEMS} from './adminData';

type DashboardStats = {
  users: number;
  japa: number;
  orders: number;
  donationsLabel: string;
};

const EMPTY_STATS: DashboardStats = {
  users: 0,
  japa: 0,
  orders: 0,
  donationsLabel: '₹0',
};

const StatCard = ({label, value}: {label: string; value: string}) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/dashboard-stats');
      const data = response.data?.data || {};
      setStats({
        users: Number(data.users) || 0,
        japa: Number(data.japa) || 0,
        orders: Number(data.orders) || 0,
        donationsLabel: String(data.donationsLabel || '₹0'),
      });
    } catch (err) {
      setStats(EMPTY_STATS);
      setError(getApiError(err, 'Could not load live dashboard stats.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const openControl = (route?: string, title?: string) => {
    if (!route) {
      Alert.alert(title || 'Coming soon', 'This admin module will be added next.');
      return;
    }
    try {
      navigation.navigate(route as never);
    } catch (error: any) {
      Alert.alert(
        'Navigation failed',
        error?.message || `Could not open ${title || route}.`,
      );
    }
  };

  return (
    <AdminScreenLayout title="Admin Dashboard" tab="AdminDashboard">
      <Text style={styles.heading}>Admin Dashboard</Text>
      <Text style={styles.sub}>
        Centralized control for the Japa Siddhi platform.
      </Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.templeGold} />
          <Text style={styles.loadingText}>Loading live stats...</Text>
        </View>
      ) : (
        <View style={styles.stats}>
          <StatCard
            label="Users"
            value={stats.users.toLocaleString('en-IN')}
          />
          <StatCard label="Japa" value={stats.japa.toLocaleString('en-IN')} />
          <StatCard
            label="Orders"
            value={stats.orders.toLocaleString('en-IN')}
          />
          <StatCard label="Donations" value={stats.donationsLabel} />
        </View>
      )}

      {error ? (
        <TouchableOpacity onPress={loadStats}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.section}>Admin Controls</Text>
      <Text style={styles.hint}>Tap a row to open that module.</Text>
      {ADMIN_CONTROL_ITEMS.map(item => (
        <TouchableOpacity
          key={item.title}
          style={styles.controlCard}
          activeOpacity={0.85}
          onPress={() => openControl(item.route, item.title)}>
          <View style={styles.controlCopy}>
            <Text style={styles.controlTitle}>{item.title}</Text>
            <Text style={styles.controlSub}>Central management</Text>
          </View>
          <View style={styles.openBtn}>
            <Text style={styles.openText}>Open</Text>
          </View>
        </TouchableOpacity>
      ))}
      <View style={styles.bottomSpacer} />
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
  loadingBox: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 8,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontWeight: '600',
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
  errorText: {
    color: Colors.error,
    marginBottom: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 6,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  hint: {
    marginBottom: 12,
    color: Colors.textSecondary,
    fontSize: 13,
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
  controlCopy: {flex: 1, paddingRight: 8},
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
  bottomSpacer: {height: 28},
});
