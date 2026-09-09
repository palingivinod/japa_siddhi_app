import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  NativeModules,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../../theme/colors';
import ENV from '../../env';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_EXPORT_REPORTS} from './adminData';

const {FileDownload} = NativeModules;

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
      const response = await apiService.get('/admin/reports/export', {
        params: {type},
      });
      const file = response.data?.data || {};
      const fileName = String(
        file.fileName || `report-${type}-${Date.now()}.xlsx`,
      );
      const mimeType =
        String(file.mimeType || '') ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const base64 = String(file.base64 || '');

      if (base64 && FileDownload?.saveBase64File) {
        const savedUri = await FileDownload.saveBase64File(
          fileName,
          base64,
          mimeType,
        );
        Alert.alert(
          'Excel downloaded',
          `${label}\n${fileName} saved to Downloads.\n\n${savedUri || ''}`,
        );
        return;
      }

      const apiOrigin = String(ENV.API_URL).replace(/\/api\/v1\/?$/, '');
      const url =
        (file.path ? `${apiOrigin}${file.path}` : '') ||
        String(file.url || '') ||
        `${ENV.API_URL}/admin/reports/export?type=${encodeURIComponent(
          type,
        )}&download=1`;

      try {
        await Linking.openURL(url);
        Alert.alert('Excel ready', `${fileName} is opening for download.`);
        return;
      } catch {
        await Share.share({
          title: fileName,
          message:
            Platform.OS === 'ios'
              ? `${label}: ${fileName}`
              : `${label} download:\n${url}`,
          url,
        });
      }
    } catch (err) {
      Alert.alert(
        'Export failed',
        getApiError(err, 'Could not generate Excel sheet.'),
      );
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
      <TouchableOpacity
        style={styles.outlineBtn}
        disabled={Boolean(exporting)}
        onPress={() => downloadExcel('japa', 'Japa Reports')}>
        <Text style={styles.outlineText}>EXPORT JAPA XL</Text>
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
