import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_EXPORT_REPORTS} from './adminData';

const exportAlert = (label: string) =>
  Alert.alert('Export', `${label} export will be wired to backend next.`);

const AdminExportReportsScreen = () => (
  <AdminScreenLayout title="Export Reports" tab="AdminDashboard" showBack>
    <Text style={styles.heading}>Export Reports</Text>
    <Text style={styles.sub}>Export reports in Excel, CSV or PDF.</Text>

    {ADMIN_EXPORT_REPORTS.map(item => (
      <View key={item.id} style={styles.card}>
        <View style={styles.copy}>
          <Text style={styles.name}>{item.title}</Text>
          <Text style={styles.meta}>{item.subtitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.pill}
          onPress={() => exportAlert(item.title)}>
          <Text style={styles.pillText}>Export</Text>
        </TouchableOpacity>
      </View>
    ))}

    <TouchableOpacity
      style={styles.outlineBtn}
      onPress={() => exportAlert('Excel')}>
      <Text style={styles.outlineText}>EXPORT EXCEL</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.outlineBtn}
      onPress={() => exportAlert('CSV')}>
      <Text style={styles.outlineText}>EXPORT CSV</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.outlineBtn}
      onPress={() => exportAlert('PDF')}>
      <Text style={styles.outlineText}>EXPORT PDF</Text>
    </TouchableOpacity>
  </AdminScreenLayout>
);

export default AdminExportReportsScreen;

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
  copy: {flex: 1, paddingRight: 10},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.sacredBrown,
  },
  outlineBtn: {
    marginTop: 10,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
