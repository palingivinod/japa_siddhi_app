import React from 'react';
import {StyleSheet, View} from 'react-native';

import Colors from '../../theme/colors';

const TrendChart = ({values}: {values: number[]}) => {
  const points = values.length ? values : [0, 2, 4, 3, 6, 8, 7];
  const max = Math.max(...points, 1);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {points.map((value, index) => (
          <View key={`${index}-${value}`} style={styles.col}>
            <View
              style={[
                styles.bar,
                {height: Math.max(8, Math.round((value / max) * 88))},
              ]}
            />
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
    height: 140,
    justifyContent: 'flex-end',
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 100,
  },
  col: {flex: 1, justifyContent: 'flex-end'},
  bar: {
    backgroundColor: Colors.templeGold,
    borderRadius: 6,
  },
});
