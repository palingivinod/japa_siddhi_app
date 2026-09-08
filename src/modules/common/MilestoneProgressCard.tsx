import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

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
  if (!milestone) {
    return null;
  }

  const total = Number(milestone.total || 0);
  const next = Number(milestone.next || 0);
  const percent = Math.min(100, Number(milestone.progressPercent || 0));
  const barLabel = milestone.allComplete
    ? milestone.latestTitle || 'Parma Siddhi Yogam'
    : milestone.nextTitle || 'Next milestone';
  const subtitle = milestone.allComplete
    ? `All milestones reached · ${total.toLocaleString()} Japas`
    : `${total.toLocaleString()} / ${next.toLocaleString()} Japas`;

  const content = (
    <View style={styles.card}>
      <Text style={styles.kicker}>Spiritual milestone</Text>
      <Text style={styles.meta}>{subtitle}</Text>
      {!milestone.allComplete ? (
        <Text style={styles.remaining}>
          {Number(milestone.remaining || 0).toLocaleString()} Japas to go
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
    letterSpacing: 0.5,
  },
  meta: {
    marginTop: 6,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  remaining: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
    textAlign: 'right',
  },
});
