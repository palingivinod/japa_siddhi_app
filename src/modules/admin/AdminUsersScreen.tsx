import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import DatePickerModal from '../common/DatePickerModal';
import SelectField from '../common/SelectField';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminUser, AdminUserStatus} from './adminData';
import {
  alertExcelError,
  downloadAdminExcel,
} from './adminExcelDownload';

const JAPA_FILTERS = [
  {label: 'All', value: 'all'},
  {label: '1–100', value: '1-100'},
  {label: '101–500', value: '101-500'},
  {label: '501–1000', value: '501-1000'},
  {label: '1001–1500', value: '1001-1500'},
  {label: '1501–2000', value: '1501-2000'},
  {label: '2001–2500', value: '2001-2500'},
  {label: 'Greater than 2500', value: 'gt-2500'},
];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const dayKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const formatDay = (date: Date) =>
  `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

const matchesJapa = (count: number, filter: string) => {
  if (filter === '1-100') {
    return count >= 1 && count <= 100;
  }
  if (filter === '101-500') {
    return count >= 101 && count <= 500;
  }
  if (filter === '501-1000') {
    return count >= 501 && count <= 1000;
  }
  if (filter === '1001-1500') {
    return count >= 1001 && count <= 1500;
  }
  if (filter === '1501-2000') {
    return count >= 1501 && count <= 2000;
  }
  if (filter === '2001-2500') {
    return count >= 2001 && count <= 2500;
  }
  if (filter === 'gt-2500') {
    return count > 2500;
  }
  return true;
};

const byJapaDesc = (a: AdminUser, b: AdminUser) =>
  b.japaCount - a.japaCount || a.name.localeCompare(b.name);

const digitsOnly = (value: string) => value.replace(/\D/g, '');

/** Name, email, phone, user ID, status, japa count, or enrolled date. */
const matchesSearch = (user: AdminUser, query: string) => {
  if (!query) {
    return true;
  }
  const japa = String(user.japaCount);
  const haystack = [
    user.name,
    user.email,
    user.userCode,
    user.id,
    user.mobile,
    user.mobileNumber,
    user.mobileCountryCode,
    user.status,
    user.enrolledOn,
    japa,
    Number(japa).toLocaleString('en-IN'),
  ]
    .join(' ')
    .toLowerCase();
  if (haystack.includes(query)) {
    return true;
  }
  const queryDigits = digitsOnly(query);
  if (queryDigits.length < 2) {
    return false;
  }
  const phoneDigits = digitsOnly(
    `${user.mobileCountryCode || ''}${user.mobileNumber || user.mobile || ''}`,
  );
  return (
    phoneDigits.includes(queryDigits) ||
    String(user.id).includes(queryDigits) ||
    japa.includes(queryDigits)
  );
};

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
  const [search, setSearch] = useState('');
  const [japaFilter, setJapaFilter] = useState('all');
  const [enrolledDate, setEnrolledDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
        userCode:
          String(row.userCode || '').trim() ||
          `BPJS${String(row.id).padStart(2, '0')}`,
        name: row.name || 'Devotee',
        japaCount: Number(row.japaCount) || 0,
        status: (row.status === 'Blocked' ? 'Blocked' : 'Active') as AdminUserStatus,
        mobile: row.mobile || '—',
        email: row.email || '',
        mobileCountryCode: row.mobileCountryCode || '',
        mobileNumber: row.mobileNumber || '',
        enrolledOn: String(row.enrolledOn || '').slice(0, 10),
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

  const applyFilters = useCallback(
    (list: AdminUser[]) => {
      const query = search.trim().toLowerCase();
      const enrolledKey = enrolledDate ? dayKey(enrolledDate) : '';
      return list
        .filter(user => {
          if (enrolledKey && user.enrolledOn !== enrolledKey) {
            return false;
          }
          if (!matchesJapa(user.japaCount, japaFilter)) {
            return false;
          }
          return matchesSearch(user, query);
        })
        .sort(byJapaDesc);
    },
    [enrolledDate, japaFilter, search],
  );

  const visibleUsers = useMemo(
    () => applyFilters(users),
    [applyFilters, users],
  );
  const visibleDeleted = useMemo(
    () => applyFilters(deletedUsers),
    [applyFilters, deletedUsers],
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

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search name, email, phone, or ID"
        placeholderTextColor={Colors.placeholder}
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.filterLabel}>Date of enrolled</Text>
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowDatePicker(true)}>
          <Text style={enrolledDate ? styles.dateValue : styles.datePlaceholder}>
            {enrolledDate ? formatDay(enrolledDate) : 'Select date'}
          </Text>
        </TouchableOpacity>
        {enrolledDate ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setEnrolledDate(null)}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <DatePickerModal
        visible={showDatePicker}
        value={enrolledDate || new Date()}
        maximumDate={new Date()}
        minimumDate={new Date(2024, 0, 1)}
        onCancel={() => setShowDatePicker(false)}
        onConfirm={selected => {
          setEnrolledDate(selected);
          setShowDatePicker(false);
        }}
      />

      <Text style={styles.filterLabel}>Japa count</Text>
      <SelectField
        value={japaFilter}
        onChange={setJapaFilter}
        options={JAPA_FILTERS}
        title="Japa count"
        placeholder="All"
      />

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

      {!loading && !error && users.length > 0 && visibleUsers.length === 0 ? (
        <Text style={styles.empty}>No users match these filters.</Text>
      ) : null}

      {visibleUsers.map(user => (
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
              {user.userCode || user.id}
              {' · '}
              {user.japaCount.toLocaleString('en-IN')} Japa
              {user.email ? ` · ${user.email}` : ''}
              {user.mobile && user.mobile !== '—' ? ` · ${user.mobile}` : ''}
            </Text>
          </View>
          <StatusPill status={user.status} />
        </TouchableOpacity>
      ))}

      {visibleDeleted.length > 0 ? (
        <>
          <Text style={styles.section}>Soft-deleted (restore to keep history)</Text>
          {visibleDeleted.map(user => (
            <View key={`del-${user.id}`} style={styles.card}>
              <View style={styles.copy}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.meta}>
                  {user.userCode || user.id}
                  {' · '}
                  {user.japaCount.toLocaleString('en-IN')} Japa saved
                  {user.email ? ` · ${user.email}` : ''}
                  {user.mobile && user.mobile !== '—' ? ` · ${user.mobile}` : ''}
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
  search: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    minHeight: 50,
    color: Colors.sacredBrown,
    fontSize: 16,
    marginBottom: 12,
  },
  filterLabel: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateBtn: {
    flex: 1,
    minHeight: 50,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  dateValue: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 16,
  },
  datePlaceholder: {
    color: Colors.placeholder,
    fontSize: 16,
  },
  clearBtn: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  clearText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
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
