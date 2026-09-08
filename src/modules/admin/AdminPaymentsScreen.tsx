import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_PAYMENTS} from './adminData';

const AdminPaymentsScreen = () => {
  return (
    <AdminScreenLayout title="Payment Reports" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Payment Reports</Text>
      <Text style={styles.sub}>Review payments and refunds.</Text>

      {ADMIN_PAYMENTS.map(item => {
        const pending = item.status === 'Pending';
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.label}</Text>
              <Text style={styles.amount}>{item.amount}</Text>
            </View>
            <View
              style={[
                styles.pill,
                pending ? styles.pillPending : styles.pillSent,
              ]}>
              <Text
                style={[
                  styles.pillText,
                  pending ? styles.pillTextPending : styles.pillTextSent,
                ]}>
                {item.status}
              </Text>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.exportBtn}
        onPress={() =>
          Alert.alert('Export report', 'Export will connect to backend later.')
        }>
        <Text style={styles.exportText}>EXPORT REPORT</Text>
      </TouchableOpacity>
    </AdminScreenLayout>
  );
};

export default AdminPaymentsScreen;

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
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1},
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  amount: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillSent: {borderColor: Colors.leafGreen},
  pillPending: {borderColor: Colors.templeGold},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextSent: {color: Colors.leafGreen},
  pillTextPending: {color: Colors.templeGold},
  exportBtn: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
