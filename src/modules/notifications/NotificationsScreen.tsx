import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import MenuCard from '../common/MenuCard';
import ScreenLayout from '../common/ScreenLayout';

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

  return (
    <ScreenLayout title={t('notifications')} showBack>
      <MenuCard
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
          title={item.title}
          subtitle={item.message || item.body}
          onPress={() => {
            const text = `${item.title} ${item.message || item.body || ''}`.toLowerCase();
            if (item.actionType === 'JAPA_MILESTONE' || text.includes('japa') || text.includes('annadan')) {
              navigation.navigate('MilestoneNotifications');
              return;
            }
            if (text.includes('order') || text.includes('gift')) {
              navigation.navigate('Orders');
              return;
            }
            if (text.includes('challenge')) {
              navigation.navigate('Challenges');
              return;
            }
            if (text.includes('homam')) {
              navigation.navigate('NithyaHomam');
              return;
            }
            navigation.navigate('Home');
          }}
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
  name: {fontSize: 16, fontWeight: '700', color: Colors.textPrimary},
  meta: {marginTop: 6, color: Colors.textSecondary},
});
