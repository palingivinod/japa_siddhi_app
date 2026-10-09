import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {getLocalizedNotification} from '../../utils/localizedContent';

const notificationEmoji = (item: any) => {
  const action = String(item.actionType || '');
  const text = `${action} ${item.title || ''} ${item.message || item.body || ''}`.toLowerCase();
  if (action === 'JAPA_MILESTONE' || text.includes('milestone')) {
    return '🏅';
  }
  if (
    action === 'CHALLENGE_DEADLINE' ||
    action === 'CHALLENGE_COMPLETED' ||
    action === 'CHALLENGE_REWARD_READY' ||
    action === 'ADMIN_CHALLENGE_NEW' ||
    text.includes('challenge')
  ) {
    return '🏆';
  }
  if (action === 'ADMIN_MANTRA_NEW' || text.includes('new mantra')) {
    return '🕉️';
  }
  if (action === 'GOAL_DEADLINE' || text.includes('goal')) {
    return '🎯';
  }
  if (action === 'DAILY_JAPA_PENDING' || text.includes('pending')) {
    return '⏰';
  }
  if (action === 'DAILY_JAPA_REMINDER' || text.includes('daily japa') || text.includes('not chanted')) {
    return '🙏';
  }
  if (action === 'GOAL_COMPLETED' || action === 'DAILY_GOAL_COMPLETED') {
    return '✅';
  }
  if (text.includes('order') || text.includes('gift') || text.includes('reward')) {
    return '📦';
  }
  if (text.includes('homam')) {
    return '🔥';
  }
  if (text.includes('annadan') || text.includes('japa')) {
    return '🙏';
  }
  if (text.includes('family')) {
    return '👨‍👩‍👧';
  }
  return '🔔';
};

