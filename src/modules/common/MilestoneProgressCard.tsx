import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';

export type MilestoneProgressData = {
  total?: number;
  next?: number;
  nextTitle?: string | null;
  latestTitle?: string | null;
  progressPercent?: number;
  remaining?: number;
  allComplete?: boolean;
};

type Props = {
  milestone?: MilestoneProgressData | null;
  onPress?: () => void;
};

const MilestoneProgressCard = ({milestone, onPress}: Props) => {
  const {t, tt} = useLanguage();
  if (!milestone) {
    return null;
  }

  const total = Number(milestone.total || 0);
  const next = Number(milestone.next || 0);
  const percent = Math.min(100, Number(milestone.progressPercent || 0));
  const barLabel = milestone.allComplete
    ? tt(milestone.latestTitle || 'Parma Siddhi Yogam')
    : tt(milestone.nextTitle || 'Next milestone');
  const subtitle = milestone.allComplete
    ? t('allMilestonesReached', {count: total.toLocaleString()})
    : t('japasProgressCount', {
        current: total.toLocaleString(),
        next: next.toLocaleString(),
      });

  const content = (
    <View style={styles.card}>
      <Text style={styles.kicker}>{t('spiritualMilestone')}</Text>
      <Text style={styles.meta}>{subtitle}</Text>
      {!milestone.allComplete ? (
        <Text style={styles.remaining}>
          {t('japasToGo', {
            count: Number(milestone.remaining || 0).toLocaleString(),
          })}
        </Text>
      ) : null}
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, {width: `${percent}%`}]} />
        </View>
        <Text style={styles.barLabel} numberOfLines={2}>
          {barLabel}
        </Text>
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
};

export default MilestoneProgressCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  kicker: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 18,
    letterSpacing: 0,
    includeFontPadding: true,
  },
  meta: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '700',
    lineHeight: 22,
    includeFontPadding: true,
  },
  remaining: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    includeFontPadding: true,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: Colors.templeGold,
  },
  barLabel: {
    maxWidth: 118,
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'right',
    includeFontPadding: true,
  },
});
