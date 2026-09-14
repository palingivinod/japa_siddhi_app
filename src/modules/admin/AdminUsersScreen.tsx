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
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminUser, AdminUserStatus} from './adminData';
import {
  alertExcelError,
  downloadAdminExcel,
} from './adminExcelDownload';

const StatusPill = ({status}: {status: AdminUserStatus}) => {
  const blocked = status === 'Blocked';
  return (
    <View
      style={[styles.pill, blocked ? styles.pillBlocked : styles.pillActive]}>
      <Text
        style={[
          styles.pillText,
          blocked ? styles.pillTextBlocked : styles.pillTextActive,
        ]}>
        {status}
      </Text>
    </View>
  );
};

const AdminUsersScreen = () => {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [restoringId, setRestoringId] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [activeRes, deletedRes] = await Promise.all([
        apiService.get('/admin/users'),
        apiService.get('/admin/users-deleted').catch(() => ({data: {data: []}})),
      ]);
      const rows = Array.isArray(activeRes.data?.data)
        ? activeRes.data.data
        : [];
      const deletedRows = Array.isArray(deletedRes.data?.data)
        ? deletedRes.data.data
        : [];
      const mapRow = (row: any): AdminUser => ({
        id: String(row.id),
        name: row.name || 'Devotee',
        japaCount: Number(row.japaCount) || 0,
        status: (row.status === 'Blocked' ? 'Blocked' : 'Active') as AdminUserStatus,
        mobile: row.mobile || '—',
        email: row.email || '',
        mobileCountryCode: row.mobileCountryCode || '',
        mobileNumber: row.mobileNumber || '',
      });
      setUsers(rows.map(mapRow));
      setDeletedUsers(deletedRows.map(mapRow));
    } catch (err) {
      setUsers([]);
      setDeletedUsers([]);
      setError(getApiError(err, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers]),
  );

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

  const onRestore = async (userId: string, name: string) => {
    setRestoringId(userId);
    try {
      await apiService.post(`/admin/users/${userId}/restore`);
      Alert.alert('Restored', `${name} is active again with previous japa data.`);
      await loadUsers();
    } catch (err) {
      Alert.alert('Restore failed', getApiError(err, 'Could not restore user.'));
    } finally {
      setRestoringId('');
    }
  };

  return (
    <AdminScreenLayout title="User Management" tab="AdminUsers" showBack={false}>
      <Text style={styles.heading}>User Management</Text>
      <Text style={styles.sub}>
        Live users from the server database. Soft-deleted accounts can be restored
        with their japa history.
      </Text>

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

      {error ? (
        <TouchableOpacity onPress={loadUsers}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && !error && users.length === 0 ? (
        <Text style={styles.empty}>No active registered users yet.</Text>
      ) : null}

      {users.map(user => (
        <TouchableOpacity
          key={user.id}
          style={styles.card}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('AdminUserDetails', {userId: user.id})
          }>
          <View style={styles.copy}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.meta}>
              {user.japaCount.toLocaleString('en-IN')} Japa
              {user.email ? ` · ${user.email}` : ''}
            </Text>
          </View>
          <StatusPill status={user.status} />
        </TouchableOpacity>
      ))}

      {deletedUsers.length > 0 ? (
        <>
          <Text style={styles.section}>Soft-deleted (restore to keep history)</Text>
          {deletedUsers.map(user => (
            <View key={`del-${user.id}`} style={styles.card}>
              <View style={styles.copy}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.meta}>
                  {user.japaCount.toLocaleString('en-IN')} Japa saved
                  {user.email ? ` · ${user.email}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.restoreBtn}
                disabled={restoringId === user.id}
                onPress={() => onRestore(user.id, user.name)}>
                <Text style={styles.restoreText}>
                  {restoringId === user.id ? '...' : 'RESTORE'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : null}
    </AdminScreenLayout>
  );
};

export default AdminUsersScreen;

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
  section: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.sacredBrown,
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
    paddingVertical: 24,
    alignItems: 'center',
  },
  empty: {
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
    fontWeight: '600',
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
  restoreBtn: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.leafGreen,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  restoreText: {
    fontWeight: '800',
    fontSize: 12,
    color: Colors.leafGreen,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillActive: {
    borderColor: Colors.leafGreen,
  },
  pillBlocked: {
    borderColor: Colors.error,
  },
  pillText: {
    fontWeight: '800',
    fontSize: 13,
  },
  pillTextActive: {
    color: Colors.leafGreen,
  },
  pillTextBlocked: {
    color: Colors.error,
  },
});