/** Parse API timestamps as UTC when timezone is missing (Render/MySQL NOW()). */
const parseNotificationDate = (dateStr?: string) => {
  const raw = String(dateStr || '').trim();
  if (!raw) {
    return null;
  }
  // "2026-10-07 07:09:00" / "2026-10-07T07:09:00" without Z → treat as UTC
  if (
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(raw) &&
    !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
  ) {
    const iso = raw.includes('T') ? `${raw}Z` : `${raw.replace(' ', 'T')}Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatInIst = (
  d: Date,
  options: Intl.DateTimeFormatOptions,
) =>
  d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    ...options,
  });

const formatNotificationDate = (dateStr?: string) => {
  if (!dateStr) {
    return '';
  }
  try {
    const d = parseNotificationDate(dateStr);
    if (!d) {
      return '';
    }

    const dayKey = (value: Date) =>
      formatInIst(value, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

    const todayKey = dayKey(new Date());
    const thatKey = dayKey(d);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = dayKey(yesterday);

    const timeStr = formatInIst(d, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (thatKey === todayKey) {
      return `Today, ${timeStr}`;
    }
    if (thatKey === yesterdayKey) {
      return `Yesterday, ${timeStr}`;
    }
    const datePart = formatInIst(d, {
      day: 'numeric',
      month: 'short',
    });
    return `${datePart}, ${timeStr}`;
  } catch {
    return '';
  }
};

const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t, tt, language} = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimerRef = useRef<any>(null);

  const incomingHighlightId = route.params?.highlightId
    ? String(route.params.highlightId)
    : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setRawError(null);
    try {
      const [response, storedCleared] = await Promise.all([
        apiService.get('/notifications'),
        AsyncStorage.getItem('cleared_notification_ids'),
      ]);
      const clearedSet = new Set<string>(
        storedCleared ? JSON.parse(storedCleared) : [],
      );
      const rawList = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      const visible = rawList.filter(
        (item: any) => !clearedSet.has(String(item.id)),
      );
      setItems(visible);
    } catch (err) {
      setRawError(err);
      setError(getApiError(err, t('couldNotLoadMilestones')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Handle incoming notification highlight from notification bar click
  useEffect(() => {
    if (!incomingHighlightId || items.length === 0) {
      return;
    }

    const matched = items.find(
      it =>
        String(it.id) === incomingHighlightId ||
        String(it.actionId) === incomingHighlightId,
    );

    if (matched) {
      setHighlightedId(String(matched.id));
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      // Highlight for 3 seconds, then return to normal
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedId(null);
      }, 3000);
    }

    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [incomingHighlightId, items]);

  const recordClearedId = async (id: string) => {
    try {
      const storedCleared = await AsyncStorage.getItem('cleared_notification_ids');
      const existing: string[] = storedCleared ? JSON.parse(storedCleared) : [];
      const combined = Array.from(new Set([...existing, id]));
      await AsyncStorage.setItem('cleared_notification_ids', JSON.stringify(combined));
    } catch {
      // ignore
    }
  };

  /**
   * When user taps a notification:
   * 1. Mark as read (dot clears) but keep it visible.
   * 2. Backend schedules auto-delete after about one day.
   * 3. Deep-link: goal/challenge → count page; idle/admin → stay in inbox route.
   */
  const handleNotificationPress = async (item: any) => {
    setItems(current =>
      current.map(row => (row.id === item.id ? {...row, isRead: true} : row)),
    );

    const action = String(item.actionType || '');
    const extra =
      item.extraData && typeof item.extraData === 'object'
        ? item.extraData
        : {};

    // Completions: mark read on server, stay on this screen.
    if (
      action === 'GOAL_COMPLETED' ||
      action === 'DAILY_GOAL_COMPLETED' ||
      action === 'CHALLENGE_COMPLETED'
    ) {
      try {
        await apiService.put(`/notifications/${item.id}/read`);
      } catch {
        // ignore
      }
      return;
    }

    const {openFromNotificationPayload} = await import(
      '../../navigation/notificationDeepLink'
    );
    await openFromNotificationPayload({
      ...extra,
      actionType: action,
      notificationId: item.id,
      actionId: item.actionId,
      type: action,
    });
  };

  /**
   * Delete a single notification directly
   */
  const deleteSingleNotification = async (item: any) => {
    const itemId = String(item.id);
    setItems(current => current.filter(row => row.id !== item.id));
    try {
      await apiService.delete(`/notifications/${item.id}`).catch(() => undefined);
    } catch {
      // ignore
    }
    await recordClearedId(itemId);
  };

  const clearNotifications = () => {
    if (items.length === 0) {
      return;
    }
    Alert.alert(
      (t as any)('clearNotificationsConfirmTitle') || 'Clear Notifications',
      (t as any)('clearNotificationsConfirmMsg') || 'Are you sure you want to clear all notifications?',
      [
        {
          text: t('cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('clearAll') || 'Clear all',
          style: 'destructive',
          onPress: async () => {
            const currentIds = items.map(item => String(item.id));
            setItems([]);
            try {
              await Promise.allSettled([
                apiService.delete('/notifications/clear'),
                apiService.delete('/notifications'),
                apiService.put('/notifications/clear'),
              ]);
            } catch {
              // ignore
            }
            try {
              const storedCleared = await AsyncStorage.getItem(
                'cleared_notification_ids',
              );
              const existing: string[] = storedCleared
                ? JSON.parse(storedCleared)
                : [];
              const combined = Array.from(
                new Set([...existing, ...currentIds]),
              );
              await AsyncStorage.setItem(
                'cleared_notification_ids',
                JSON.stringify(combined),
              );
            } catch {
              // ignore
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenLayout title={(t as any)('notifications') || 'Notifications'} showBack>
      <MenuCard
        emoji="🏅"
        title={t('japaMilestones') || 'Japa Milestones'}
        subtitle={t('celebrateProgress') || 'Celebrate your spiritual progress and seva milestones.'}
        onPress={() => navigation.navigate('MilestoneNotifications')}
      />

      {/* Top Action Row: Header + Medium Sized Clear Button */}
      {!loading && items.length > 0 ? (
        <View style={styles.topActionRow}>
          <Text style={styles.sectionHeading}>
            {t('recentNotifications') || 'Recent notifications'} ({items.length})
          </Text>
          <TouchableOpacity
            style={styles.clearBtnTop}
            activeOpacity={0.8}
            onPress={clearNotifications}>
            <Text style={styles.clearBtnTopText}>
              {t('clearAll') || 'Clear all'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <Text style={styles.empty}>{t('noNotificationsYet') || 'No notifications yet'}</Text>
      ) : null}
      {items.map(item => {
        const isUnread = !item.isRead;
        const isHighlighted = highlightedId === String(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            style={[
              styles.card,
              isUnread && styles.cardUnread,
              isHighlighted && styles.cardHighlighted,
            ]}
            onPress={() => handleNotificationPress(item)}>
            <View
              style={[
                styles.dot,
                isUnread && styles.dotUnread,
                isHighlighted && styles.dotHighlighted,
              ]}>
              <Text style={styles.emoji}>{notificationEmoji(item)}</Text>
            </View>
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.brandTitle,
                    isUnread && styles.titleUnread,
                    isHighlighted && styles.titleHighlighted,
                  ]}
                  numberOfLines={1}>
                  {getLocalizedNotification(item, language).brandTitle ||
                    tt(item.title) ||
                    'Japasiddhi - Bilva Patra Trust'}
                </Text>
                {isHighlighted ? (
                  <View style={styles.highlightBadge}>
                    <Text style={styles.highlightBadgeText}>✨ New</Text>
                  </View>
                ) : isUnread ? (
                  <View style={styles.unreadDot} />
                ) : null}
              </View>
              {(() => {
                const extra =
                  item.extraData && typeof item.extraData === 'object'
                    ? item.extraData
                    : {};
                const localized = getLocalizedNotification(item, language);
                const isAdmin =
                  String(item.actionType || '') === 'ADMIN_BROADCAST' ||
                  String(extra.category || '')
                    .toLowerCase()
                    .includes('announcement');
                const mantraName = localized.hasTranslationPack
                  ? localized.title
                  : String(extra.mantraName || '').trim();
                const shortLine = isAdmin
                  ? ''
                  : String(extra.shortLine || '').trim();
                const subject =
                  mantraName && shortLine
                    ? `${tt(mantraName)} — ${shortLine}`
                    : mantraName ||
                      (localized.hasTranslationPack ? localized.title : '') ||
                      String(localized.title || '').trim();
                const category = isAdmin
                  ? ''
                  : String(extra.category || '').trim();
                const detail = localized.hasTranslationPack
                  ? localized.message
                  : String(extra.detail || localized.message || '').trim();
                const bodyLine =
                  category && detail
                    ? `${category} — ${detail}`
                    : [category, detail].filter(Boolean).join(' · ');
                return (
                  <>
                    {subject ? (
                      <Text
                        style={[
                          styles.mantraHighlight,
                          isUnread && styles.mantraHighlightUnread,
                        ]}
                        numberOfLines={2}>
                        {subject}
                      </Text>
                    ) : null}
                    {bodyLine ? (
                      <Text style={styles.subtitle} numberOfLines={4}>
                        {bodyLine}
                      </Text>
                    ) : null}
                  </>
                );
              })()}
              <View style={styles.footerRow}>
                {item.createdAt || item.sentAt || item.created_at || item.sent_at ? (
                  <Text style={styles.time}>
                    {formatNotificationDate(
                      item.createdAt ||
                        item.sentAt ||
                        item.created_at ||
                        item.sent_at,
                    )}
                  </Text>
                ) : (
                  <View />
                )}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  onPress={() => deleteSingleNotification(item)}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScreenLayout>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  clearBtnTop: {
    backgroundColor: Colors.templeGold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    shadowColor: Colors.templeGold,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 2,
  },
  clearBtnTopText: {
    color: Colors.white,
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  empty: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginVertical: 24,
    fontWeight: '600',
    includeFontPadding: true,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardUnread: {
    backgroundColor: '#FFFCF5',
    borderColor: Colors.lightGold,
  },
  cardHighlighted: {
    backgroundColor: '#FFF9EB',
    borderColor: Colors.templeGold,
    borderWidth: 2,
    shadowColor: Colors.templeGold,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 5,
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.lightGold,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotUnread: {
    backgroundColor: '#FFF0D0',
  },
  dotHighlighted: {
    backgroundColor: '#FFE6A5',
  },
  emoji: {
    fontSize: 22,
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.sacredBrown,
    lineHeight: 22,
    includeFontPadding: true,
    flex: 1,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.templeGold,
    lineHeight: 18,
    includeFontPadding: true,
    flex: 1,
  },
  mantraHighlight: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    lineHeight: 22,
    includeFontPadding: true,
  },
  mantraHighlightUnread: {
    color: Colors.sacredBrown,
  },
  titleUnread: {
    fontWeight: '800',
  },
  titleHighlighted: {
    color: Colors.sacredBrown,
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.selectedOrange,
    marginLeft: 8,
  },
  highlightBadge: {
    backgroundColor: Colors.templeGold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  highlightBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
    includeFontPadding: true,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  time: {
    fontSize: 11.5,
    color: '#8E7355',
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F2EFE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
});
