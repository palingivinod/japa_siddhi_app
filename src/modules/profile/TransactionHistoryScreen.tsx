import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
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
import ScreenLayout from '../common/ScreenLayout';
import {useLanguage} from '../../i18n/LanguageContext';
import {
  alertReceiptError,
  downloadPaymentReceipt,
} from '../payments/downloadPaymentReceipt';

export type UserTransactionItem = {
  id: string;
  userId?: number;
  donationType: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  paymentReference?: string;
  donationStatus?: string;
  donatedAt?: string;
  donorName?: string;
  donorPhone?: string;
  preferDate?: string;
  occasion?: string;
  forWhom?: string;
  personName?: string;
  remarks?: string;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
};

type FilterCategory = 'ALL' | 'ANNADANAM' | 'NITHYA_HOMAM' | 'OTHER';

const formatIstDate = (raw?: string) => {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
};

const resolvePurpose = (
  item: UserTransactionItem,
  t: (k: any) => string,
): {title: string; emoji: string} => {
  const type = String(item.donationType || '').toUpperCase();
  const remarks = String(item.remarks || '').toLowerCase();
  const occasion = String(item.occasion || '').trim();

  if (type === 'ANNADANAM' || remarks.includes('anna') || remarks.includes('santharpana')) {
    return {
      title: occasion ? `${t('annaSantharpana')} - ${occasion}` : t('annaSantharpana'),
      emoji: '🍲',
    };
  }
  if (type === 'NITHYA_HOMAM' || remarks.includes('homam')) {
    return {
      title: occasion ? `${t('nithyaHomam')} - ${occasion}` : t('nithyaHomam'),
      emoji: '🔥',
    };
  }
  if (remarks.includes('monthly') || remarks.includes('support')) {
    return {
      title: t('monthlyTempleSupport'),
      emoji: '🪔',
    };
  }
  if (remarks.includes('baanalingam') || remarks.includes('lingam')) {
    return {
      title: t('baanalingamSeva'),
      emoji: '🕉️',
    };
  }
  if (occasion) {
    return {
      title: occasion,
      emoji: '🙏',
    };
  }
  return {
    title: t('sacredService') || 'Seva Contribution',
    emoji: '🙏',
  };
};

const TransactionHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [items, setItems] = useState<UserTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<FilterCategory>('ALL');
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState('');

  const loadHistory = useCallback(async () => {
    setError('');
    try {
      const res = await apiService.get('/donations/history');
      const list = res.data?.data || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(getApiError(err, 'Could not load your transactions.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const copyTxnId = (txnId?: string) => {
    if (!txnId) return;
    Clipboard.setString(txnId);
    Alert.alert(t('savedTitle') || 'Copied', t('copyTxnId'));
  };

  const onDownloadReceipt = async (item: UserTransactionItem) => {
    const paymentId = String(item.transactionId || '').trim();
    if (!paymentId || downloadingId) {
      return;
    }
    setDownloadingId(paymentId);
    try {
      const purpose = resolvePurpose(item, t);
      await downloadPaymentReceipt({
        paymentId,
        orderId: item.paymentReference,
        amount: item.amount,
        seva: purpose.title,
        purpose: item.occasion || item.remarks || purpose.title,
        name: item.donorName,
        phone: item.donorPhone,
      });
    } catch (err) {
      alertReceiptError(err);
    } finally {
      setDownloadingId('');
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const type = String(item.donationType || '').toUpperCase();
      const remarks = String(item.remarks || '').toLowerCase();

      if (activeTab === 'ANNADANAM') {
        const isAnna =
          type === 'ANNADANAM' ||
          remarks.includes('anna') ||
          remarks.includes('santharpana');
        if (!isAnna) return false;
      } else if (activeTab === 'NITHYA_HOMAM') {
        const isHomam = type === 'NITHYA_HOMAM' || remarks.includes('homam');
        if (!isHomam) return false;
      } else if (activeTab === 'OTHER') {
        const isAnna =
          type === 'ANNADANAM' ||
          remarks.includes('anna') ||
          remarks.includes('santharpana');
        const isHomam = type === 'NITHYA_HOMAM' || remarks.includes('homam');
        if (isAnna || isHomam) return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const occasion = String(item.occasion || '').toLowerCase();
        const txn = String(item.transactionId || '').toLowerCase();
        const rem = remarks;
        const name = String(item.personName || '').toLowerCase();
        return (
          occasion.includes(q) ||
          txn.includes(q) ||
          rem.includes(q) ||
          name.includes(q)
        );
      }

      return true;
    });
  }, [items, activeTab, search]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [items]);

  return (
    <ScreenLayout title={t('transactionHistory')} showBack tab="Profile">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}>
        {/* Header Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>{t('totalContributions')}</Text>
              <Text style={styles.summaryAmount}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>🪔 {t('stageVerified') || 'Verified'}</Text>
            </View>
          </View>
          <Text style={styles.summarySub}>
            {items.length} contribution{items.length === 1 ? '' : 's'} made towards temple sevas & offerings
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ALL' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ALL')}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'ALL' && styles.tabBtnTextActive,
              ]}>
              {t('orderTabAll')} ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'ANNADANAM' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('ANNADANAM')}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'ANNADANAM' && styles.tabBtnTextActive,
              ]}>
              {t('annaSantharpana')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'NITHYA_HOMAM' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('NITHYA_HOMAM')}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'NITHYA_HOMAM' && styles.tabBtnTextActive,
              ]}>
              {t('nithyaHomam')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'OTHER' && styles.tabBtnActive]}
            onPress={() => setActiveTab('OTHER')}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'OTHER' && styles.tabBtnTextActive,
              ]}>
              {t('forWhomOther') || 'Other'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchTransactions')}
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

        {/* Loading */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={Colors.templeGold} size="large" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : null}

        {/* Error */}
        {error ? (
          <TouchableOpacity onPress={loadHistory} style={styles.errorBox}>
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </TouchableOpacity>
        ) : null}

        {/* Empty State */}
        {!loading && !error && filteredItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📜</Text>
            <Text style={styles.emptyTitle}>{t('noTransactionsFound')}</Text>
            <Text style={styles.emptySub}>
              {search
                ? t('noTransactionsFound')
                : t('noTransactionsDesc')}
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('SevaHub')}>
              <Text style={styles.exploreBtnText}>{t('exploreSevas')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Transaction Cards List */}
        {filteredItems.map(item => {
          const {title, emoji} = resolvePurpose(item, t);

          return (
            <View key={item.id} style={styles.card}>
              {/* Card Header: Purpose & Amount */}
              <View style={styles.cardHeader}>
                <View style={styles.purposeCol}>
                  <View style={styles.titleRow}>
                    <Text style={styles.purposeEmoji}>{emoji}</Text>
                    <Text style={styles.purposeTitle}>{title}</Text>
                  </View>
                  <Text style={styles.dateText}>
                    {formatIstDate(item.donatedAt)}
                  </Text>
                </View>

                <View style={styles.amountCol}>
                  <Text style={styles.amountText}>₹{item.amount}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>✓ Completed</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* Prefer Date (if applicable) */}
              {item.preferDate ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Prefer Date:</Text>
                  <View style={styles.preferDateBadge}>
                    <Text style={styles.preferDateText}>
                      📅 {item.preferDate}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Occasion */}
              {item.occasion ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Occasion / Purpose:</Text>
                  <Text style={styles.infoValue}>{item.occasion}</Text>
                </View>
              ) : null}

              {/* For Whom / Person Name */}
              {item.forWhom || item.personName ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>For:</Text>
                  <Text style={styles.infoValue}>
                    {[item.forWhom, item.personName]
                      .filter(Boolean)
                      .join(' - ')}
                  </Text>
                </View>
              ) : null}

              {/* Admin Reply Notification Box */}
              {item.adminReply ? (
                <View style={styles.adminReplyBox}>
                  <View style={styles.adminReplyHeader}>
                    <Text style={styles.adminReplyTitle}>
                      🪔 Message from Temple Administration
                    </Text>
                    {item.adminRepliedAt ? (
                      <Text style={styles.adminReplyTime}>
                        {item.adminRepliedAt}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.adminReplyBody}>{item.adminReply}</Text>
                </View>
              ) : null}

              {/* Transaction ID Footer */}
              <View style={styles.footerRow}>
                <View style={styles.txnCol}>
                  <Text style={styles.txnLabel}>Transaction ID:</Text>
                  <Text style={styles.txnValue} numberOfLines={1}>
                    {item.transactionId || item.paymentReference || '—'}
                  </Text>
                </View>
                {item.transactionId ? (
                  <View style={styles.actionBtns}>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => copyTxnId(item.transactionId)}
                      activeOpacity={0.7}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <Text style={styles.copyBtnText}>Copy ID</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.copyBtn,
                        styles.receiptBtn,
                        downloadingId === item.transactionId
                          ? styles.receiptBtnDisabled
                          : null,
                      ]}
                      onPress={() => onDownloadReceipt(item)}
                      disabled={!!downloadingId}
                      activeOpacity={0.7}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      {downloadingId === item.transactionId ? (
                        <ActivityIndicator
                          size="small"
                          color={Colors.sacredBrown}
                        />
                      ) : (
                        <Text style={styles.copyBtnText}>
                          {t('downloadReceipt')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ScreenLayout>
  );
};

export default TransactionHistoryScreen;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FAF5ED',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8DCB8',
    shadowColor: Colors.templeGold,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.sacredBrown,
    marginTop: 2,
  },
  summaryBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  summarySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EFEAE2',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tabBtnTextActive: {
    color: Colors.sacredBrown,
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
    fontSize: 38,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  exploreBtn: {
    marginTop: 16,
    backgroundColor: Colors.templeGold,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exploreBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 14,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  purposeCol: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  purposeEmoji: {
    fontSize: 18,
  },
  purposeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.sacredBrown,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3EFEA',
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
    flex: 1,
  },
  preferDateBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  preferDateText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  adminReplyBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  adminReplyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  adminReplyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  adminReplyTime: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  adminReplyBody: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  footerRow: {
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  txnCol: {
    marginBottom: 8,
  },
  txnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  txnValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginTop: 1,
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  copyBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptBtn: {
    borderColor: Colors.templeGold,
    backgroundColor: '#FFF8EE',
  },
  receiptBtnDisabled: {
    opacity: 0.6,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
});
