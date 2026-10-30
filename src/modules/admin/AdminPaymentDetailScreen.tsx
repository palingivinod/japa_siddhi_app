import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import DatePickerModal from '../common/DatePickerModal';

type Period = 'today' | 'week' | 'month';

type PaymentItem = {
  id: string;
  name: string;
  phone: string;
  amount: number;
  amountLabel: string;
  purpose: string;
  category: string;
  categoryLabel: string;
  preferDate: string;
  donatedAt: string;
};

type CategoryOption = {id: string; label: string};

const PERIOD_TITLES: Record<Period, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
};

const DEFAULT_CATEGORIES: CategoryOption[] = [
  {id: 'ALL', label: 'All'},
  {id: 'MONTHLY_SUPPORT', label: 'Monthly Support'},
  {id: 'ANNADANAM', label: 'Annadanam'},
  {id: 'NITHYA_HOMAM', label: 'Nithya Homam'},
  {id: 'OTHER', label: 'Other'},
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

const formatDisplayDate = (raw?: string) => {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw).slice(0, 16);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(raw).slice(0, 16);
  }
};

const toYmd = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const AdminPaymentDetailScreen = () => {
  const route = useRoute<any>();
  const periodRaw = String(route.params?.period || 'today').toLowerCase();
  const period: Period =
    periodRaw === 'week' || periodRaw === 'month' ? periodRaw : 'today';
  const title = PERIOD_TITLES[period];
  const showDateFilters = period === 'week' || period === 'month';

  const [category, setCategory] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [categories, setCategories] =
    useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmountLabel, setTotalAmountLabel] = useState('₹0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [pickerValue, setPickerValue] = useState(new Date());

  const loadData = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (category && category !== 'ALL') {
        params.append('category', category);
      }
      if (fromDate) {
        params.append('fromDate', fromDate);
      }
      if (toDate) {
        params.append('toDate', toDate);
      }

      const res = await apiService.get(
        `/admin/payment-reports/details?${params.toString()}`,
      );
      const data = res.data?.data || {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalCount(Number(data.totalCount || 0));
      setTotalAmountLabel(String(data.totalAmountLabel || '₹0'));
      if (Array.isArray(data.categories) && data.categories.length) {
        setCategories(data.categories);
      }
    } catch (err) {
      setError(getApiError(err, 'Could not load payment details.'));
      setItems([]);
      setTotalCount(0);
      setTotalAmountLabel('₹0');
    } finally {
      setLoading(false);
    }
  }, [period, category, fromDate, toDate]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const openFromPicker = () => {
    if (fromDate) {
      const parsed = new Date(fromDate);
      setPickerValue(isNaN(parsed.getTime()) ? new Date() : parsed);
    } else {
      setPickerValue(new Date());
    }
    setShowFromPicker(true);
  };

  const openToPicker = () => {
    if (toDate) {
      const parsed = new Date(toDate);
      setPickerValue(isNaN(parsed.getTime()) ? new Date() : parsed);
    } else {
      setPickerValue(new Date());
    }
    setShowToPicker(true);
  };

  const summaryLine = useMemo(
    () => `${totalCount} payment${totalCount === 1 ? '' : 's'} · ${totalAmountLabel}`,
    [totalCount, totalAmountLabel],
  );

  return (
    <AdminScreenLayout title={title} tab="AdminDashboard" showBack>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.sub}>{summaryLine}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}>
        {categories.map(opt => {
          const active = category === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setCategory(opt.id)}
              activeOpacity={0.8}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showDateFilters ? (
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={openFromPicker}>
            <Text style={styles.dateLabel}>From</Text>
            <Text style={styles.dateValue}>{fromDate || 'Any'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={openToPicker}>
            <Text style={styles.dateLabel}>To</Text>
            <Text style={styles.dateValue}>{toDate || 'Any'}</Text>
          </TouchableOpacity>
          {fromDate || toDate ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setFromDate('');
                setToDate('');
              }}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.templeGold} />
        </View>
      ) : null}

      {error ? (
        <TouchableOpacity onPress={loadData}>
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && !items.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No payments</Text>
          <Text style={styles.empty}>
            Nothing in this category for {title.toLowerCase()}. Try All or
            another filter.
          </Text>
        </View>
      ) : null}

      {items.map(item => {
        const digits = String(item.phone || '').replace(/[^\d]/g, '');
        const canContact = digits.length >= 5;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.copy}>
                <Text style={styles.name}>{item.name || 'Devotee'}</Text>
                <Text style={styles.amount}>
                  {item.amountLabel || `₹${item.amount || 0}`}
                </Text>
              </View>
              <View style={styles.catPill}>
                <Text style={styles.catPillText}>
                  {item.categoryLabel || item.category}
                </Text>
              </View>
            </View>

            <Text style={styles.meta}>Purpose: {item.purpose || '—'}</Text>
            {item.donatedAt ? (
              <Text style={styles.meta}>
                Paid: {formatDisplayDate(item.donatedAt)}
              </Text>
            ) : null}

            <View style={styles.phoneRow}>
              <Text style={styles.phoneText}>Phone: {item.phone || '—'}</Text>
              {canContact ? (
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={[styles.contactBtn, styles.phoneBtn]}
                    onPress={() => handleCall(item.phone)}
                    activeOpacity={0.7}>
                    <Text style={styles.contactBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactBtn, styles.whatsappBtn]}
                    onPress={() => handleWhatsApp(item.phone)}
                    activeOpacity={0.7}>
                    <Text style={styles.contactBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}

      <DatePickerModal
        visible={showFromPicker}
        value={pickerValue}
        onCancel={() => setShowFromPicker(false)}
        onConfirm={(selected: Date) => {
          setShowFromPicker(false);
          setFromDate(toYmd(selected));
        }}
      />
      <DatePickerModal
        visible={showToPicker}
        value={pickerValue}
        onCancel={() => setShowToPicker(false)}
        onConfirm={(selected: Date) => {
          setShowToPicker(false);
          setToDate(toYmd(selected));
        }}
      />
    </AdminScreenLayout>
  );
};

export default AdminPaymentDetailScreen;

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
    fontWeight: '600',
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 10,
  },
  chipRow: {
    alignItems: 'center',
    paddingBottom: 2,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    marginRight: 8,
    alignSelf: 'center',
    flexShrink: 0,
  },
  chipActive: {
    borderColor: Colors.sacredBrown,
    backgroundColor: Colors.sacredBrown,
  },
  chipText: {
    fontWeight: '700',
    fontSize: 13,
    color: Colors.sacredBrown,
  },
  chipTextActive: {color: Colors.white},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  dateBtn: {
    flexGrow: 1,
    minWidth: 120,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  dateValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearText: {
    color: Colors.leafGreen,
    fontWeight: '800',
  },
  centerBox: {paddingVertical: 20, alignItems: 'center'},
  errorText: {color: Colors.error, marginBottom: 12, fontWeight: '600'},
  emptyCard: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  copy: {flex: 1, paddingRight: 8},
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  amount: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  catPill: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.templeGold,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.templeGold,
  },
  meta: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  phoneRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  phoneText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
    fontSize: 14,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  phoneBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  whatsappBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
});
