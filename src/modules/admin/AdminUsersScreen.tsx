import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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

const PAGE_SIZE = 50;

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

const mapUserRow = (row: any): AdminUser => ({
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [restoringId, setRestoringId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [japaFilter, setJapaFilter] = useState('all');
  const [enrolledDate, setEnrolledDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadDeleted = useCallback(async () => {
    try {
      const deletedRes = await apiService
        .get('/admin/users-deleted')
        .catch(() => ({data: {data: []}}));
      const deletedRows = Array.isArray(deletedRes.data?.data)
        ? deletedRes.data.data
        : [];
      setDeletedUsers(deletedRows.map(mapUserRow));
    } catch {
      setDeletedUsers([]);
    }
  }, []);

  const loadUsersPage = useCallback(
    async (pageToLoad: number, append: boolean) => {
      const seq = ++requestSeq.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError('');
      }
      try {
        const params: Record<string, string | number> = {
          page: pageToLoad,
          limit: PAGE_SIZE,
          japaFilter,
        };
        if (debouncedSearch) {
          params.q = debouncedSearch;
        }
        if (enrolledDate) {
          params.enrolledOn = dayKey(enrolledDate);
        }
        const activeRes = await apiService.get('/admin/users', {params});
        if (seq !== requestSeq.current) {
          return;
        }
        const rows = Array.isArray(activeRes.data?.data)
          ? activeRes.data.data.map(mapUserRow)
          : [];
        const nextTotal = Number(activeRes.data?.total) || 0;
        const nextHasMore = Boolean(activeRes.data?.hasMore);
        setPage(pageToLoad);
        setTotal(nextTotal);
        setHasMore(nextHasMore);
        setUsers(prev => (append ? [...prev, ...rows] : rows));
      } catch (err) {
        if (seq !== requestSeq.current) {
          return;
        }
        if (!append) {
          setUsers([]);
          setTotal(0);
          setHasMore(false);
        }
        setError(getApiError(err, 'Could not load users.'));
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, enrolledDate, japaFilter],
  );

  useFocusEffect(
    useCallback(() => {
      loadUsersPage(1, false);
      loadDeleted();
    }, [loadDeleted, loadUsersPage]),
  );

  const visibleUsers = users;
  const visibleDeleted = deletedUsers;

  const selectedUsers = useMemo(
    () => visibleUsers.filter(user => selectedIds[user.id]),
    [selectedIds, visibleUsers],
  );

  const allVisibleSelected =
    visibleUsers.length > 0 &&
    visibleUsers.every(user => selectedIds[user.id]);

  const toggleSelectAll = () => {
    const next: Record<string, boolean> = {...selectedIds};
    const value = !allVisibleSelected;
    visibleUsers.forEach(user => {
      next[user.id] = value;
    });
    setSelectedIds(next);
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => ({...prev, [id]: !prev[id]}));
  };

  const openNotificationForSelected = () => {
    if (!selectedUsers.length) {
      Alert.alert('Select users', 'Choose at least one user to notify.');
      return;
    }
    const payload = selectedUsers.map(user => ({
      id: user.id,
      name: user.name,
      userCode: user.userCode,
      mobile: user.mobile,
      email: user.email,
    }));
    setSelectedIds({});
    navigation.navigate('AdminNotifications', {selectedUsers: payload});
  };

  const onDownloadJapaExcel = async () => {
    setExporting(true);
    try {
      await downloadAdminExcel(
        'users',
        'User Data (profile details & total japa)',
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
      await Promise.all([loadUsersPage(1, false), loadDeleted()]);
    } catch (err) {
      Alert.alert('Restore failed', getApiError(err, 'Could not restore user.'));
    } finally {
      setRestoringId('');
    }
  };

  const onLoadMore = () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    loadUsersPage(page + 1, true);
  };

  return (
    <AdminScreenLayout title="User Management" tab="AdminUsers" showBack={false}>
      <Text style={styles.heading}>User Management</Text>
      <Text style={styles.sub}>
        Live users from the server database (50 per page). Soft-deleted accounts
        can be restored with their japa history.
      </Text>

      {selectedUsers.length > 0 ? (
        <View style={styles.notifyBar}>
          <Text style={styles.notifyHint}>
            {selectedUsers.length} user{selectedUsers.length === 1 ? '' : 's'}{' '}
            selected
          </Text>
          <TouchableOpacity
            style={styles.sendNotifyBtn}
            onPress={openNotificationForSelected}
            activeOpacity={0.85}>
            <Text style={styles.sendNotifyBtnText}>SEND NOTIFICATION</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedIds({})}>
            <Text style={styles.clearSelection}>Clear selection</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.exportBtn, exporting && styles.exportBusy]}
        disabled={exporting}
        onPress={onDownloadJapaExcel}>
        {exporting ? (
          <ActivityIndicator color={Colors.sacredBrown} />
        ) : (
          <Text style={styles.exportText}>DOWNLOAD USER DATA EXCEL</Text>
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
        <TouchableOpacity onPress={() => loadUsersPage(1, false)}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && !error && total > 0 ? (
        <Text style={styles.pageMeta}>
          Showing {visibleUsers.length.toLocaleString('en-IN')} of{' '}
          {total.toLocaleString('en-IN')} users
        </Text>
      ) : null}

      {!loading && !error && users.length === 0 ? (
        <Text style={styles.empty}>
          {debouncedSearch || enrolledDate || japaFilter !== 'all'
            ? 'No users match these filters.'
            : 'No active registered users yet.'}
        </Text>
      ) : null}

      {!loading && !error && visibleUsers.length > 0 ? (
        <View style={styles.selectAllRow}>
          <TouchableOpacity
            style={styles.selectAllHit}
            onPress={toggleSelectAll}
            activeOpacity={0.75}>
            <View
              style={[
                styles.checkbox,
                allVisibleSelected && styles.checkboxOn,
              ]}>
              {allVisibleSelected ? (
                <Text style={styles.checkMark}>✓</Text>
              ) : null}
            </View>
            <Text style={styles.selectAllText}>
              Select all on this page ({visibleUsers.length})
            </Text>
          </TouchableOpacity>
          {selectedUsers.length > 0 ? (
            <Text style={styles.selectedCount}>
              {selectedUsers.length} selected
            </Text>
          ) : null}
        </View>
      ) : null}

      {visibleUsers.map(user => {
        const checked = Boolean(selectedIds[user.id]);
        return (
          <View key={user.id} style={styles.card}>
            <TouchableOpacity
              style={styles.checkHit}
              onPress={() => toggleOne(user.id)}
              activeOpacity={0.7}>
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.copy}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('AdminUserDetails', {userId: user.id})
              }>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.meta}>
                {user.userCode || user.id}
                {' · '}
                {user.japaCount.toLocaleString('en-IN')} Japa
                {user.email ? ` · ${user.email}` : ''}
                {user.mobile && user.mobile !== '—' ? ` · ${user.mobile}` : ''}
              </Text>
            </TouchableOpacity>
            <StatusPill status={user.status} />
          </View>
        );
      })}

      {!loading && hasMore ? (
        <TouchableOpacity
          style={[styles.loadMoreBtn, loadingMore && styles.exportBusy]}
          disabled={loadingMore}
          onPress={onLoadMore}
          activeOpacity={0.85}>
          {loadingMore ? (
            <ActivityIndicator color={Colors.sacredBrown} />
          ) : (
            <Text style={styles.loadMoreText}>LOAD MORE USERS</Text>
          )}
        </TouchableOpacity>
      ) : null}

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
  pageMeta: {
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 10,
  },
  loadMoreBtn: {
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.leafGreen,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  loadMoreText: {
    color: Colors.leafGreen,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontSize: 13,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
    fontWeight: '600',
  },
  notifyBar: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  notifyHint: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
  },
  sendNotifyBtn: {
    backgroundColor: Colors.sacredBrown,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendNotifyBtnText: {
    color: Colors.white,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  clearSelection: {
    color: Colors.leafGreen,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  selectAllHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  selectedCount: {
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  checkHit: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    backgroundColor: '#FFF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.leafGreen,
    borderColor: Colors.leafGreen,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
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
