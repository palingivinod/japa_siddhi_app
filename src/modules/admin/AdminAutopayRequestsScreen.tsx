import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';

export type AutopayRequestItem = {
  id: string;
  userId?: number | null;
  fullName: string;
  mobile: string;
  amount?: number | null;
  status: 'Pending' | 'Contacted' | 'Completed' | string;
  notes?: string;
  createdAt: string;
};

const TABS = ['All', 'Pending', 'Contacted', 'Completed'];

const handleCall = (mobile?: string) => {
  if (!mobile) return;
  const clean = mobile.replace(/[^\d+]/g, '');
  Linking.openURL(`tel:${clean}`).catch(() => {
    Alert.alert('Call Error', 'Unable to open phone dialer.');
  });
};

const handleWhatsApp = (mobile?: string) => {
  if (!mobile) return;
  let clean = mobile.replace(/[^\d]/g, '');
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  Linking.openURL(`https://wa.me/${clean}`).catch(() => {
    Alert.alert('WhatsApp Error', 'Unable to open WhatsApp.');
  });
};

const formatDate = (isoString?: string) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

const statusTone = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'completed') {
    return {bg: '#DCFCE7', border: '#86EFAC', text: '#15803D'};
  }
  if (s === 'contacted') {
    return {bg: '#E0F2FE', border: '#7DD3FC', text: '#0369A1'};
  }
  return {bg: '#FEF3C7', border: '#FDE68A', text: '#B45309'};
};

