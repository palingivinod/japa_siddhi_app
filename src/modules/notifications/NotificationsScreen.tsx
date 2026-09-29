import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

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

const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
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

  const openNotification = async (item: any) => {
    if (item?.id && !item.isRead) {
      apiService.put(`/notifications/${item.id}/read`).catch(() => undefined);
      setItems(current =>
        current.map(row =>
          row.id === item.id ? {...row, isRead: true} : row,
        ),
      );
    }

    const action = String(item.actionType || '');
    const text = `${item.title || ''} ${item.message || item.body || ''}`.toLowerCase();
    const challengeId =
      Number(item.extraData?.challengeId) ||
      (action === 'CHALLENGE_COMPLETED' || action === 'CHALLENGE_REWARD_READY'
        ? Number(item.actionId)
        : 0);

    if (action === 'JAPA_MILESTONE' || text.includes('milestone')) {
      navigation.navigate('MilestoneNotifications');
      return;
    }
    if (
      action === 'CHALLENGE_DEADLINE' ||
      action === 'CHALLENGE_COMPLETED' ||
      action === 'CHALLENGE_REWARD_READY' ||
      text.includes('challenge')
    ) {
      if (challengeId > 0) {
        navigation.navigate('ChallengeDetails', {id: challengeId});
        return;
      }
      navigation.navigate('Challenges');
      return;
    }
    if (action === 'GOAL_DEADLINE' || text.includes('goal')) {
      navigation.navigate('JapaHub');
      return;
    }
    if (
      action === 'DAILY_JAPA_REMINDER' ||
      text.includes('daily japa') ||
      text.includes('chanted today')
    ) {
      navigation.navigate('JapaHub');
      return;
    }
    if (text.includes('order') || text.includes('gift')) {
      navigation.navigate('Orders');
      return;
    }
    if (text.includes('homam')) {
      navigation.navigate('NithyaHomam');
      return;
    }
    if (text.includes('annadan') || text.includes('japa')) {
      navigation.navigate('MilestoneNotifications');
      return;
    }
    navigation.navigate('Home');
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
      {items.map(item => (
        <MenuCard
          key={item.id}
          emoji={notificationEmoji(item)}
          title={item.title}
          subtitle={item.message || item.body}
          onPress={() => openNotification(item)}
        />
      ))}
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
  clearBtnWrap: {
    marginTop: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.cream,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
});
