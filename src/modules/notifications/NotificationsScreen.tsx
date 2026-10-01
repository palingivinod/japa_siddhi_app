import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

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
    text.includes('challenge')
  ) {
    return '🏆';
  }
  if (action === 'GOAL_DEADLINE' || text.includes('goal')) {
    return '🎯';
  }
  if (action === 'DAILY_JAPA_REMINDER' || text.includes('daily japa')) {
    return '🙏';
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

const formatNotificationDate = (dateStr?: string) => {
  if (!dateStr) {
    return '';
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return '';
    }
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const {t, tt, language} = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

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

  const markAsRead = (item: any) => {
    if (item?.id && !item.isRead) {
      apiService.put(`/notifications/${item.id}/read`).catch(() => undefined);
      setItems(current =>
        current.map(row =>
          row.id === item.id ? {...row, isRead: true} : row,
        ),
      );
    }
  };

  const clearNotifications = () => {
    if (items.length === 0) {
      return;
    }
    Alert.alert(
      t('clearNotificationsConfirmTitle'),
      t('clearNotificationsConfirmMsg'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('delete'),
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
    <ScreenLayout title={t('notifications')} showBack>
      <MenuCard
        emoji="🏅"
        title={t('japaMilestones')}
        subtitle={t('celebrateProgress')}
        onPress={() => navigation.navigate('MilestoneNotifications')}
      />
      {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <Text style={styles.empty}>{t('noNotificationsYet')}</Text>
      ) : null}
      {items.map(item => {
        const isUnread = !item.isRead;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            style={[styles.card, isUnread && styles.cardUnread]}
            onPress={() => markAsRead(item)}>
            <View style={[styles.dot, isUnread && styles.dotUnread]}>
              <Text style={styles.emoji}>{notificationEmoji(item)}</Text>
            </View>
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text
                  style={[styles.title, isUnread && styles.titleUnread]}
                  numberOfLines={2}>
                  {getLocalizedNotification(item, language).title || tt(item.title)}
                </Text>
                {isUnread ? <View style={styles.unreadDot} /> : null}
              </View>
              {item.message || item.body ? (
                <Text style={styles.subtitle}>
                  {getLocalizedNotification(item, language).message ||
                    tt(item.message || item.body)}
                </Text>
              ) : null}
              {item.createdAt ? (
                <Text style={styles.time}>
                  {formatNotificationDate(item.createdAt)}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
      {!loading && items.length > 0 ? (
        <View style={styles.clearBtnWrap}>
          <PrimaryButton
            title={t('clearNotifications')}
            onPress={clearNotifications}
          />
        </View>
      ) : null}
    </ScreenLayout>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
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
  titleUnread: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.selectedOrange,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
    includeFontPadding: true,
  },
  time: {
    fontSize: 11,
    color: Colors.placeholder,
    marginTop: 4,
    fontWeight: '500',
  },
  clearBtnWrap: {
    marginTop: 16,
    marginBottom: 12,
  },
});
