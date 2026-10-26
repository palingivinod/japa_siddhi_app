import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import SelectField from '../common/SelectField';
import AdminScreenLayout from './AdminScreenLayout';
import {alertExcelError, downloadAdminExcel} from './adminExcelDownload';

type MantraRow = {
  name: string;
  japaCount: number;
  people: number;
};

const AdminRegionAnalyticsScreen = () => {
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [people, setPeople] = useState(0);
  const [japaCount, setJapaCount] = useState(0);
  const [mantras, setMantras] = useState<MantraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (selected = '') => {
    const ticket = ++requestId.current;
    setLoading(true);
    try {
      const response = await apiService.get('/admin/region-analytics', {
        params: selected ? {region: selected} : undefined,
      });
      if (ticket !== requestId.current) {
        return;
      }
      const data = response.data?.data || {};
      const list = Array.isArray(data.regions)
        ? data.regions.map((item: unknown) => String(item || '').trim()).filter(Boolean)
        : [];
      setRegions(list);
      setRegion(String(data.selected || selected || ''));
      setPeople(Number(data.people || 0));
      setJapaCount(Number(data.japaCount || 0));
      setMantras(Array.isArray(data.mantras) ? data.mantras : []);
    } catch (error) {
      if (ticket !== requestId.current) {
        return;
      }
      Alert.alert(
        'Region analytics',
        getApiError(error, 'Could not load region analytics.'),
      );
    } finally {
      if (ticket === requestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load('');
    }, [load]),
  );

  const download = async () => {
    if (!region) {
      Alert.alert('Select a place', 'Choose a region or place, then download the sheet.');
      return;
    }
    setExporting(true);
    try {
      await downloadAdminExcel('region', region, {region});
    } catch (error) {
      alertExcelError(error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminScreenLayout title="Region analytics" tab="AdminMore" showBack>
      <Text style={styles.heading}>Region analytics</Text>
      <Text style={styles.sub}>
        Choose a region or place to see the people, their japa count, and the mantras they chant.
      </Text>

      <SelectField
        value={region}
        onChange={value => {
          setRegion(value);
          load(value);
        }}
        placeholder="Select region or place"
        title="Region or place"
        options={regions.map(item => ({label: item, value: item}))}
      />

      {loading ? (
        <ActivityIndicator color={Colors.templeGold} style={styles.spinner} />
      ) : region ? (
        <>
          <View style={styles.card}>
            <Text style={styles.statLabel}>People</Text>
            <Text style={styles.statValue}>{people.toLocaleString()}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.statLabel}>Japa count</Text>
            <Text style={styles.statValue}>{japaCount.toLocaleString()}</Text>
          </View>
          <Text style={styles.section}>Mantras</Text>
          {mantras.length === 0 ? (
            <Text style={styles.empty}>No japa is recorded for this place yet.</Text>
          ) : (
            mantras.map(item => (
              <View key={item.name} style={styles.mantraRow}>
                <Text style={styles.mantraName}>{item.name}</Text>
                <Text style={styles.mantraMeta}>
                  {Number(item.japaCount || 0).toLocaleString()} japas ·{' '}
                  {Number(item.people || 0).toLocaleString()} people
                </Text>
              </View>
            ))
          )}
          <TouchableOpacity
            style={[styles.outlineBtn, exporting && styles.busy]}
            disabled={exporting}
            onPress={download}>
            <Text style={styles.outlineText}>
              {exporting ? 'PREPARING EXCEL...' : 'DOWNLOAD XL'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.empty}>
          {regions.length
            ? 'Select a region or place.'
            : 'No devotee has saved a region or place yet.'}
        </Text>
      )}
    </AdminScreenLayout>
  );
};

export default AdminRegionAnalyticsScreen;

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
  spinner: {marginTop: 24},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginTop: 12,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  section: {
    marginTop: 18,
    marginBottom: 8,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  mantraRow: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 8,
  },
  mantraName: {
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  mantraMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  empty: {
    marginTop: 16,
    color: Colors.textSecondary,
  },
  outlineBtn: {
    marginTop: 16,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    paddingVertical: 14,
    alignItems: 'center',
  },
  busy: {opacity: 0.6},
  outlineText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
