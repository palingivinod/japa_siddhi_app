import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
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

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    setRawError(null);
    apiService
      .get('/notifications')
      .then(response => setItems(response.data.data ?? []))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, t('couldNotLoadMilestones')));
      })
      .finally(() => setLoading(false));
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
    </ScreenLayout>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  empty: {color: Colors.textSecondary},
  card: {
    backgroundColor: Colors.cream,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
});
