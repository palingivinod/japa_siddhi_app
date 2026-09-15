import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminTicket} from './adminData';

const AdminSupportScreen = () => {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/support-tickets');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setTickets(
        rows.map((row: any) => ({
          id: String(row.id),
          code: row.code || `TK${row.id}`,
          subject: row.subject || '',
          message: row.message || '',
          screenshotUrl: row.screenshotUrl || null,
          status: row.status === 'Resolved' ? 'Resolved' : 'Pending',
        })),
      );
    } catch (err) {
      setTickets([]);
      Alert.alert(
        'Support',
        getApiError(err, 'Could not load support tickets.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <AdminScreenLayout
      title="Customer Support Ticket Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Customer Support Ticket Management</Text>
      <Text style={styles.sub}>
        Tickets with screenshots. Details are also emailed to admin.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 20}} />
      ) : null}

      {!loading && tickets.length === 0 ? (
        <Text style={styles.empty}>No support tickets yet.</Text>
      ) : null}

      {tickets.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>{item.code}</Text>
          <Text style={styles.meta}>{item.subject}</Text>
          {item.message ? (
            <Text style={styles.message} numberOfLines={3}>
              {item.message}
            </Text>
          ) : null}
          <Text style={styles.status}>Status: {item.status}</Text>
          {item.screenshotUrl ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(String(item.screenshotUrl))}>
              <Text style={styles.link}>Open screenshot</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noMedia}>No screenshot attached</Text>
          )}
        </View>
      ))}
    </AdminScreenLayout>
  );
};

export default AdminSupportScreen;

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
  empty: {color: Colors.textSecondary, marginBottom: 12},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
  },
  name: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 16,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  message: {
    marginTop: 8,
    color: Colors.sacredBrown,
  },
  status: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  link: {
    marginTop: 10,
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  noMedia: {
    marginTop: 10,
    color: Colors.textLight,
  },
});
