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
import {useLanguage} from '../../i18n/LanguageContext';
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
  // Support tickets, seva replies, meetings → General (not Specific).
  if (
    action === 'SUPPORT_TICKET_REPLY' ||
    action === 'ADMIN_SEVA_REPLY' ||
    action === 'MEETING_SCHEDULED' ||
    action === 'MEETING_LIVE' ||
    /support\s*ticket|support replied|ticket solved|seva prayer reply|online class|class scheduled|class is live/i.test(
      title,
    )
  ) {
    return 'general';
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
  // Legacy "specific" without order/birthday/support signals → Specific tab.
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

/** Show send time in India (IST). Naive stamps without offset are treated as UTC. */
const formatDate = (raw: string) => {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const toIstWall = (ms: number) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(ms));
    const get = (type: string) =>
      parts.find(part => part.type === type)?.value || '00';
    let hour = get('hour');
    if (hour === '24') hour = '00';
    return `${get('year')}-${get('month')}-${get('day')} ${hour}:${get(
      'minute',
    )}:${get('second')}`;
  };

  // Backend already sends IST wall with +05:30 — show that clock (no second shift).
  if (/\+05:30$/.test(trimmed)) {
    return trimmed
      .replace('T', ' ')
      .replace(/\+05:30$/, '')
      .trim()
      .slice(0, 19);
  }

  const naive = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/,
  );
  // Naive queue stamps are already IST wall clock.
  if (naive && !/Z$/i.test(trimmed) && !/[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return `${naive[1]} ${naive[2]}`;
  }

  if (/Z$/i.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const ms = Date.parse(trimmed);
    if (Number.isFinite(ms)) {
      return toIstWall(ms);
    }
  }

  return trimmed.replace('T', ' ').slice(0, 19);
};

const PAGE_SIZE = 30;

const AdminNotificationAnalyticsScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [items, setItems] = useState<NotificationAnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterCategory>('general');
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const requestSeq = React.useRef(0);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadAnalytics = useCallback(
    async (opts?: {
      isRefresh?: boolean;
      pageToLoad?: number;
      append?: boolean;
      category?: FilterCategory;
      q?: string;
    }) => {
      const isRefresh = Boolean(opts?.isRefresh);
      const append = Boolean(opts?.append);
      const pageToLoad = opts?.pageToLoad || 1;
      const category = opts?.category || activeTab;
      const q = opts?.q !== undefined ? opts.q : debouncedSearch;
      const seq = ++requestSeq.current;
      if (isRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const response = await apiService.get('/admin/notifications/analytics', {
          params: {
            category,
            page: pageToLoad,
            limit: PAGE_SIZE,
            ...(q ? {q} : {}),
          },
        });
        if (seq !== requestSeq.current) {
          return;
        }
        const data = response.data?.data || {};
        setSummary(data.summary || null);
        const nextItems = Array.isArray(data.items) ? data.items : [];
        setItems(prev => (append ? [...prev, ...nextItems] : nextItems));
        setPage(pageToLoad);
        setTotal(Number(data.total) || nextItems.length);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        if (seq !== requestSeq.current) {
          return;
        }
        if (!append) {
          setItems([]);
          setTotal(0);
          setHasMore(false);
        }
        setError(getApiError(err, 'Could not load notification analytics.'));
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [activeTab, debouncedSearch],
  );

  useFocusEffect(
    useCallback(() => {
      loadAnalytics({pageToLoad: 1, append: false});
    }, [loadAnalytics]),
  );

  React.useEffect(() => {
    loadAnalytics({
      pageToLoad: 1,
      append: false,
      category: activeTab,
      q: debouncedSearch,
    });
  }, [activeTab, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => ({...prev, [id]: !prev[id]}));
  };

  const categoryCounts = useMemo(
    () => ({
      general: summary?.generalCount ?? 0,
      birthday: summary?.birthdayCount ?? summary?.specificCount ?? 0,
      orders: summary?.ordersCount ?? 0,
    }),
    [summary],
  );

  const activeSummary = useMemo(
    () => ({
      totalBroadcasts: summary?.totalBroadcasts ?? 0,
      totalDelivered: summary?.totalDelivered ?? 0,
      totalRead: summary?.totalRead ?? 0,
      totalUnread: summary?.totalUnread ?? 0,
      averageReadRate: summary?.averageReadRate ?? 0,
    }),
    [summary],
  );

  const displayedItems = items;

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
            {t('notificationAnalyticsSub10d') ||
              'Last 10 days — delivery and read stats (General / Specific / Orders).'}
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
        <Text style={styles.searchCountText}>
          Showing {displayedItems.length.toLocaleString('en-IN')} of{' '}
          {total.toLocaleString('en-IN')} notifications
        </Text>
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
            onPress={() => loadAnalytics({pageToLoad: 1, append: false})}>
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
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.retryBtn}
                disabled={loadingMore}
                onPress={() =>
                  loadAnalytics({pageToLoad: page + 1, append: true})
                }>
                {loadingMore ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.retryBtnText}>Load more</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{height: 24}} />
            )
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                loadAnalytics({isRefresh: true, pageToLoad: 1, append: false})
              }
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
