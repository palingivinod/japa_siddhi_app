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
import {AdminChallenge} from './adminData';

const AdminChallengesScreen = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
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

  return (
    <AdminScreenLayout
      title="Challenge Management"
      tab="AdminDashboard"
      showBack>
      <Text style={styles.heading}>Challenge Management</Text>
      <Text style={styles.sub}>
        Tap Active/Inactive to show or hide a challenge. Use Edit to change
        details, or Delete to remove it.
      </Text>

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
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{item.detail}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() =>
                  navigation.navigate('AdminChallengeCreate', {
                    id: item.id,
                    title: item.title,
                    description: (item as any).description || item.detail,
                    detail: item.detail,
                    targetValue: (item as any).targetValue,
                    rewardName: (item as any).rewardName,
                    startDate: (item as any).startDate,
                    endDate: (item as any).endDate,
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
    marginBottom: 16,
    color: Colors.textSecondary,
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
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1, paddingRight: 8},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  actions: {alignItems: 'flex-end'},
  editBtn: {
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 88,
    alignItems: 'center',
  },
  editText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.templeGold,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 88,
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
  deleteBtn: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 88,
    alignItems: 'center',
  },
  deleteText: {
    fontWeight: '800',
    fontSize: 13,
    color: Colors.error,
  },
});
