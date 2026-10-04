import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import OutlineButton from '../common/OutlineButton';
import ScreenLayout from '../common/ScreenLayout';

type JapaSourceType = 'PERSONAL' | 'COMMUNITY' | 'CHALLENGE' | 'CATALOG';

export type ActiveJapaItem = {
  id: string;
  goalId?: number;
  challengeId?: number;
  mantraId?: number;
  personalMantraId?: number;
  mantraName: string;
  sourceType: JapaSourceType;
  sourceLabel: string;
  sourceIcon: string;
  targetCount: number;
  completedCount: number;
  remainingCount: number;
  dailyTarget: number;
  startDate?: string;
  endDate?: string;
  remainingDays: number;
  progressPercent: number;
  isChallenge?: boolean;
};

const formatDate = (raw?: string | null) => {
  if (!raw) return '';
  const match = String(raw).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(raw);
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const calcDaysRemaining = (endDateStr?: string | null) => {
  if (!endDateStr) return 1;
  const match = String(endDateStr).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  end.setHours(0, 0, 0, 0);
  return Math.max(
    1,
    Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
};

const YourJapasScreen = () => {
  const navigation = useNavigation<any>();
  const {t, language} = useLanguage();
  const [japas, setJapas] = useState<ActiveJapaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActiveJapas = useCallback(async () => {
    try {
      const [goalsRes, challengesRes] = await Promise.allSettled([
        apiService.get('/japa-goals'),
        apiService.get('/challenges'),
      ]);

      const items: ActiveJapaItem[] = [];

      // 1. Process Japa Goals (Own / Antharanga & Community Goals)
      if (goalsRes.status === 'fulfilled') {
        const rawGoals = goalsRes.value.data?.data ?? [];
        rawGoals.forEach((goal: any) => {
          const status = String(goal.status || 'ACTIVE').toUpperCase();
          if (status !== 'ACTIVE') return;

          const targetCount = Number(goal.targetCount) || 0;
          const completedCount = Number(goal.completedCount) || 0;
          const remainingDays = calcDaysRemaining(goal.endDate);
          const remainingCount = Math.max(0, targetCount - completedCount);
          const progressPercent =
            targetCount > 0
              ? Math.min(100, Math.round((completedCount / targetCount) * 100))
              : 0;

          // Compute dynamic daily target based on target & remaining days
          let dailyTarget = Number(goal.dailyTarget) || 0;
          if (dailyTarget <= 0 && targetCount > 0) {
            dailyTarget = Math.max(1, Math.ceil(targetCount / remainingDays));
          }

          const isPersonal =
            goal.mantraType === 'PERSONAL' ||
            Boolean(goal.personalMantraId) ||
            String(goal.goalName || '').toLowerCase().includes('private') ||
            String(goal.goalName || '').toLowerCase().includes('personal') ||
            String(goal.goalName || '').toLowerCase().includes('my japa');

          const isCommunity =
            String(goal.goalName || '').toLowerCase().includes('samuhika') ||
            String(goal.goalName || '').toLowerCase().includes('community');

          let sourceType: JapaSourceType = 'CATALOG';
          let sourceLabel = t('sourceCatalog') || 'Japa Mantra';
          let sourceIcon = '';

          if (isPersonal) {
            sourceType = 'PERSONAL';
            sourceLabel = t('sourceOwnMantra') || 'Antharanga Japa (Own Mantra)';
            sourceIcon = '🕉️';
          } else if (isCommunity) {
            sourceType = 'COMMUNITY';
            sourceLabel = t('sourceCommunity') || 'Samuhika Japa';
            sourceIcon = '👥';
          }

          items.push({
            id: `goal-${goal.id}`,
            goalId: Number(goal.id),
            mantraId: goal.mantraId ? Number(goal.mantraId) : undefined,
            personalMantraId: goal.personalMantraId
              ? Number(goal.personalMantraId)
              : undefined,
            mantraName:
              String(goal.mantraName || goal.goalName || 'My Japa').trim() ||
              'Personal Mantra',
            sourceType,
            sourceLabel,
            sourceIcon,
            targetCount,
            completedCount,
            remainingCount,
            dailyTarget,
            startDate: goal.startDate,
            endDate: goal.endDate,
            remainingDays,
            progressPercent,
            isChallenge: false,
          });
        });
      }

      // 2. Process Joined Challenges
      if (challengesRes.status === 'fulfilled') {
        const rawChallenges = challengesRes.value.data?.data ?? [];
        rawChallenges.forEach((ch: any) => {
          if (!ch.joined) return;

          const targetCount = Number(ch.targetCount) || 0;
          const completedCount = Number(ch.currentValue) || 0;
          const durationDays = Number(ch.durationDays) || 30;
          const remainingDays = durationDays;
          const remainingCount = Math.max(0, targetCount - completedCount);
          const progressPercent =
            targetCount > 0
              ? Math.min(100, Math.round((completedCount / targetCount) * 100))
              : 0;
          const dailyTarget = Math.max(1, Math.ceil(targetCount / durationDays));

          items.push({
            id: `challenge-${ch.id}`,
            challengeId: Number(ch.id),
            mantraName: String(ch.title || ch.mantra || 'Challenge Mantra').trim(),
            sourceType: 'CHALLENGE',
            sourceLabel: t('sourceChallenge') || 'Sankalpa / Challenge Japa',
            sourceIcon: '🏆',
            targetCount,
            completedCount,
            remainingCount,
            dailyTarget,
            remainingDays,
            progressPercent,
            isChallenge: true,
          });
        });
      }

      setJapas(items);
    } catch (error) {
      console.log('Error loading active japas', error);
    } finally {
      setLoading(false);
    }
  }, [t, language]);

  useFocusEffect(
    useCallback(() => {
      loadActiveJapas();
    }, [loadActiveJapas]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveJapas();
    setRefreshing(false);
  };

  const handleChantPress = (item: ActiveJapaItem) => {
    if (item.isChallenge && item.challengeId) {
      navigation.navigate('Chant', {
        mode: 'community',
        challengeId: item.challengeId,
        goal: item.targetCount,
        initialCount: item.completedCount,
        challengeMantra: item.mantraName,
        resume: true,
        fromHome: false,
      });
      return;
    }

    navigation.navigate('Chant', {
      mode: item.sourceType === 'PERSONAL' ? 'private' : 'community',
      mantraId: item.mantraId,
      personalMantraId: item.personalMantraId,
      privateMantra: item.sourceType === 'PERSONAL' ? item.mantraName : undefined,
      goal: item.targetCount,
      initialCount: item.completedCount,
      dailyTarget: item.dailyTarget,
      japaGoalId: item.goalId,
      resume: true,
      fromHome: false,
    });
  };

  return (
    <ScreenLayout title={t('yourJapas') || 'Your Japas'} showBack tab="JapaHub">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.templeGold]}
          />
        }>
        {/* Top Header Card with Quick Add */}
        <View style={styles.topBanner}>
          <View style={styles.topCopy}>
            <Text style={styles.topTitle}>
              {t('ongoingJapas') || 'Ongoing Japas'}
            </Text>
            <Text style={styles.topSubtitle}>
              {japas.length > 0
                ? `${japas.length} ${japas.length === 1 ? 'Japa' : 'Japas'} currently in progress. Select a mantra to continue chanting.`
                : 'Manage and chant your active personal and community mantras.'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PrivateJapa')}>
            <Text style={styles.addBtnText}>+ {t('addNewJapa') || 'Add Japa'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.templeGold} />
          </View>
        ) : japas.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🕉️</Text>
            <Text style={styles.emptyTitle}>
              {t('noActiveJapasTitle') || 'No Ongoing Japas Yet'}
            </Text>
            <Text style={styles.emptyDesc}>
              {t('noActiveJapasDesc') ||
                'You do not have any active japa in progress. Start an Antharanga Japa with your own mantra or join a Samuhika Japa to begin!'}
            </Text>

            <View style={styles.emptyActions}>
              <PrimaryButton
                title={t('startPrivateJapa') || '🕉️ START ANTHARANGA JAPA'}
                onPress={() => navigation.navigate('PrivateJapa')}
              />
              <View style={{height: 10}} />
              <OutlineButton
                title={t('communityJapa') || '👥 JOIN SAMUHIKA JAPA'}
                onPress={() => navigation.navigate('CommunityJapa')}
              />
              <View style={{height: 10}} />
              <OutlineButton
                title={t('joinChallenge') || '🏆 JOIN SPIRITUAL CHALLENGE'}
                onPress={() => navigation.navigate('Challenges')}
              />
            </View>
          </View>
        ) : (
          /* Active Japas List */
          japas.map(item => {
            const isPersonal = item.sourceType === 'PERSONAL';
            const isCommunity = item.sourceType === 'COMMUNITY';
            const isChallenge = item.sourceType === 'CHALLENGE';

            return (
              <View key={item.id} style={styles.japaCard}>
                {/* Header: Source Badge & Remaining Days Badge */}
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.sourceBadge,
                      isPersonal
                        ? styles.sourceBadgePersonal
                        : isCommunity
                          ? styles.sourceBadgeCommunity
                          : isChallenge
                            ? styles.sourceBadgeChallenge
                            : styles.sourceBadgeDefault,
                    ]}>
                    <Text
                      style={[
                        styles.sourceBadgeText,
                        isPersonal
                          ? styles.sourceBadgeTextPersonal
                          : isCommunity
                            ? styles.sourceBadgeTextCommunity
                            : isChallenge
                              ? styles.sourceBadgeTextChallenge
                              : styles.sourceBadgeTextDefault,
                      ]}>
                      {item.sourceIcon ? `${item.sourceIcon} ` : ''}{item.sourceLabel}
                    </Text>
                  </View>

                  <View style={styles.daysLeftBadge}>
                    <Text style={styles.daysLeftText}>
                      ⏳ {item.remainingDays} {item.remainingDays === 1 ? 'Day' : 'Days'} Left
                    </Text>
                  </View>
                </View>

                {/* Mantra Name */}
                <Text style={styles.mantraTitle} numberOfLines={2}>
                  {item.mantraName}
                </Text>

                {/* Dynamic Daily Goal Highlight */}
                <View style={styles.dailyGoalBox}>
                  <View style={styles.dailyGoalLeft}>
                    <Text style={styles.dailyGoalTitle}>🎯 DAILY GOAL</Text>
                    <Text style={styles.dailyGoalValue}>
                      {item.dailyTarget.toLocaleString('en-IN')}{' '}
                      <Text style={styles.dailyGoalUnit}>Japas / day</Text>
                    </Text>
                  </View>
                  {item.endDate ? (
                    <View style={styles.deadlineRight}>
                      <Text style={styles.deadlineTitle}>📅 DEADLINE</Text>
                      <Text style={styles.deadlineValue}>
                        {formatDate(item.endDate)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Total Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressText}>
                      Overall: {item.completedCount.toLocaleString('en-IN')} /{' '}
                      {item.targetCount.toLocaleString('en-IN')} Japas
                    </Text>
                    <Text style={styles.progressPercentText}>
                      {item.progressPercent}%
                    </Text>
                  </View>

                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {width: `${item.progressPercent}%`},
                      ]}
                    />
                  </View>
                </View>

                {/* Action: Chant Now */}
                <TouchableOpacity
                  style={styles.chantBtn}
                  activeOpacity={0.85}
                  onPress={() => handleChantPress(item)}>
                  <Text style={styles.chantBtnText}>CHANT NOW</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Bottom Helper Links */}
        {japas.length > 0 ? (
          <View style={styles.bottomSection}>
            <Text style={styles.bottomHint}>
              Want to chant a different mantra or start a new challenge?
            </Text>
            <View style={styles.bottomLinksRow}>
              <TouchableOpacity
                style={styles.bottomLinkChip}
                onPress={() => navigation.navigate('PrivateJapa')}>
                <Text style={styles.bottomLinkText}>🕉️ Own Mantra</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bottomLinkChip}
                onPress={() => navigation.navigate('CommunityJapa')}>
                <Text style={styles.bottomLinkText}>👥 Samuhika</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bottomLinkChip}
                onPress={() => navigation.navigate('Challenges')}>
                <Text style={styles.bottomLinkText}>🏆 Challenges</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ScreenLayout>
  );
};

