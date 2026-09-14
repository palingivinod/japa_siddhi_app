import React, {useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_EXPORT_REPORTS} from './adminData';
import {
  alertExcelError,
  downloadAdminExcel,
} from './adminExcelDownload';

const TYPE_BY_ID: Record<string, string> = {
  '1': 'users',
  '2': 'japa',
  '3': 'challenges',
  '4': 'donations',
  '5': 'orders',
  users: 'users',
  japa: 'japa',
  challenges: 'challenges',
  donations: 'donations',
  orders: 'orders',
};

const AdminExportReportsScreen = () => {
  const [exporting, setExporting] = useState('');

  const downloadExcel = async (type: string, label: string) => {
    setExporting(type);
    try {
      await downloadAdminExcel(type, label);
    } catch (err) {
      alertExcelError(err);
    } finally {
      setExporting('');
    }
  };

  return (
    <AdminScreenLayout title="Export Reports" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Export Reports</Text>
      <Text style={styles.sub}>Export live data to Excel (.xlsx).</Text>

      {ADMIN_EXPORT_REPORTS.map(item => {
        const type = TYPE_BY_ID[item.id] || item.id;
        const busy = exporting === type;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{item.subtitle}</Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, busy && styles.pillBusy]}
              disabled={Boolean(exporting)}
              onPress={() => downloadExcel(type, item.title)}>
              {busy ? (
                <ActivityIndicator size="small" color={Colors.sacredBrown} />
              ) : (
                <Text style={styles.pillText}>Export XL</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.outlineBtn, exporting === 'japa' && styles.pillBusy]}
        disabled={Boolean(exporting)}
        onPress={() =>
          downloadExcel(
            'japa',
            'Users japa sheet (date, mantra, counts & totals)',
          )
        }>
        <Text style={styles.outlineText}>
          {exporting === 'japa'
            ? 'PREPARING EXCEL...'
            : 'DOWNLOAD USERS JAPA XL'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.outlineBtn, exporting === 'all' && styles.pillBusy]}
        disabled={Boolean(exporting)}
        onPress={() => downloadExcel('all', 'All reports')}>
        <Text style={styles.outlineText}>
          {exporting === 'all' ? 'PREPARING EXCEL...' : 'EXPORT EXCEL (ALL)'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.outlineBtn}
        disabled={Boolean(exporting)}
        onPress={() => downloadExcel('donations', 'Donation Reports')}>
        <Text style={styles.outlineText}>EXPORT DONATIONS XL</Text>
      </TouchableOpacity>
    </AdminScreenLayout>
  );
};

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
    minWidth: 88,
    alignItems: 'center',
  },
  pillBusy: {opacity: 0.6},
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
