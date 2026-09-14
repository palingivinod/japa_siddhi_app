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
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminMantra} from './adminData';
import {
  alertExcelError,
  downloadAdminExcel,
} from './adminExcelDownload';

const AdminJapaScreen = () => {
  const navigation = useNavigation<any>();
  const [mantras, setMantras] = useState<AdminMantra[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadMantras = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/mantras');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setMantras(
        rows.map((row: any) => ({
          id: String(row.id),
          name: row.name || '',
          subtitle: row.subtitle || 'Community mantra',
          active: Boolean(row.active),
          target: Number(row.target) || 108,
        })),
      );
    } catch (err) {
      setMantras([]);
      Alert.alert('Error', getApiError(err, 'Could not load mantras.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMantras();
    }, [loadMantras]),
  );

  const toggle = async (item: AdminMantra) => {
    try {
      await apiService.put(`/admin/mantras/${item.id}`, {
        isActive: !item.active,
      });
      await loadMantras();
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update mantra status.'),
      );
    }
  };

  const onDownloadJapaExcel = async () => {
    setExporting(true);
    try {
      await downloadAdminExcel(
        'japa',
        'Users japa sheet (date, mantra, counts & totals)',
      );
    } catch (err) {
      alertExcelError(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminScreenLayout title="Japa Management" tab="AdminJapa" showBack={false}>
      <Text style={styles.heading}>Japa Management</Text>
      <Text style={styles.sub}>Manage up to 12 predefined mantras.</Text>

      <TouchableOpacity
        style={[styles.exportBtn, exporting && styles.exportBusy]}
        disabled={exporting}
        onPress={onDownloadJapaExcel}>
        {exporting ? (
          <ActivityIndicator color={Colors.sacredBrown} />
        ) : (
          <Text style={styles.exportText}>DOWNLOAD USERS JAPA EXCEL</Text>
        )}
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {mantras.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.copy}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.subtitle}</Text>
          </View>
          <TouchableOpacity
            style={[styles.pill, item.active ? styles.pillOn : styles.pillOff]}
            onPress={() => toggle(item)}>
            <Text
              style={[
                styles.pillText,
                item.active ? styles.pillTextOn : styles.pillTextOff,
              ]}>
              {item.active ? 'Active' : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <PrimaryButton
        title="MANTRA MANAGEMENT"
        onPress={() => navigation.navigate('AdminMantras')}
      />
    </AdminScreenLayout>
  );
};

export default AdminJapaScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 6,
    marginBottom: 12,
    color: Colors.textSecondary,
  },
  exportBtn: {
    marginBottom: 14,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  exportBusy: {opacity: 0.6},
  exportText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontSize: 13,
  },
  centerBox: {
    paddingVertical: 20,
    alignItems: 'center',
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
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillOn: {borderColor: Colors.leafGreen},
  pillOff: {borderColor: Colors.textLight},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: Colors.textLight},
});
