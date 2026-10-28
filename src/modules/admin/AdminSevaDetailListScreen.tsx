import React, {useCallback, useMemo, useState} from 'react';
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

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());

  // Reply modal state
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<SevaDonationItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    if (preferDateFilter) {
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
    setPreferDateFilter(`${yyyy}-${mm}-${dd}`);
  };

  const clearDateFilter = () => {
    setPreferDateFilter('');
  };

  const openReplyModal = (item: SevaDonationItem) => {
    setSelectedDonation(item);
    setReplyText(item.adminReply || '');
    setReplyModalVisible(true);
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

          <TouchableOpacity
            style={[
              styles.datePickerBtn,
              preferDateFilter ? styles.datePickerBtnActive : null,
            ]}
            onPress={openDatePicker}
            activeOpacity={0.8}>
            <Text style={styles.datePickerIcon}>📅</Text>
            <Text
              style={[
                styles.datePickerText,
                preferDateFilter ? styles.datePickerTextActive : null,
              ]}>
              {preferDateFilter
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
              {preferDateFilter
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

        {/* Devotee Offerings List */}
        {items.map(item => {
          const isUpcoming =
            item.preferDate &&
            new Date(item.preferDate) > new Date(new Date().toDateString());

          return (
            <View key={item.id} style={styles.card}>
              {/* Card Top: Name & Amount */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.nameCol}>
                  <Text style={styles.devoteeName}>
                    {item.donorName || 'Devotee'}
                  </Text>
                  <Text style={styles.donatedAtText}>
                    Donated: {item.donatedAt || '—'}
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

              {/* Comments / Remarks */}
              {item.remarks ? (
                <View style={styles.remarksBox}>
                  <Text style={styles.remarksLabel}>Devotee Details / Comments:</Text>
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
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

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
  actionBtnIcon: {
    fontSize: 13,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.sacredBrown,
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
});
