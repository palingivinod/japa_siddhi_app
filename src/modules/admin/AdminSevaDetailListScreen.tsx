import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import DatePickerModal from '../common/DatePickerModal';
import {alertExcelError, downloadAdminExcel} from './adminExcelDownload';
import {useLanguage} from '../../i18n/LanguageContext';

export type SevaDonationItem = {
  id: string;
  userId?: number | null;
  donationType: string;
  amount: number;
  donorName: string;
  donorPhone: string;
  preferDate: string;
  occasion?: string;
  forWhom?: string;
  personName?: string;
  remarks?: string;
  transactionId?: string;
  donatedAt?: string;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
};

type TabScope = 'upcoming' | 'past' | 'all';

const QUICK_TEMPLATES = [
  'Prasad dispatched 🙏',
  'Sankalpam performed with your Gotram & Nakshatram 🔥',
  'We will contact you shortly regarding the seva arrangements 🪔',
  'Seva successfully performed. May Lord Shiva bless you and your family! 🕉️',
];

const pad = (n: number) => String(n).padStart(2, '0');

const toScheduleStamp = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:00`;

const defaultLater = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatTimeLabel = (date: Date) =>
  date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

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

const formatDate = (raw?: string) => {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return raw;
  }
};

const remarkField = (remarks: string | undefined, label: string) => {
  const raw = String(remarks || '');
  if (!raw) {
    return '';
  }
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = raw.match(
    new RegExp(`${escaped}\\s*:\\s*([^|]+)`, 'i'),
  );
  return String(match?.[1] || '').trim();
};

const AdminSevaDetailListScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();

  const sevaType = String(route.params?.type || 'ANNADANAM').toUpperCase();
  const screenTitle =
    route.params?.title ||
    (sevaType === 'ANNADANAM'
      ? t('annaSantharpana') || 'Anna Santharpana'
      : t('nithyaHomam') || 'Nithya Homam');

  const [activeTab, setActiveTab] = useState<TabScope>('upcoming');
  const [preferDateFilter, setPreferDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<SevaDonationItem[]>([]);
  const [counts, setCounts] = useState({upcoming: 0, past: 0, total: 0});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Date picker state (filter vs edit prefer-date)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());
  const [datePickerMode, setDatePickerMode] = useState<'filter' | 'edit'>('filter');

  // Reply modal state
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<SevaDonationItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editDonorName, setEditDonorName] = useState('');
  const [editDonorPhone, setEditDonorPhone] = useState('');
  const [editPreferDate, setEditPreferDate] = useState('');
  const [editOccasion, setEditOccasion] = useState('');
  const [editForWhom, setEditForWhom] = useState('');
  const [editPersonName, setEditPersonName] = useState('');
  const [editGothram, setEditGothram] = useState('');
  const [editNakshatram, setEditNakshatram] = useState('');
  const [editComments, setEditComments] = useState('');

  // Checklist & Broadcast State
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSchedule, setBroadcastSchedule] = useState<'Now' | 'Later'>('Now');
  const [broadcastScheduledAt, setBroadcastScheduledAt] = useState<Date>(defaultLater);
  const [showBroadcastDate, setShowBroadcastDate] = useState(false);
  const [showBroadcastTime, setShowBroadcastTime] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await downloadAdminExcel('seva', `${screenTitle} Report`, {
        sevaType,
        scope: activeTab,
        preferDate: preferDateFilter,
      });
    } catch (err) {
      alertExcelError(err);
    } finally {
      setExporting(false);
    }
  };

  const loadData = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('type', sevaType);
      params.append('scope', activeTab);
      if (preferDateFilter) {
        params.append('preferDate', preferDateFilter);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await apiService.get(`/admin/seva-donations?${params.toString()}`);
      const data = res.data?.data || {};
      setItems(data.items || []);
      if (data.counts) {
        setCounts({
          upcoming: Number(data.counts.upcoming || 0),
          past: Number(data.counts.past || 0),
          total: Number(data.counts.total || 0),
        });
      }
    } catch (err) {
      setError(getApiError(err, 'Could not load seva offerings.'));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sevaType, activeTab, preferDateFilter, search]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openDatePicker = () => {
    setDatePickerMode('filter');
    if (preferDateFilter && preferDateFilter !== '__none__') {
      try {
        const parsed = new Date(preferDateFilter);
        if (!isNaN(parsed.getTime())) {
          setDatePickerValue(parsed);
        }
      } catch {
        setDatePickerValue(new Date());
      }
    } else {
      setDatePickerValue(new Date());
    }
    setShowDatePicker(true);
  };

  const onDatePicked = (selected: Date) => {
    setShowDatePicker(false);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    const stamp = `${yyyy}-${mm}-${dd}`;
    if (datePickerMode === 'edit') {
      setEditPreferDate(stamp);
      return;
    }
    setPreferDateFilter(stamp);
  };

  const clearDateFilter = () => {
    setPreferDateFilter('');
  };

  const openEditPreferDatePicker = () => {
    setDatePickerMode('edit');
    if (editPreferDate) {
      const parsed = new Date(editPreferDate);
      if (!Number.isNaN(parsed.getTime())) {
        setDatePickerValue(parsed);
      }
    } else {
      setDatePickerValue(new Date());
    }
    setShowDatePicker(true);
  };

  const openReplyModal = (item: SevaDonationItem) => {
    setSelectedDonation(item);
    setReplyText(item.adminReply || '');
    setReplyModalVisible(true);
  };

  const openEditModal = (item: SevaDonationItem) => {
    setSelectedDonation(item);
    setEditDonorName(String(item.donorName || ''));
    setEditDonorPhone(String(item.donorPhone || '').replace(/\D/g, '').slice(-10));
    setEditPreferDate(String(item.preferDate || ''));
    setEditOccasion(String(item.occasion || ''));
    setEditForWhom(String(item.forWhom || ''));
    setEditPersonName(String(item.personName || ''));
    setEditGothram(remarkField(item.remarks, 'Gothram'));
    setEditNakshatram(remarkField(item.remarks, 'Nakshatram'));
    setEditComments(remarkField(item.remarks, 'Comments'));
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedDonation(null);
    setSavingEdit(false);
  };

  const submitEdit = async () => {
    if (!selectedDonation) {
      return;
    }
    const name = editDonorName.trim();
    if (!name) {
      Alert.alert('Required', 'Devotee name is required.');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await apiService.put(
        `/admin/seva-donations/${selectedDonation.id}`,
        {
          donorName: name,
          donorPhone: editDonorPhone.trim(),
          preferDate: editPreferDate.trim() || null,
          occasion: editOccasion.trim(),
          forWhom: editForWhom.trim(),
          personName: editPersonName.trim(),
          gothram: editGothram.trim(),
          nakshatram: editNakshatram.trim(),
          comments: editComments.trim(),
        },
      );
      const updated = res.data?.data || {};
      setItems(prev =>
        prev.map(i =>
          String(i.id) === String(selectedDonation.id)
            ? {
                ...i,
                donorName: updated.donorName ?? name,
                donorPhone: updated.donorPhone ?? editDonorPhone.trim(),
                preferDate: updated.preferDate ?? editPreferDate.trim(),
                occasion: updated.occasion ?? editOccasion.trim(),
                forWhom: updated.forWhom ?? editForWhom.trim(),
                personName: updated.personName ?? editPersonName.trim(),
                remarks: updated.remarks ?? i.remarks,
              }
            : i,
        ),
      );
      closeEditModal();
      Alert.alert('Saved', 'Devotee seva details updated.');
    } catch (err) {
      Alert.alert(
        'Update failed',
        getApiError(err, 'Could not update seva details.'),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const closeReplyModal = () => {
    setReplyModalVisible(false);
    setSelectedDonation(null);
    setReplyText('');
  };

  const submitReply = async () => {
    if (!selectedDonation) return;
    const clean = replyText.trim();
    if (!clean) {
      Alert.alert('Empty Reply', 'Please enter a reply message before sending.');
      return;
    }

    setSubmittingReply(true);
    try {
      const res = await apiService.post(
        `/admin/seva-donations/${selectedDonation.id}/reply`,
        {reply: clean},
      );
      const resData = res.data?.data || {};

      setItems(prev =>
        prev.map(i =>
          i.id === selectedDonation.id
            ? {
                ...i,
                adminReply: clean,
                adminRepliedAt: resData.adminRepliedAt || 'Just now',
              }
            : i,
        ),
      );

      closeReplyModal();
      Alert.alert(
        'Reply Sent 🙏',
        resData.pushSent
          ? 'Reply sent! In-app notification and instant push pop-up sent to devotee.'
          : 'Reply sent! In-app notification stored in devotee’s notifications screen.',
      );
    } catch (err) {
      Alert.alert('Send Error', getApiError(err, 'Failed to send reply to devotee.'));
    } finally {
      setSubmittingReply(false);
    }
  };

  useEffect(() => {
    setSelectedIds({});
  }, [activeTab, preferDateFilter, search]);

  const broadcastTemplates = useMemo(
    () =>
      sevaType === 'NITHYA_HOMAM'
        ? [
            'Sankalpam performed with your Gotram & Nakshatram 🔥',
            'Homam Prasadam dispatched to your address 🙏',
            'Nithya Homam completed today. May Lord Shiva bless you and your family! 🕉️',
            'We will perform special prayers on your requested prefer date 🪔',
          ]
        : [
            'Anna Santharpana Seva successfully performed in your name 🙏',
            'Prasad dispatched to your address 📦',
            'Devotees served today with your generous anna offering 🍚',
            'May Lord Shiva bless you and your family! 🕉️',
          ],
    [sevaType],
  );

  const notifyableItems = useMemo(
    () => items.filter(item => Boolean(item.userId && Number(item.userId) > 0)),
    [items],
  );

  const selectedItems = useMemo(
    () => notifyableItems.filter(item => selectedIds[item.id]),
    [notifyableItems, selectedIds],
  );

  const allSelected =
    notifyableItems.length > 0 &&
    notifyableItems.every(item => selectedIds[item.id]);

  const toggleSelectAll = () => {
    if (!notifyableItems.length) return;
    const next: Record<string, boolean> = {...selectedIds};
    const val = !allSelected;
    notifyableItems.forEach(item => {
      next[item.id] = val;
    });
    setSelectedIds(next);
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => ({...prev, [id]: !prev[id]}));
  };

  const sendBroadcastMessage = async () => {
    const userIds = Array.from(
      new Set(
        selectedItems
          .map(item => Number(item.userId))
          .filter(id => Boolean(id && id > 0)),
      ),
    );

    if (!userIds.length) {
      Alert.alert(
        'Select Devotees',
        'Please select at least one devotee with an app account.',
      );
      return;
    }

    const cleanMsg = broadcastMessage.trim();
    if (!cleanMsg) {
      Alert.alert(
        'Message Required',
        'Please enter a message to send to the selected devotees.',
      );
      return;
    }

    if (
      broadcastSchedule === 'Later' &&
      broadcastScheduledAt.getTime() <= Date.now() + 60_000
    ) {
      Alert.alert(
        'Schedule Error',
        'Pick a date and time at least one minute in the future.',
      );
      return;
    }

    const defTitle =
      sevaType === 'NITHYA_HOMAM'
        ? 'Nithya Homam Blessing 🙏'
        : `${screenTitle} Blessing 🙏`;
    const finalTitle = broadcastTitle.trim() || defTitle;

    setBroadcasting(true);
    try {
      const response = await apiService.post('/admin/seva-donations/notify', {
        sevaType,
        userIds,
        title: finalTitle,
        message: cleanMsg,
        schedule: broadcastSchedule,
        scheduledAt:
          broadcastSchedule === 'Later'
            ? toScheduleStamp(broadcastScheduledAt)
            : undefined,
      });

      const resData = response.data?.data || {};
      const detail =
        response.data?.message ||
        (resData.mode === 'scheduled'
          ? `Scheduled for ${resData.sendAt}`
          : `Sent to ${resData.recipientCount || userIds.length} devotees`);

      Alert.alert(
        resData.mode === 'scheduled' ? 'Message Scheduled ⏰' : 'Message Sent 🙏',
        `${detail}\n\nSelected: ${userIds.length} devotees\nDelivery: ${
          broadcastSchedule === 'Later'
            ? `${formatDateLabel(broadcastScheduledAt)} ${formatTimeLabel(broadcastScheduledAt)} (IST)`
            : 'Immediate Push'
        }`,
      );

      setBroadcastMessage('');
      setBroadcastSchedule('Now');
      setBroadcastScheduledAt(defaultLater());
      setSelectedIds({});
    } catch (err) {
      Alert.alert('Send Failed', getApiError(err, 'Could not broadcast message.'));
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <AdminScreenLayout title={screenTitle} tab="AdminMore" showBack>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{screenTitle}</Text>
              <Text style={styles.subtitle}>
                Devotee donation offerings, contact options, prefer dates, and immediate replies.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.exportBtn, exporting && styles.exportBtnBusy]}
              disabled={exporting}
              onPress={handleExportExcel}
              activeOpacity={0.8}>
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.exportBtnIcon}>📊</Text>
                  <Text style={styles.exportBtnText}>{t('exportExcel') || 'Export XL'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Filter Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
            onPress={() => setActiveTab('upcoming')}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'upcoming' && styles.tabBtnTextActive,
              ]}>
              {t('upcomingTab') || 'Upcoming'} ({counts.upcoming})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'past' && styles.tabBtnActive]}
            onPress={() => setActiveTab('past')}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'past' && styles.tabBtnTextActive,
              ]}>
              {t('pastTab') || 'Past'} ({counts.past})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'all' && styles.tabBtnTextActive,
              ]}>
              {t('orderTabAll') || 'All'} ({counts.total})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Prefer Date Filter Bar */}
        <View style={styles.filterCard}>
          <View style={styles.filterHeaderRow}>
            <Text style={styles.filterLabel}>{t('filterByDate') || 'FILTER BY PREFER DATE'}:</Text>
            {preferDateFilter ? (
              <TouchableOpacity onPress={clearDateFilter} style={styles.clearDateBtn}>
                <Text style={styles.clearDateText}>✕ Clear Filter</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.filterChipRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                preferDateFilter === '__none__' ? styles.filterChipActive : null,
              ]}
              onPress={() =>
                setPreferDateFilter(prev =>
                  prev === '__none__' ? '' : '__none__',
                )
              }
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.filterChipText,
                  preferDateFilter === '__none__'
                    ? styles.filterChipTextActive
                    : null,
                ]}>
                No prefer date
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.datePickerBtn,
              preferDateFilter && preferDateFilter !== '__none__'
                ? styles.datePickerBtnActive
                : null,
            ]}
            onPress={openDatePicker}
            activeOpacity={0.8}>
            <Text style={styles.datePickerIcon}>📅</Text>
            <Text
              style={[
                styles.datePickerText,
                preferDateFilter && preferDateFilter !== '__none__'
                  ? styles.datePickerTextActive
                  : null,
              ]}>
              {preferDateFilter === '__none__'
                ? 'Showing: No prefer date'
                : preferDateFilter
                  ? `Prefer Date: ${preferDateFilter}`
                  : 'Tap to select a prefer date...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by devotee name, phone, occasion..."
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

        {/* Loading Indicator */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={Colors.templeGold} size="large" />
            <Text style={styles.loadingText}>Loading devotee offerings...</Text>
          </View>
        ) : null}

        {/* Error Notice */}
        {error ? (
          <TouchableOpacity onPress={loadData} style={styles.errorBox}>
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </TouchableOpacity>
        ) : null}

        {/* Empty Notice */}
        {!loading && !error && items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🪔</Text>
            <Text style={styles.emptyTitle}>No offerings found</Text>
            <Text style={styles.emptySubtitle}>
              {preferDateFilter === '__none__'
                ? `No devotees without a prefer date in the ${activeTab} view.`
                : preferDateFilter
                  ? `No devotees have selected ${preferDateFilter} in the ${activeTab} view.`
                  : `There are currently no records in the ${activeTab} tab.`}
            </Text>
            {preferDateFilter ? (
              <TouchableOpacity
                onPress={clearDateFilter}
                style={styles.resetFilterBtn}>
                <Text style={styles.resetFilterText}>Show All Dates</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Bulk Select Bar */}
        {!loading && items.length > 0 ? (
          <View style={styles.selectBar}>
            <TouchableOpacity
              style={styles.selectAllBtn}
              onPress={toggleSelectAll}
              disabled={!notifyableItems.length}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.checkbox,
                  allSelected && styles.checkboxOn,
                ]}>
                {allSelected ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.selectAllText}>Select all</Text>
            </TouchableOpacity>
            <Text style={styles.countText}>
              {selectedItems.length} selected of {notifyableItems.length}
              {items.length !== notifyableItems.length
                ? ` (${items.length - notifyableItems.length} no app account)`
                : ''}
            </Text>
          </View>
        ) : null}

        {/* Devotee Offerings List */}
        {items.map(item => {
          const isUpcoming =
            item.preferDate &&
            new Date(item.preferDate) > new Date(new Date().toDateString());
          const gothram = remarkField(item.remarks, 'Gothram');
          const nakshatram = remarkField(item.remarks, 'Nakshatram');
          const comments = remarkField(item.remarks, 'Comments');
          const canNotify = Boolean(item.userId && Number(item.userId) > 0);
          const checked = Boolean(selectedIds[item.id]);

          return (
            <View key={item.id} style={styles.card}>
              {/* Card Top: Checkbox, Name & Amount */}
              <View style={styles.cardHeaderRow}>
                <TouchableOpacity
                  style={styles.cardCheckHit}
                  onPress={() => (canNotify ? toggleOne(item.id) : undefined)}
                  disabled={!canNotify}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.checkbox,
                      checked && styles.checkboxOn,
                      !canNotify && styles.checkboxDisabled,
                    ]}>
                    {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                </TouchableOpacity>

                <View style={styles.nameCol}>
                  <Text style={styles.devoteeName}>
                    {item.donorName || 'Devotee'}
                  </Text>
                  <Text style={styles.donatedAtText}>
                    Donated: {item.donatedAt || '—'}
                    {!canNotify ? ' · no app account' : ''}
                  </Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountText}>₹{item.amount}</Text>
                </View>
              </View>

              {/* Prefer Date Badge */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Prefer Date:</Text>
                <View
                  style={[
                    styles.preferDateBadge,
                    isUpcoming
                      ? styles.preferDateUpcoming
                      : styles.preferDatePast,
                  ]}>
                  <Text
                    style={[
                      styles.preferDateText,
                      isUpcoming
                        ? styles.preferDateTextUpcoming
                        : styles.preferDateTextPast,
                    ]}>
                    📅 {item.preferDate || 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Occasion / Purpose */}
              {item.occasion ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Occasion / Purpose:</Text>
                  <Text style={styles.detailValue}>{item.occasion}</Text>
                </View>
              ) : null}

              {/* For Whom / Person Name */}
              {item.forWhom || item.personName ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>For:</Text>
                  <Text style={styles.detailValue}>
                    {[item.forWhom, item.personName]
                      .filter(Boolean)
                      .join(' - ')}
                  </Text>
                </View>
              ) : null}

              {gothram ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gothram:</Text>
                  <Text style={styles.detailValue}>{gothram}</Text>
                </View>
              ) : null}
              {nakshatram ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nakshatram / Star:</Text>
                  <Text style={styles.detailValue}>{nakshatram}</Text>
                </View>
              ) : null}
              {comments ? (
                <View style={styles.remarksBox}>
                  <Text style={styles.remarksLabel}>Comments:</Text>
                  <Text style={styles.remarksText}>{comments}</Text>
                </View>
              ) : null}

              {/* Full remarks fallback when structured fields missing */}
              {item.remarks && !gothram && !nakshatram && !comments ? (
                <View style={styles.remarksBox}>
                  <Text style={styles.remarksLabel}>Devotee Details:</Text>
                  <Text style={styles.remarksText}>{item.remarks}</Text>
                </View>
              ) : null}

              {/* Admin Reply Section (if reply already sent) */}
              {item.adminReply ? (
                <View style={styles.existingReplyBox}>
                  <View style={styles.replyHeaderRow}>
                    <Text style={styles.replyBadgeText}>
                      ✓ Admin Reply Dispatched
                    </Text>
                    {item.adminRepliedAt ? (
                      <Text style={styles.replyTimeText}>
                        {item.adminRepliedAt}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.replyContentText}>{item.adminReply}</Text>
                </View>
              ) : null}

              {/* Contact & Reply Action Bar */}
              <View style={styles.contactRow}>
                <View style={styles.phoneCol}>
                  <Text style={styles.phoneLabel}>Phone:</Text>
                  <Text style={styles.phoneNumber}>
                    {item.donorPhone || '—'}
                  </Text>
                </View>

                <View style={styles.actionButtonsRow}>
                  {item.donorPhone ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.callBtn]}
                        onPress={() => handleCall(item.donorPhone)}
                        activeOpacity={0.75}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                        <Text style={styles.actionBtnIcon}>📞</Text>
                        <Text style={styles.actionBtnText}>Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.whatsappBtn]}
                        onPress={() => handleWhatsApp(item.donorPhone)}
                        activeOpacity={0.75}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                        <Text style={styles.actionBtnIcon}>💬</Text>
                        <Text style={styles.actionBtnText}>Msg</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.replyBtn]}
                    onPress={() => openReplyModal(item)}
                    activeOpacity={0.75}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Text style={styles.actionBtnIcon}>✉️</Text>
                    <Text style={styles.actionBtnText}>
                      {item.adminReply ? 'Update' : 'Reply'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.75}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Text style={styles.actionBtnIcon}>✏️</Text>
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
        {/* Broadcast Message Card */}
        {!loading && items.length > 0 ? (
          <View style={styles.broadcastCard}>
            <View style={styles.broadcastHeader}>
              <Text style={styles.broadcastTitle}>Send Message to Devotees</Text>
              <Text style={styles.broadcastSubtitle}>
                Compose a message and broadcast directly to all selected devotees simultaneously via push notification.
              </Text>
            </View>

            <Text style={styles.broadcastInputLabel}>Notification Title</Text>
            <TextInput
              style={styles.broadcastInput}
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
              placeholder={
                sevaType === 'NITHYA_HOMAM'
                  ? 'Nithya Homam Blessing 🙏'
                  : `${screenTitle} Blessing 🙏`
              }
              placeholderTextColor={Colors.placeholder}
            />

            <Text style={[styles.broadcastInputLabel, styles.broadcastInputLabelSpaced]}>
              Message
            </Text>
            <TextInput
              style={[styles.broadcastInput, styles.broadcastInputMultiline]}
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              placeholder="Write homam update, sankalpam blessings, or prasad dispatch notes…"
              placeholderTextColor={Colors.placeholder}
              multiline
              textAlignVertical="top"
            />

            {/* Quick Templates */}
            <Text style={[styles.broadcastInputLabel, styles.broadcastInputLabelSpaced]}>
              Quick Templates
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateScroll}>
              {broadcastTemplates.map((template, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.broadcastTemplateChip}
                  onPress={() => setBroadcastMessage(template)}
                  activeOpacity={0.7}>
                  <Text style={styles.broadcastTemplateChipText} numberOfLines={1}>
                    {template}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.broadcastInputLabel, styles.broadcastInputLabelSpaced]}>
              When to Send
            </Text>
            <View style={styles.broadcastChipRow}>
              {(['Now', 'Later'] as const).map(option => {
                const active = broadcastSchedule === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.broadcastChip, active && styles.broadcastChipActive]}
                    onPress={() => setBroadcastSchedule(option)}>
                    <Text
                      style={[
                        styles.broadcastChipText,
                        active && styles.broadcastChipTextActive,
                      ]}>
                      {option === 'Now' ? '⚡ Now (Instant)' : '⏰ Later (Schedule)'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {broadcastSchedule === 'Later' ? (
              <View style={styles.scheduleRow}>
                <TouchableOpacity
                  style={styles.scheduleBtn}
                  onPress={() => setShowBroadcastDate(true)}>
                  <Text style={styles.scheduleBtnIcon}>📅</Text>
                  <Text style={styles.scheduleText}>
                    {formatDateLabel(broadcastScheduledAt)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.scheduleBtn}
                  onPress={() => setShowBroadcastTime(true)}>
                  <Text style={styles.scheduleBtnIcon}>⏰</Text>
                  <Text style={styles.scheduleText}>
                    {formatTimeLabel(broadcastScheduledAt)}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.broadcastCountHint}>
              Ready to send to {selectedItems.length} of {notifyableItems.length} selected devotees
            </Text>

            <TouchableOpacity
              style={[
                styles.broadcastSendBtn,
                (broadcasting || !selectedItems.length) &&
                  styles.broadcastSendBtnDisabled,
              ]}
              disabled={broadcasting || !selectedItems.length}
              onPress={sendBroadcastMessage}
              activeOpacity={0.85}>
              {broadcasting ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.broadcastSendText}>
                  {broadcastSchedule === 'Later'
                    ? `SCHEDULE MESSAGE (${selectedItems.length})`
                    : `SEND TO ALL SELECTED (${selectedItems.length})`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Broadcast Date Pickers */}
      <DatePickerModal
        visible={showBroadcastDate}
        value={broadcastScheduledAt}
        mode="date"
        onCancel={() => setShowBroadcastDate(false)}
        onConfirm={selected => {
          setShowBroadcastDate(false);
          setBroadcastScheduledAt(prev => {
            const next = new Date(prev);
            next.setFullYear(
              selected.getFullYear(),
              selected.getMonth(),
              selected.getDate(),
            );
            return next;
          });
        }}
      />
      <DatePickerModal
        visible={showBroadcastTime}
        value={broadcastScheduledAt}
        mode="time"
        onCancel={() => setShowBroadcastTime(false)}
        onConfirm={selected => {
          setShowBroadcastTime(false);
          setBroadcastScheduledAt(prev => {
            const next = new Date(prev);
            next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            return next;
          });
        }}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        value={datePickerValue}
        onCancel={() => setShowDatePicker(false)}
        onConfirm={onDatePicked}
      />

      {/* Reply Modal */}
      <Modal
        visible={replyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeReplyModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Reply to {selectedDonation?.donorName || 'Devotee'}
                </Text>
                <Text style={styles.modalSub}>
                  {screenTitle} • Prefer Date: {selectedDonation?.preferDate || 'N/A'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeReplyModal}
                style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.quickTemplateLabel}>Quick Templates:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickTemplatesScroll}>
              {QUICK_TEMPLATES.map((tmpl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.templateChip}
                  onPress={() => setReplyText(tmpl)}>
                  <Text style={styles.templateChipText}>{tmpl}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Your Message to Devotee:</Text>
            <TextInput
              style={styles.replyInput}
              multiline
              numberOfLines={4}
              placeholder="Type your personal message / seva confirmation..."
              placeholderTextColor={Colors.placeholder}
              value={replyText}
              onChangeText={setReplyText}
            />

            <View style={styles.notificationNotice}>
              <Text style={styles.notificationNoticeIcon}>ℹ️</Text>
              <Text style={styles.notificationNoticeText}>
                Devotee will immediately receive an in-app notification and an instant pop-up on their phone.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeReplyModal}
                disabled={submittingReply}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSendBtn,
                  submittingReply && styles.modalSendBtnDisabled,
                ]}
                onPress={submitReply}
                disabled={submittingReply}>
                {submittingReply ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSendText}>Send Reply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit devotee-submitted details */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.editModalCard]}>
            <View style={styles.modalHeader}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.modalTitle}>Edit Seva Details</Text>
                <Text style={styles.modalSub}>
                  {screenTitle} • ₹{selectedDonation?.amount ?? '—'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeEditModal}
                style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.editFormScroll}>
              <Text style={styles.inputLabel}>Devotee name</Text>
              <TextInput
                style={styles.editInput}
                value={editDonorName}
                onChangeText={setEditDonorName}
                placeholder="Full name"
                placeholderTextColor={Colors.placeholder}
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.editInput}
                value={editDonorPhone}
                onChangeText={text =>
                  setEditDonorPhone(text.replace(/\D/g, '').slice(0, 10))
                }
                keyboardType="phone-pad"
                placeholder="10-digit mobile"
                placeholderTextColor={Colors.placeholder}
              />

              <Text style={styles.inputLabel}>Prefer date</Text>
              <View style={styles.editDateRow}>
                <TouchableOpacity
                  style={[styles.editInput, styles.editDateBtn]}
                  onPress={openEditPreferDatePicker}
                  activeOpacity={0.8}>
                  <Text
                    style={
                      editPreferDate
                        ? styles.editDateValue
                        : styles.editDatePlaceholder
                    }>
                    {editPreferDate || 'Tap to select date'}
                  </Text>
                </TouchableOpacity>
                {editPreferDate ? (
                  <TouchableOpacity
                    style={styles.editClearDateBtn}
                    onPress={() => setEditPreferDate('')}>
                    <Text style={styles.editClearDateText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.inputLabel}>Occasion / Purpose</Text>
              <TextInput
                style={styles.editInput}
                value={editOccasion}
                onChangeText={setEditOccasion}
                placeholder="Occasion or purpose"
                placeholderTextColor={Colors.placeholder}
              />

              <Text style={styles.inputLabel}>For whom</Text>
              <TextInput
                style={styles.editInput}
                value={editForWhom}
                onChangeText={setEditForWhom}
                placeholder="Self / family / other"
                placeholderTextColor={Colors.placeholder}
              />

              <Text style={styles.inputLabel}>Person name</Text>
              <TextInput
                style={styles.editInput}
                value={editPersonName}
                onChangeText={setEditPersonName}
                placeholder="Person name (if any)"
                placeholderTextColor={Colors.placeholder}
              />

              {sevaType === 'NITHYA_HOMAM' ? (
                <>
                  <Text style={styles.inputLabel}>Gothram</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editGothram}
                    onChangeText={setEditGothram}
                    placeholder="Gothram"
                    placeholderTextColor={Colors.placeholder}
                  />

                  <Text style={styles.inputLabel}>Nakshatram / Star</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editNakshatram}
                    onChangeText={setEditNakshatram}
                    placeholder="Nakshatram"
                    placeholderTextColor={Colors.placeholder}
                  />
                </>
              ) : null}

              <Text style={styles.inputLabel}>Comments / names</Text>
              <TextInput
                style={[styles.editInput, styles.editInputMultiline]}
                value={editComments}
                onChangeText={setEditComments}
                multiline
                textAlignVertical="top"
                placeholder="Comments or family names"
                placeholderTextColor={Colors.placeholder}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeEditModal}
                disabled={savingEdit}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSendBtn,
                  savingEdit && styles.modalSendBtnDisabled,
                ]}
                onPress={submitEdit}
                disabled={savingEdit}>
                {savingEdit ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSendText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminScreenLayout>
  );
};

export default AdminSevaDetailListScreen;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  header: {
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#059669',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 2,
  },
  exportBtnBusy: {
    opacity: 0.7,
  },
  exportBtnIcon: {
    fontSize: 14,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EFEAE2',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  filterCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECE6DF',
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  clearDateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clearDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    borderColor: Colors.leafGreen,
    backgroundColor: '#EEF7E8',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  filterChipTextActive: {
    color: Colors.leafGreen,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 8,
  },
  datePickerBtnActive: {
    borderColor: Colors.templeGold,
    backgroundColor: '#FFFBEB',
  },
  datePickerIcon: {
    fontSize: 16,
  },
  datePickerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  datePickerTextActive: {
    color: '#92400E',
    fontWeight: '800',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: Colors.sacredBrown,
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  resetFilterBtn: {
    marginTop: 14,
    backgroundColor: Colors.templeGold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFilterText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
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
    marginBottom: 8,
  },
  nameCol: {
    flex: 1,
    marginRight: 8,
  },
  devoteeName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  donatedAtText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  amountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
    flex: 1,
  },
  preferDateBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  preferDateUpcoming: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  preferDatePast: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  preferDateText: {
    fontSize: 12,
    fontWeight: '800',
  },
  preferDateTextUpcoming: {
    color: '#B45309',
  },
  preferDateTextPast: {
    color: '#6B7280',
  },
  remarksBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    padding: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ECE6DF',
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  remarksText: {
    fontSize: 12,
    color: Colors.sacredBrown,
    lineHeight: 16,
  },
  existingReplyBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  replyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  replyTimeText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  replyContentText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 17,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  phoneCol: {
    flex: 1,
    minWidth: 100,
  },
  phoneLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  phoneNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginTop: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  callBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  whatsappBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  replyBtn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  editBtn: {
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
  },
  actionBtnIcon: {
    fontSize: 13,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  editModalCard: {
    maxHeight: '92%',
  },
  editFormScroll: {
    paddingBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: Colors.inputBorder || Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.sacredBrown,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  editInputMultiline: {
    minHeight: 88,
  },
  editDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  editDateBtn: {
    flex: 1,
    marginBottom: 0,
    justifyContent: 'center',
  },
  editDateValue: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 14,
  },
  editDatePlaceholder: {
    color: Colors.placeholder,
    fontSize: 14,
  },
  editClearDateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  editClearDateText: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 13,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  quickTemplateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  quickTemplatesScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  templateChip: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECE6DF',
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sacredBrown,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 6,
  },
  replyInput: {
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    fontSize: 14,
    color: Colors.sacredBrown,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  notificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  notificationNoticeIcon: {
    fontSize: 14,
  },
  notificationNoticeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalSendBtn: {
    flex: 2,
    backgroundColor: Colors.templeGold,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSendBtnDisabled: {
    opacity: 0.6,
  },
  modalSendText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
  selectBar: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectAllText: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 15,
  },
  countText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.sacredBrown,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxOn: {
    backgroundColor: Colors.sacredBrown,
  },
  checkboxDisabled: {
    opacity: 0.35,
  },
  checkMark: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 16,
  },
  cardCheckHit: {
    paddingRight: 10,
    paddingTop: 2,
    justifyContent: 'center',
  },
  broadcastCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    elevation: 2,
    shadowColor: Colors.sacredBrown,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  broadcastHeader: {
    marginBottom: 14,
  },
  broadcastTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  broadcastSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  broadcastInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  broadcastInputLabelSpaced: {
    marginTop: 12,
  },
  broadcastInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.sacredBrown,
    fontWeight: '600',
  },
  broadcastInputMultiline: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  templateScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  broadcastTemplateChip: {
    backgroundColor: '#F8F4EE',
    borderWidth: 1,
    borderColor: '#E7DEC8',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 280,
  },
  broadcastTemplateChipText: {
    fontSize: 12,
    color: Colors.sacredBrown,
    fontWeight: '600',
  },
  broadcastChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  broadcastChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  broadcastChipActive: {
    backgroundColor: Colors.sacredBrown,
    borderColor: Colors.sacredBrown,
  },
  broadcastChipText: {
    fontWeight: '700',
    color: Colors.sacredBrown,
    fontSize: 13,
  },
  broadcastChipTextActive: {
    color: Colors.white,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: Colors.background,
  },
  scheduleBtnIcon: {
    fontSize: 15,
  },
  scheduleText: {
    fontWeight: '700',
    color: Colors.sacredBrown,
    fontSize: 13,
  },
  broadcastCountHint: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  broadcastSendBtn: {
    marginTop: 10,
    borderRadius: 28,
    backgroundColor: Colors.sacredBrown,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastSendBtnDisabled: {
    opacity: 0.5,
  },
  broadcastSendText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
