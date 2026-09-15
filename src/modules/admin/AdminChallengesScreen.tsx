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
import {AdminChallenge, AdminChallengeProgressBuckets} from './adminData';
import {alertExcelError, downloadAdminExcel} from './adminExcelDownload';

const emptyBuckets = (): AdminChallengeProgressBuckets => ({
  pct0: 0,
  pct1to25: 0,
  pct26to50: 0,
  pct51to75: 0,
  pct76to99: 0,
  pct100: 0,
});

const AdminChallengesScreen = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [exportingId, setExportingId] = useState('');
  const [exportingAll, setExportingAll] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/admin/challenges');
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setItems(
        rows.map((row: any) => {
          const active =
            row.active === true ||
            row.status === 'Active' ||
            Number(row.isActive) === 1;
          const buckets = row.progressBuckets || {};
          return {
            id: String(row.id),
            title: row.title || '',
            detail: row.detail || row.description || '',
            description: row.description || '',
            targetValue: Number(row.targetValue || 0),
            rewardName: row.rewardName || '',
            startDate: row.startDate || '',
            endDate: row.endDate || '',
            status: (active ? 'Active' : 'Inactive') as AdminChallenge['status'],
            active,
            participants: Number(row.participants || 0),
            completed: Number(row.completed || 0),
            completionRate: Number(row.completionRate || 0),
            avgProgress: Number(row.avgProgress || 0),
            progressBuckets: {
              pct0: Number(buckets.pct0 || 0),
              pct1to25: Number(buckets.pct1to25 || 0),
              pct26to50: Number(buckets.pct26to50 || 0),
              pct51to75: Number(buckets.pct51to75 || 0),
              pct76to99: Number(buckets.pct76to99 || 0),
              pct100: Number(buckets.pct100 || 0),
            },
          };
        }),
      );
    } catch (err) {
      setItems([]);
      setError(getApiError(err, 'Could not load challenges.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = async (item: AdminChallenge) => {
    const nextActive = !(item.active ?? item.status === 'Active');
    setBusyId(item.id);
    try {
      await apiService.put(`/admin/challenges/${item.id}`, {
        isActive: nextActive,
        status: nextActive ? 'Active' : 'Inactive',
      });
      setItems(prev =>
        prev.map(row =>
          row.id === item.id
            ? {
                ...row,
                active: nextActive,
                status: nextActive ? 'Active' : 'Inactive',
              }
            : row,
        ),
      );
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update challenge status.'),
      );
    } finally {
      setBusyId('');
    }
  };

  const remove = (item: AdminChallenge) => {
    Alert.alert('Delete challenge', `Remove "${item.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(item.id);
          try {
            await apiService.delete(`/admin/challenges/${item.id}`);
            setItems(prev => prev.filter(row => row.id !== item.id));
          } catch (err) {
            Alert.alert(
              'Delete failed',
              getApiError(err, 'Could not delete challenge.'),
            );
          } finally {
            setBusyId('');
          }
        },
      },
    ]);
  };

  const onDownloadAll = async () => {
    setExportingAll(true);
    try {
      await downloadAdminExcel(
        'challenge-progress',
        'Challenge progress (summary + participants)',
      );
    } catch (err) {
      alertExcelError(err);
    } finally {
      setExportingAll(false);
    }
  };

  const onDownloadOne = async (item: AdminChallenge) => {
    setExportingId(item.id);
    try {
      await downloadAdminExcel(
        'challenge-progress',
        `${item.title} progress sheet`,
        {challengeId: item.id},
      );
    } catch (err) {
      alertExcelError(err);
    } finally {
      setExportingId('');
    }
  };

  return (
    <AdminScreenLayout
      title="Challenge Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Challenge Management</Text>
      <Text style={styles.sub}>
        See how many people joined, completed, and their progress %. Download
        Excel for full participant details.
      </Text>

      <TouchableOpacity
        style={[styles.exportBtn, exportingAll && styles.exportBusy]}
        disabled={exportingAll}
        onPress={onDownloadAll}>
        {exportingAll ? (
          <ActivityIndicator color={Colors.sacredBrown} />
        ) : (
          <Text style={styles.exportText}>DOWNLOAD ALL CHALLENGE EXCEL</Text>
        )}
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={load}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <Text style={styles.empty}>No challenges yet. Create one below.</Text>
      ) : null}

      {items.map(item => {
        const active = item.active ?? item.status === 'Active';
        const busy = busyId === item.id;
        const exporting = exportingId === item.id;
        const buckets = item.progressBuckets || emptyBuckets();
        const joined = Number(item.participants || 0);
        const completed = Number(item.completed || 0);
        const completionRate = Number(item.completionRate || 0);
        const avgProgress = Number(item.avgProgress || 0);

        return (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>{item.detail}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{joined}</Text>
                <Text style={styles.statLabel}>Joined</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{completionRate}%</Text>
                <Text style={styles.statLabel}>Done rate</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{avgProgress}%</Text>
                <Text style={styles.statLabel}>Avg %</Text>
              </View>
            </View>

            <Text style={styles.bucketTitle}>Progress breakdown</Text>
            <View style={styles.bucketRow}>
              <Text style={styles.bucketChip}>0%: {buckets.pct0}</Text>
              <Text style={styles.bucketChip}>1-25%: {buckets.pct1to25}</Text>
              <Text style={styles.bucketChip}>26-50%: {buckets.pct26to50}</Text>
            </View>
            <View style={styles.bucketRow}>
              <Text style={styles.bucketChip}>51-75%: {buckets.pct51to75}</Text>
              <Text style={styles.bucketChip}>76-99%: {buckets.pct76to99}</Text>
              <Text style={styles.bucketChip}>100%: {buckets.pct100}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() =>
                  navigation.navigate('AdminChallengeCreate', {
                    id: item.id,
                    title: item.title,
                    description: item.description || item.detail,
                    detail: item.detail,
                    targetValue: item.targetValue,
                    rewardName: item.rewardName,
                    startDate: item.startDate,
                    endDate: item.endDate,
                  })
                }
                disabled={busy}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, active ? styles.pillOn : styles.pillOff]}
                onPress={() => toggle(item)}
                disabled={busy}>
                <Text
                  style={[
                    styles.pillText,
                    active ? styles.pillTextOn : styles.pillTextOff,
                  ]}>
                  {busy ? '...' : active ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.excelBtn}
                onPress={() => onDownloadOne(item)}
                disabled={exporting || busy}>
                {exporting ? (
                  <ActivityIndicator color={Colors.sacredBrown} />
                ) : (
                  <Text style={styles.excelText}>Excel</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => remove(item)}
                disabled={busy}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <PrimaryButton
        title="CREATE CHALLENGE"
        onPress={() => navigation.navigate('AdminChallengeCreate')}
      />
    </AdminScreenLayout>
  );
};

export default AdminChallengesScreen;

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
  centerBox: {paddingVertical: 20, alignItems: 'center'},
  empty: {color: Colors.textSecondary, marginBottom: 12},
  errorText: {color: Colors.error, marginBottom: 12, fontWeight: '600'},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    marginBottom: 10,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8F1E6',
    borderRadius: 12,
    paddingVertical: 10,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  bucketTitle: {
    marginBottom: 6,
    fontWeight: '700',
    color: Colors.sacredBrown,
    fontSize: 13,
  },
  bucketRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  bucketChip: {
    marginRight: 8,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  editBtn: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 72,
    alignItems: 'center',
  },
  editText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.templeGold,
  },
  pill: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 84,
    alignItems: 'center',
  },
  pillOn: {
    borderColor: Colors.leafGreen,
    backgroundColor: Colors.white,
  },
  pillOff: {
    borderColor: Colors.textSecondary,
    backgroundColor: '#F3EDE4',
  },
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: Colors.textSecondary},
  excelBtn: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 72,
    alignItems: 'center',
  },
  excelText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.sacredBrown,
  },
  deleteBtn: {
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 72,
    alignItems: 'center',
  },
  deleteText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.error,
  },
});
