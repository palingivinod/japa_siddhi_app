import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Colors from '../../theme/colors';

export type Counts = {opens: number; members: number};
export type PeriodCounts = {today: Counts; week: Counts; all: Counts};

export const n = (value: number) => Number(value || 0).toLocaleString('en-IN');

/** Three boxes: Today / Last 7 days / All time, each "members" with taps below. */
export const PeriodBoxes = ({
  totals,
  opensLabel = 'taps',
}: {
  totals: PeriodCounts;
  opensLabel?: string;
}) => (
  <View style={styles.row}>
    {(
      [
        ['Today', totals.today],
        ['Last 7 days', totals.week],
        ['All time', totals.all],
      ] as const
    ).map(([label, counts]) => (
      <View key={label} style={styles.box}>
        <Text style={styles.boxLabel}>{label}</Text>
        <Text style={styles.boxValue}>{n(counts.members)}</Text>
        <Text style={styles.boxSub}>members</Text>
        <Text style={styles.boxOpens}>
          {n(counts.opens)} {opensLabel}
        </Text>
      </View>
    ))}
  </View>
);

export const EngagementNote = ({children}: {children: string}) => (
  <Text style={styles.note}>{children}</Text>
);

export const emptyPeriods = (): PeriodCounts => ({
  today: {opens: 0, members: 0},
  week: {opens: 0, members: 0},
  all: {opens: 0, members: 0},
});

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 8, marginTop: 10},
  box: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  boxLabel: {fontSize: 12, fontWeight: '700', color: Colors.textSecondary},
  boxValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  boxSub: {fontSize: 12, color: Colors.textSecondary, marginTop: -2},
  boxOpens: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  note: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
});
