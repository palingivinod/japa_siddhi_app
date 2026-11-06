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
  category?: 'general' | 'birthday' | 'orders' | 'specific';
  actionType?: string;
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
  generalCount?: number;
  birthdayCount?: number;
  ordersCount?: number;
  specificCount?: number;
};

type FilterCategory = 'general' | 'birthday' | 'orders';

const resolveItemCategory = (
  item: NotificationAnalyticsItem,
): FilterCategory => {
  const raw = String(item.category || '').toLowerCase();
  const action = String(item.actionType || '').toUpperCase();
  const title = String(item.title || '');

  // Order actions / titles first — legacy rows were often stored as "specific".
  if (
    raw === 'orders' ||
    raw === 'order' ||
    action === 'ORDER_STATUS' ||
    action === 'ORDER_ADMIN_NOTE' ||
    /order status|order update/i.test(title)
  ) {
    return 'orders';
  }
  if (
    raw === 'birthday' ||
    action === 'TODAY_BIRTHDAY' ||
    action === 'ADVANCE_BIRTHDAY' ||
    action === 'DOB_WISH' ||
    /birthday|jayanthi|vardhanti|occasion|anniversary/i.test(title)
  ) {
    return 'birthday';
  }
  // Legacy "specific" without order/birthday signals → Specific tab.
  if (raw === 'specific') {
    return 'birthday';
  }
  return 'general';
};

