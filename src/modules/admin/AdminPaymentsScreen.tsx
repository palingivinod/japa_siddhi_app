import React, {useCallback, useState} from 'react';
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
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ENV from '../../env';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminPaymentRow} from './adminData';

const EMPTY_ROWS: AdminPaymentRow[] = [
  {id: 'today', label: 'Today', amount: '₹0', status: 'Pending'},
  {id: 'week', label: 'This week', amount: '₹0', status: 'Pending'},
  {id: 'month', label: 'This month', amount: '₹0', status: 'Pending'},
  {id: 'refunds', label: 'Refunds', amount: '₹0', status: 'Sent'},
];

const {FileDownload} = NativeModules;

const AdminPaymentsScreen = () => {
  const [rows, setRows] = useState<AdminPaymentRow[]>(EMPTY_ROWS);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/payment-reports');
      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      if (!data.length) {
        setRows(EMPTY_ROWS);
      } else {
        setRows(
          data.map((item: any) => ({
            id: String(item.id),
            label: String(item.label || ''),
            amount: String(item.amount || '₹0'),
            status: item.status === 'Pending' ? 'Pending' : 'Sent',
          })),
        );
      }
    } catch (err) {
      setRows(EMPTY_ROWS);
      setError(getApiError(err, 'Could not load payment reports.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports]),
  );

  const exportExcel = async () => {
    setExporting(true);
    try {
      const response = await apiService.get('/admin/payment-reports/export');
      const file = response.data?.data || {};
      const fileName = String(file.fileName || `payment-reports-${Date.now()}.xlsx`);
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
          `${fileName} saved to Downloads.\n\n${savedUri || ''}`,
        );
        return;
      }

      const apiOrigin = String(ENV.API_URL).replace(/\/api\/v1\/?$/, '');
      const url =
        (file.path ? `${apiOrigin}${file.path}` : '') ||
        String(file.url || '') ||
        `${ENV.API_URL}/admin/payment-reports/export?download=1`;

      try {
        await Linking.openURL(url);
        Alert.alert('Excel ready', `${fileName} is opening for download.`);
        return;
      } catch {
        await Share.share({
          title: fileName,
          message:
            Platform.OS === 'ios'
              ? `Payment report: ${fileName}`
              : `Payment report download:\n${url}`,
          url,
        });
      }
    } catch (err) {
      Alert.alert(
        'Export failed',
        getApiError(err, 'Could not generate Excel sheet.'),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminScreenLayout title="Payment Reports" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Payment Reports</Text>
      <Text style={styles.sub}>Review payments and refunds.</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadReports}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {rows.map(item => {
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
        style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
        onPress={exportExcel}
        disabled={exporting}>
        <Text style={styles.exportText}>
          {exporting ? 'PREPARING EXCEL...' : 'EXPORT REPORT'}
        </Text>
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
  centerBox: {paddingVertical: 20, alignItems: 'center'},
  errorText: {color: Colors.error, marginBottom: 12, fontWeight: '600'},
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
  exportBtnDisabled: {opacity: 0.6},
  exportText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