export default YourJapasScreen;

const styles = StyleSheet.create({
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.templeGold,
    padding: 14,
    marginBottom: 16,
    marginTop: 4,
    gap: 12,
  },
  topCopy: {
    flex: 1,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  topSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  addBtn: {
    backgroundColor: Colors.templeGold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 24,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  emptyActions: {
    width: '100%',
  },
  japaCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  sourceBadgePersonal: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  sourceBadgeCommunity: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  sourceBadgeChallenge: {
    backgroundColor: '#F3E8FF',
    borderColor: '#9333EA',
  },
  sourceBadgeDefault: {
    backgroundColor: '#F3EEE2',
    borderColor: Colors.templeGold,
  },
  sourceBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  sourceBadgeTextPersonal: {
    color: '#B45309',
  },
  sourceBadgeTextCommunity: {
    color: '#0369A1',
  },
  sourceBadgeTextChallenge: {
    color: '#7E22CE',
  },
  sourceBadgeTextDefault: {
    color: Colors.sacredBrown,
  },
  daysLeftBadge: {
    backgroundColor: '#F9F6F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  daysLeftText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  mantraTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  dailyGoalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  dailyGoalLeft: {
    flex: 1,
  },
  dailyGoalTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.leafGreen,
    letterSpacing: 0.5,
  },
  dailyGoalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginTop: 2,
  },
  dailyGoalUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  deadlineRight: {
    alignItems: 'flex-end',
  },
  deadlineTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  deadlineValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  progressPercentText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.leafGreen,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0EAE1',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.templeGold,
    borderRadius: 4,
  },
  chantBtn: {
    backgroundColor: Colors.templeGold,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chantBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomSection: {
    marginTop: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  bottomHint: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  bottomLinksRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  bottomLinkChip: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bottomLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
});