const categoryBadgeLabel = (category: FilterCategory) => {
  if (category === 'orders') return '📦 Orders';
  if (category === 'birthday') return '🎂 Specific';
  return '🌐 General';
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
  const [activeTab, setActiveTab] = useState<FilterCategory>('general');
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      // Load unfiltered list; tabs filter client-side so counts stay consistent.
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

  const categoryCounts = useMemo(() => {
    let general = 0;
    let birthday = 0;
    let orders = 0;
    for (const item of items) {
      const cat = resolveItemCategory(item);
      if (cat === 'orders') {
        orders += 1;
      } else if (cat === 'birthday') {
        birthday += 1;
      } else {
        general += 1;
      }
    }
    return {
      general: summary?.generalCount ?? general,
      birthday: summary?.birthdayCount ?? summary?.specificCount ?? birthday,
      orders: summary?.ordersCount ?? orders,
    };
  }, [items, summary]);

  const tabFilteredItems = useMemo(() => {
    return items.filter(it => resolveItemCategory(it) === activeTab);
  }, [items, activeTab]);

  const activeSummary = useMemo(() => {
    let totalDelivered = 0;
    let totalRead = 0;
    for (const it of tabFilteredItems) {
      totalDelivered += it.sentCount;
      totalRead += it.readCount;
    }
    const totalBroadcasts = tabFilteredItems.length;
    const averageReadRate =
      totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    return {
      totalBroadcasts,
      totalDelivered,
      totalRead,
      totalUnread: Math.max(0, totalDelivered - totalRead),
      averageReadRate,
    };
  }, [tabFilteredItems]);

  const displayedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabFilteredItems;
    return tabFilteredItems.filter(
      item =>
        String(item.title || '').toLowerCase().includes(q) ||
        String(item.message || '').toLowerCase().includes(q) ||
        String(item.targetGroup || '').toLowerCase().includes(q) ||
        String(item.actionType || '').toLowerCase().includes(q),
    );
  }, [tabFilteredItems, search]);

  const summaryHeaderLabel = useMemo(() => {
    if (activeTab === 'birthday') return 'SPECIFIC (BIRTHDAY & OCCASION) STATS';
    if (activeTab === 'orders') return 'ORDERS NOTIFICATION STATS';
    return 'GENERAL NOTIFICATION STATS';
  }, [activeTab]);

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

      <View style={styles.tabBar}>
        {(
          [
            {id: 'general' as const, label: `🌐 General (${categoryCounts.general})`},
            {
              id: 'birthday' as const,
              label: `🎂 Specific (${categoryCounts.birthday})`,
            },
            {id: 'orders' as const, label: `📦 Orders (${categoryCounts.orders})`},
          ] as const
        ).map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab(tab.id)}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === tab.id && styles.tabBtnTextActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Top Summary Cards (Dynamic based on selected filter tab) */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{summaryHeaderLabel}</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNum}>{activeSummary.totalBroadcasts}</Text>
            <Text style={styles.summaryLabel}>Total Sent</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNum, {color: '#0369A1'}]}>
              {activeSummary.totalDelivered.toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Delivered</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNum, {color: '#15803D'}]}>
              {activeSummary.totalRead.toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Read</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNum, {color: '#6B7280'}]}>
              {activeSummary.totalUnread.toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Unread</Text>
          </View>
        </View>
        <View style={styles.summaryRateRow}>
          <Text style={styles.summaryRateLabel}>Read Rate</Text>
          <Text style={styles.summaryRateValue}>
            {activeSummary.averageReadRate}%
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notifications..."
          placeholderTextColor={Colors.placeholder}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.trim().length > 0 ? (
          <Text style={styles.searchCountText}>
            Showing {displayedItems.length} of {tabFilteredItems.length} notifications
          </Text>
        ) : null}
      </View>
    </View>
  );

  const renderItem = ({item}: {item: NotificationAnalyticsItem}) => {
    const isExpanded = Boolean(expandedIds[item.id]);
    const itemCategory = resolveItemCategory(item);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleArea}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.sentAt ? (
              <Text style={styles.itemDate}>📅 {formatDate(item.sentAt)}</Text>
            ) : null}
          </View>
          <View style={styles.badgeColumn}>
            <View
              style={[
                styles.categoryBadge,
                itemCategory === 'orders'
                  ? styles.ordersBadge
                  : itemCategory === 'birthday'
                    ? styles.specificBadge
                    : styles.generalBadge,
              ]}>
              <Text
                style={[
                  styles.categoryBadgeBaseText,
                  itemCategory === 'orders'
                    ? styles.ordersBadgeText
                    : itemCategory === 'birthday'
                      ? styles.specificBadgeText
                      : styles.generalBadgeText,
                ]}>
                {categoryBadgeLabel(itemCategory)}
              </Text>
            </View>
            <View style={styles.targetBadge}>
              <Text style={styles.targetBadgeText}>
                {formatTargetGroup(item.targetGroup)}
              </Text>
            </View>
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

        {/* Stats Numbers Grid */}
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
            : activeTab === 'birthday'
              ? 'No specific (birthday or occasion) notifications found yet.'
              : activeTab === 'orders'
                ? 'No order-related notifications found yet.'
                : 'Notifications sent by admin will appear here with delivery and read counts.'}
        </Text>
      </View>
    );
  };

  return (
    <AdminScreenLayout title="Notification Analytics" tab="AdminMore" showBack>
      {loading && !refreshing ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={Colors.leafGreen} />
          <Text style={styles.loaderText}>Loading analytics...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadAnalytics()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedItems}
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
              tintColor={Colors.leafGreen}
              colors={[Colors.leafGreen]}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: Colors.leafGreen,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tabBtnTextActive: {
    color: Colors.white,
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
  summaryRateRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryRateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  summaryRateValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B45309',
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
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.8,
  },
  categoryBadgeBaseText: {
    fontSize: 10,
    fontWeight: '800',
  },
  generalBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  generalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  specificBadge: {
    backgroundColor: '#FDF2F8',
    borderColor: '#EC4899',
  },
  specificBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BE185D',
  },
  ordersBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  ordersBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  targetBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.8,
    borderColor: '#F59E0B',
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  itemMessage: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#374151',
    marginTop: 2,
    marginBottom: 4,
  },
  expandText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.leafGreen,
    marginBottom: 8,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    fontWeight: '600',
  },
  errorBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: Colors.leafGreen,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
});