const AdminAutopayRequestsScreen = () => {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<AutopayRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('All');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setError('');
    try {
      const res = await apiService.get('/admin/autopay-requests');
      const list = res.data?.data || [];
      setRequests(list);
    } catch (err) {
      setError(getApiError(err, 'Could not load autopay requests.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleUpdateStatus = async (item: AutopayRequestItem, nextStatus: string) => {
    setUpdatingId(item.id);
    try {
      await apiService.patch(`/admin/autopay-requests/${item.id}/status`, {
        status: nextStatus,
      });
      setRequests(prev =>
        prev.map(r => (r.id === item.id ? {...r, status: nextStatus} : r)),
      );
    } catch (err) {
      Alert.alert('Status Update', getApiError(err, 'Failed to update status.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteRequest = (item: AutopayRequestItem) => {
    Alert.alert(
      'Delete Autopay Request',
      `Delete request from ${item.fullName || 'this devotee'}? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(item.id);
            try {
              await apiService.delete(`/admin/autopay-requests/${item.id}`);
              setRequests(prev => prev.filter(r => r.id !== item.id));
            } catch (err) {
              Alert.alert(
                'Delete Failed',
                getApiError(err, 'Could not delete this autopay request.'),
              );
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(item => {
      if (selectedTab !== 'All' && item.status.toLowerCase() !== selectedTab.toLowerCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = item.fullName.toLowerCase().includes(q);
        const phoneMatch = item.mobile.toLowerCase().includes(q);
        return nameMatch || phoneMatch;
      }
      return true;
    });
  }, [requests, selectedTab, search]);

  const counts = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status.toLowerCase() === 'pending').length;
    const contacted = requests.filter(r => r.status.toLowerCase() === 'contacted').length;
    const completed = requests.filter(r => r.status.toLowerCase() === 'completed').length;
    return {total, pending, contacted, completed};
  }, [requests]);

  return (
    <AdminScreenLayout title="Autopay Requests" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Autopay Requests</Text>
      <Text style={styles.sub}>
        Devotee requests for monthly autopay / auto-debit setup.
      </Text>

      {/* Stats Summary Card */}
      <View style={styles.statsSummaryCard}>
        <View style={styles.totalHeader}>
          <View>
            <Text style={styles.totalLabel}>TOTAL REQUESTS</Text>
            <Text style={styles.totalCount}>{counts.total}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>💳 Live Autopay</Text>
          </View>
        </View>
        <View style={styles.miniStatsRow}>
          <View style={styles.miniStatItem}>
            <Text style={[styles.miniStatCount, {color: '#B45309'}]}>
              {counts.pending}
            </Text>
            <Text style={styles.miniStatLabel}>Pending</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStatItem}>
            <Text style={[styles.miniStatCount, {color: '#0369A1'}]}>
              {counts.contacted}
            </Text>
            <Text style={styles.miniStatLabel}>Contacted</Text>
          </View>
          <View style={styles.miniStatDivider} />
          <View style={styles.miniStatItem}>
            <Text style={[styles.miniStatCount, {color: '#15803D'}]}>
              {counts.completed}
            </Text>
            <Text style={styles.miniStatLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by devotee name or phone..."
          placeholderTextColor={Colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tab Filter Bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, selectedTab === tab && styles.tabBtnActive]}
            onPress={() => setSelectedTab(tab)}>
            <Text
              style={[
                styles.tabBtnText,
                selectedTab === tab && styles.tabBtnTextActive,
              ]}>
              {tab}{' '}
              {tab === 'All'
                ? `(${counts.total})`
                : tab === 'Pending'
                ? `(${counts.pending})`
                : tab === 'Contacted'
                ? `(${counts.contacted})`
                : `(${counts.completed})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} size="large" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadRequests} style={styles.errorBox}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && !error && filteredRequests.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No autopay requests found.</Text>
        </View>
      ) : null}

      {/* Requests List */}
      {filteredRequests.map(item => {
        const tone = statusTone(item.status);
        const isPending = item.status.toLowerCase() === 'pending';
        const isContacted = item.status.toLowerCase() === 'contacted';
        const isUpdating = updatingId === item.id;

        return (
          <View key={item.id} style={styles.card}>
            {/* Header: Name & Status */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.nameCol}>
                <Text style={styles.devoteeName}>{item.fullName}</Text>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={styles.headerRightCol}>
                <View
                  style={[
                    styles.statusPill,
                    {backgroundColor: tone.bg, borderColor: tone.border},
                  ]}>
                  <Text style={[styles.statusPillText, {color: tone.text}]}>
                    {item.status}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  disabled={isUpdating}
                  onPress={() => handleDeleteRequest(item)}
                  activeOpacity={0.75}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Text style={styles.deleteBtnText}>
                    {isUpdating ? '…' : '🗑 Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Plan Badge */}
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>Selected Plan:</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>
                  ₹{item.amount || 58} / month
                </Text>
              </View>
            </View>

            {item.notes ? (
              <Text style={styles.notesText}>{item.notes}</Text>
            ) : null}

            {/* Mobile & Contact Action Buttons (Call & Msg) */}
            <View style={styles.contactRow}>
              <View style={styles.phoneInfo}>
                <Text style={styles.phoneLabel}>Phone Number:</Text>
                <Text style={styles.phoneNumber}>{item.mobile || '—'}</Text>
              </View>
              {item.mobile ? (
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={[styles.contactBtn, styles.phoneBtn]}
                    onPress={() => handleCall(item.mobile)}
                    activeOpacity={0.7}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Text style={styles.contactBtnIcon}>📞</Text>
                    <Text style={styles.contactBtnText}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactBtn, styles.whatsappBtn]}
                    onPress={() => handleWhatsApp(item.mobile)}
                    activeOpacity={0.7}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Text style={styles.contactBtnIcon}>💬</Text>
                    <Text style={styles.contactBtnText}>Msg</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* Status Update Quick Buttons */}
            <View style={styles.cardActionRow}>
              {isPending ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.contactedBtn]}
                  disabled={isUpdating}
                  onPress={() => handleUpdateStatus(item, 'Contacted')}>
                  <Text style={styles.actionBtnText}>
                    {isUpdating ? 'Updating...' : '✓ Mark Contacted'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {isContacted ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.completedBtn]}
                  disabled={isUpdating}
                  onPress={() => handleUpdateStatus(item, 'Completed')}>
                  <Text style={styles.actionBtnText}>
                    {isUpdating ? 'Updating...' : '✓ Mark Completed'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {!isPending ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.revertBtn]}
                  disabled={isUpdating}
                  onPress={() => handleUpdateStatus(item, 'Pending')}>
                  <Text style={styles.revertBtnText}>Reset to Pending</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}

      <View style={styles.bottomSpacer} />
    </AdminScreenLayout>
  );
};

export default AdminAutopayRequestsScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    marginTop: 4,
    marginBottom: 14,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  statsSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8D9B8',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  totalCount: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: Colors.sacredBrown,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#FFF4E0',
    borderColor: Colors.templeGold,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 12,
  },
  miniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5EA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  miniStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatCount: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  miniStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5D8C3',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.sacredBrown,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tabBtnActive: {
    backgroundColor: Colors.leafGreen,
    borderColor: Colors.leafGreen,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  errorBox: {
    padding: 14,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  nameCol: {
    flex: 1,
    marginRight: 8,
  },
  headerRightCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  devoteeName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  planBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  notesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  phoneInfo: {
    flex: 1,
  },
  phoneLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  phoneNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  phoneBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  whatsappBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  contactBtnIcon: {
    fontSize: 13,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactedBtn: {
    backgroundColor: '#0369A1',
  },
  completedBtn: {
    backgroundColor: '#15803D',
  },
  actionBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  revertBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  revertBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bottomSpacer: {
    height: 40,
  },
});
