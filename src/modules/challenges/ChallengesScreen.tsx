import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {shortMonthDay} from '../../i18n/calendar';
import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import {getJapaDraft} from '../../services/japaDraft';
import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

type Translate = ReturnType<typeof useLanguage>['t'];

const scheduleLabel = (t: Translate, item: any) => {
  if (String(item.challengeType || '').toUpperCase() === 'STREAK') {
    return t('everyDay');
  }
  const start = shortMonthDay(t, item.startDate);
  const end = shortMonthDay(t, item.endDate);
  if (!start && !end) {
    return t('everyDay');
  }
  if (start && end && start === end) {
    return t('everyDay');
  }
  if (start && end) {
    return t('dateRange', {start, end});
  }
  return start || end;
};

/**
 * Admins type challenge blurbs in English. Known shapes such as "30 day
 * challenge" are rebuilt from the dictionary; anything else is passed through
 * the title lookup and left alone when there is no match.
 */
const describe = (t: Translate, tt: (value: string) => string, raw: string) => {
  const value = String(raw || '').trim();
  const dayCount = value.match(/^(\d+)\s*day\s*challenge$/i);
  if (dayCount) {
    return t('dayChallenge', {count: dayCount[1]});
  }
  return tt(value);
};

const mantraOf = (item: any) => {
  const direct = String(item.mantra || '').trim();
  if (direct) {
    return direct;
  }
  const fromReward = String(item.rewardName || '')
    .replace(/\s*Certificate$/i, '')
    .trim();
  if (fromReward && fromReward.toLowerCase() !== 'certificate') {
    return fromReward;
  }
  return '';
};

const ChallengesScreen = () => {
  const navigation = useNavigation<any>();
  const {t, tt} = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [resumeIds, setResumeIds] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      apiService
        .get('/challenges')
        .then(async response => {
          if (!active) {
            return;
          }
          const rows = response.data.data ?? [];
          setItems(rows);
          const drafts: Record<number, boolean> = {};
          await Promise.all(
            rows.map(async (item: any) => {
              const id = Number(item.id || 0);
              if (!id) {
                return;
              }
              const draft = await getJapaDraft('community', undefined, id);
              if (draft) {
                drafts[id] = true;
              }
            }),
          );
          if (active) {
            setResumeIds(drafts);
          }
        })
        .catch(() => {
          if (active) {
            setItems([]);
            setResumeIds({});
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScreenLayout title="Challenge Japa" showBack tab="JapaHub">
      <Text style={styles.heading}>{t('takeJapaChallenge')}</Text>
      <Text style={styles.sub}>{t('challengeIntro')}</Text>

      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}

      {!loading &&
        items.map((item, index) => {
          const target = Number(item.targetValue || item.target || 0);
          const mantra = mantraOf(item);
          const description = item.description
            ? describe(t, tt, item.description)
            : target
              ? t('completeChants', {count: target.toLocaleString()})
              : t('joinCommunityChallenge');
          const canResume = Boolean(resumeIds[Number(item.id)]);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    index === 0 ? styles.dotAccent : styles.dotGreen,
                  ]}>
                  <View style={styles.dotInner} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>{tt(item.title)}</Text>
                  <Text style={styles.description}>{description}</Text>
                  {mantra ? (
                    <Text style={styles.meta}>
                      {t('mantraWithName', {name: tt(mantra)})}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>
                    {t('targetWithCount', {
                      count: target ? target.toLocaleString() : '—',
                    })}
                  </Text>
                  <Text style={styles.meta}>{scheduleLabel(t, item)}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                {canResume ? (
                  <TouchableOpacity
                    style={styles.resumeBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('ChallengeProgress', {id: item.id})
                    }>
                    <Text style={styles.resumeText}>{t('resumeLabel')}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.viewBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('ChallengeDetails', {id: item.id})
                  }>
                  <Text style={styles.viewText}>{t('view')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

      {!loading && items.length === 0 ? (
        <Text style={styles.empty}>{t('noChallengesYet')}</Text>
      ) : null}
    </ScreenLayout>
  );
};

export default ChallengesScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  sub: {
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dotAccent: {backgroundColor: Colors.templeGold},
  dotGreen: {backgroundColor: Colors.leafGreen},
  dotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.white,
  },
  copy: {flex: 1, paddingRight: 8},
  title: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 17,
  },
  description: {
    marginTop: 4,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  meta: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  viewBtn: {
    borderWidth: 1.5,
    borderColor: Colors.leafGreen,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  viewText: {
    color: Colors.leafGreen,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  resumeBtn: {
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  resumeText: {
    color: Colors.templeGold,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  empty: {
    marginTop: 28,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
