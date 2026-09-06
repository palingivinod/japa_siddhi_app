import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Colors from '../../theme/colors';

export type TrendPoint = number | {label?: string; value: number};

const toPoints = (values: TrendPoint[]) =>
  (values || []).map(item =>
    typeof item === 'number'
      ? {label: '', value: item}
      : {label: item.label || '', value: Number(item.value || 0)},
  );

const TrendChart = ({values}: {values: TrendPoint[]}) => {
  const points = toPoints(values);
  const max = Math.max(...points.map(item => item.value), 0);
  if (!points.length || max <= 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>No saved Japa yet for this period.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {points.map((item, index) => (
          <View key={`${index}-${item.label}-${item.value}`} style={styles.col}>
            {item.value > 0 ? (
              <Text style={styles.count}>{item.value}</Text>
            ) : (
              <View style={styles.countSpacer} />
            )}
            <View
              style={[
                styles.bar,
                {height: Math.max(8, Math.round((item.value / max) * 72))},
              ]}
            />
            {item.label ? <Text style={styles.label}>{item.label}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
};

export default TrendChart;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    minHeight: 140,
    justifyContent: 'flex-end',
    marginBottom: 18,
  },
  empty: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minHeight: 100,
  },
  col: {flex: 1, alignItems: 'center', justifyContent: 'flex-end'},
  count: {
    color: Colors.sacredBrown,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  countSpacer: {
    height: 14,
    marginBottom: 4,
  },
  bar: {
    width: '80%',
    backgroundColor: Colors.templeGold,
    borderRadius: 6,
  },
  label: {
    marginTop: 6,
    color: Colors.leafGreen,
    fontSize: 10,
    fontWeight: '700',
  },
});
