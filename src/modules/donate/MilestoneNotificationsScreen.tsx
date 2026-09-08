import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
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
import ScreenLayout from '../common/ScreenLayout';

type MilestoneItem = {
  target: number;
  title?: string;
  subtitle?: string;
};

const formatWhen = (value: string | null, justNow: string) => {
  if (!value) {
    return justNow;
  }
  const then = new Date(value).getTime();
  if (!then || Date.now() - then < 10 * 60 * 1000) {
    return justNow;
  }
  return new Date(value).toLocaleString();
};

const MilestoneNotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [enabled, setEnabled] = useState(true);
  const [total, setTotal] = useState(0);
  const [latest, setLatest] = useState(0);
  const [next, setNext] = useState(500);
  const [upcoming, setUpcoming] = useState<MilestoneItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const [nextTitle, setNextTitle] = useState('');
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    setRawError(null);
    apiService
      .get('/japa/milestones')
      .then(response => {
        const data = response.data.data || {};
        const count = Number(data.total || 0);
        const latestReached = Number(data.latest || 0);
        const nextTarget = Number(data.next || data.progressTarget || 500);
        setTotal(count);
        setLatest(latestReached);
        setNext(nextTarget);
        setNextTitle(String(data.nextTitle || ''));
        setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
        setUnreadCount(Number(data.unreadCount || 0));
        setLatestAt(data.latestAt || null);
        setEligible(Boolean(data.eligibleForAnnadanam));
        setEnabled(data.notificationsOn !== false);
        if (Number(data.unreadCount || 0) > 0) {
          apiService.put('/notifications/milestones/read').catch(() => undefined);
        }
      })
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

  const toggleNotifications = async (value: boolean) => {
    setEnabled(value);
    await AsyncStorage.setItem('notify_on', value ? '1' : '0');
    try {
      await apiService.put('/profile/settings', {notificationsOn: value});
    } catch {
      undefined;
    }
  };

  const milestoneTitle = (item: MilestoneItem) =>
    item.title || t('japasCountLabel', {count: item.target.toLocaleString()});
  const milestoneSub = (item: MilestoneItem) =>
    item.subtitle || t('newSpiritualAwaits');
  const achieved = latest > 0;
  const headlineCount = achieved ? latest : total;

  return (
    <ScreenLayout title={t('notifications')} showBack tab="SevaHub">
      {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {!loading && !error ? (
        <>
          <View style={styles.head}>
            <View style={styles.copy}>
              <Text style={styles.title}>{t('japaMilestones')}</Text>
              <Text style={styles.sub}>{t('celebrateProgress')}</Text>
            </View>
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t('nNew', {count: unreadCount})}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.meta}>
              {t('japaMilestoneMeta')}
              {achieved
                ? `  ·  ${formatWhen(latestAt, t('justNow'))}`
                : `  ·  ${t('yourProgress')}`}
            </Text>
            <Text style={styles.headline}>
              {achieved
                ? t('japasCompleted', {
                    count: headlineCount.toLocaleString(),
                  })
                : t('noMilestoneYet')}
            </Text>
            <Text style={styles.body}>
              {achieved
                ? t('youHaveCompletedJapas', {
                    count: total.toLocaleString(),
                  })
                : t('nextMilestoneHint', {
                    count: total.toLocaleString(),
                    next: nextTitle
                      ? `${nextTitle} (${next.toLocaleString()})`
                      : next.toLocaleString(),
                  })}
            </Text>
            <View style={styles.actions}>
              <View style={styles.ghost}>
                <Text style={styles.ghostText}>
                  {achieved
                    ? `${latest.toLocaleString()} / ${latest.toLocaleString()}`
                    : `${total.toLocaleString()} / ${next.toLocaleString()}`}
                </Text>
              </View>
              {eligible ? (
                <TouchableOpacity
                  style={styles.cta}
                  onPress={() => navigation.navigate('JapaAnnadanam')}>
                  <Text style={styles.ctaText}>{t('performAnnadhanam')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.foot}>{t('milestoneNotification')}</Text>
          </View>
          <Text style={styles.title}>{t('upcomingMilestones')}</Text>
          {upcoming.length === 0 ? (
            <Text style={styles.empty}>{t('allMilestonesComplete')}</Text>
          ) : (
            upcoming.map(item => (
              <View key={item.target} style={styles.row}>
                <View style={styles.circle}>
                  <Text style={styles.circleText}>
                    {item.target >= 1000
                      ? `${item.target / 1000}K`
                      : item.target}
                  </Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.rowTitle}>
                    {milestoneTitle(item)}
                  </Text>
                  <Text style={styles.sub}>{milestoneSub(item)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            ))
          )}
          <View style={styles.toggle}>
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>
                {t('milestoneNotificationsTitle')}
              </Text>
              <Text style={styles.sub}>{t('getNotifiedMilestones')}</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggleNotifications}
              trackColor={{true: Colors.leafGreen}}
            />
          </View>
        </>
      ) : null}
    </ScreenLayout>
  );
};

export default MilestoneNotificationsScreen;

const styles = StyleSheet.create({
  head: {flexDirection: 'row', marginBottom: 14},
  copy: {flex: 1},
  title: {fontSize: 20, fontWeight: '800', color: Colors.sacredBrown},
  sub: {marginTop: 4, color: Colors.textSecondary},
  empty: {marginTop: 8, marginBottom: 12, color: Colors.textSecondary},
  badge: {
    backgroundColor: Colors.templeGold,
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 28,
    justifyContent: 'center',
  },
  badgeText: {color: Colors.white, fontWeight: '800', fontSize: 12},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 18,
  },
  meta: {color: Colors.leafGreen, fontWeight: '800', fontSize: 12},
  headline: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  body: {marginTop: 8, color: Colors.sacredBrown, lineHeight: 20},
  actions: {flexDirection: 'row', gap: 8, marginTop: 14},
  ghost: {
    flex: 1,
    backgroundColor: Colors.cream,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  ghostText: {color: Colors.leafGreen, fontWeight: '800'},
  cta: {
    flex: 1.4,
    backgroundColor: Colors.templeGold,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  ctaText: {color: Colors.white, fontWeight: '800', fontSize: 11},
  foot: {marginTop: 10, color: Colors.textLight},
  row: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleText: {fontWeight: '800', color: Colors.templeGold},
  rowTitle: {fontWeight: '800', color: Colors.sacredBrown},
  chevron: {fontSize: 22, color: Colors.textLight},
  toggle: {
    marginTop: 8,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
