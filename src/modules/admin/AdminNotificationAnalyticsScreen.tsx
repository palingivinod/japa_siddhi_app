import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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

export type NotificationAnalyticsItem = {
  id: number;
  title: string;
  message: string;
  targetGroup: string;
  sentAt: string;
  sentCount: number;
  readCount: number;
  unreadCount: number;
  readRate: number;
};

export type AnalyticsSummary = {
  totalBroadcasts: number;
  totalDelivered: number;
  totalRead: number;
  totalUnread: number;
  averageReadRate: number;
};

const formatTargetGroup = (target: string) => {
  const t = String(target || '').toLowerCase();
  if (t === 'all') return 'All Devotees';
  if (t === 'active_japa' || t === 'activejapa') return 'Active Japa';
  if (t === 'blocked') return 'Blocked Users';
  if (t === 'selected_users' || t === 'selected') return 'Selected Devotees';
  if (t === 'test') return 'Test User';
  return target;
};

const formatDate = (raw: string) => {
  if (!raw) return '';
  const clean = raw.replace('T', ' ').slice(0, 19);
  return clean;
};

const AdminNotificationAnalyticsScreen = () => {
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [items, setItems] = useState<NotificationAnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const response = await apiService.get('/admin/notifications/analytics');
      const data = response.data?.data || {};
      setSummary(data.summary || null);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(getApiError(err, 'Could not load notification analytics.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [loadAnalytics]),
  );

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => ({...prev, [id]: !prev[id]}));
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      item =>
        String(item.title || '').toLowerCase().includes(q) ||
        String(item.message || '').toLowerCase().includes(q) ||
        String(item.targetGroup || '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={styles.heading}>Notification Analytics</Text>
          <Text style={styles.sub}>
            Real-time delivery and read stats for sent notifications.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.sendNewBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AdminNotifications')}>
          <Text style={styles.sendNewBtnText}>＋ Send</Text>
        </TouchableOpacity>
      </View>

      {/* Top Summary Cards (Numbers only, clean & simple) */}
      {summary ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>OVERALL NOTIFICATION STATS</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNum}>{summary.totalBroadcasts}</Text>
              <Text style={styles.summaryLabel}>Total Sent</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNum, {color: '#0369A1'}]}>
                {summary.totalDelivered.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Delivered</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNum, {color: '#15803D'}]}>
                {summary.totalRead.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Read</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNum, {color: '#B45309'}]}>
                {summary.averageReadRate}%
              </Text>
              <Text style={styles.summaryLabel}>Read Rate</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title, message, or audience..."
          placeholderTextColor={Colors.placeholder}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.trim().length > 0 ? (
          <Text style={styles.searchCountText}>
            Showing {filteredItems.length} of {items.length} notifications
          </Text>
        ) : null}
      </View>
    </View>
  );

  const renderItem = ({item}: {item: NotificationAnalyticsItem}) => {
    const isExpanded = Boolean(expandedIds[item.id]);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleArea}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.sentAt ? (
              <Text style={styles.itemDate}>📅 {formatDate(item.sentAt)}</Text>
            ) : null}
          </View>
          <View style={styles.targetBadge}>
            <Text style={styles.targetBadgeText}>
              {formatTargetGroup(item.targetGroup)}
            </Text>
          </View>
        </View>

        {/* Message snippet */}
        {item.message ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => toggleExpand(item.id)}>
            <Text
              style={styles.itemMessage}
              numberOfLines={isExpanded ? undefined : 2}>
              {item.message}
            </Text>
            {item.message.length > 90 ? (
              <Text style={styles.expandText}>
                {isExpanded ? 'Show less ▲' : 'Show full message ▼'}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : null}

        {/* Stats Numbers Grid (No bars, clean numbers only) */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, {color: '#0369A1'}]}>
              {item.sentCount.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>👥 Delivered</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, {color: '#15803D'}]}>
              {item.readCount.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>👁️ Read</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, {color: '#6B7280'}]}>
              {item.unreadCount.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>⏳ Unread</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, {color: '#B45309'}]}>
              {item.readRate}%
            </Text>
            <Text style={styles.statLabel}>📈 Read Rate</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No Notification Analytics Found</Text>
        <Text style={styles.emptySub}>
          {search.trim().length > 0
            ? `No notifications matched “${search.trim()}”.`
            : 'Notifications sent by admin will appear here with delivery and read counts.'}
        </Text>
      </View>
    );
  };

  return (
    <AdminScreenLayout
      title="Notification Analytics"
      tab="AdminDashboard"
      showBack>
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.templeGold} />
          <Text style={styles.loadingText}>Loading notification analytics...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadAnalytics()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAnalytics(true)}
              tintColor={Colors.templeGold}
              colors={[Colors.templeGold]}
            />
          }
        />
      )}
    </AdminScreenLayout>
  );
};

export default AdminNotificationAnalyticsScreen;

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 36,
  },
  headerContainer: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleCopy: {
    flex: 1,
    marginRight: 10,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  sub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  sendNewBtn: {
    backgroundColor: Colors.leafGreen,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sendNewBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  searchWrap: {
    marginBottom: 8,
  },
  search: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.sacredBrown,
  },
  searchCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  titleArea: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    lineHeight: 22,
  },
  itemDate: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  targetBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.8,
    borderColor: '#F59E0B',
  },
  targetBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  itemMessage: {
    fontSize: 13.5,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 6,
  },
  expandText: {
    fontSize: 11.5,
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 10,
  },
  statsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginTop: 6,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  errorBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: Colors.leafGreen,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: '700',
  },
  emptyBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});

