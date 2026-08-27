import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Colors from '../../theme/colors';

const StatCards = ({
  items,
}: {
  items: {label: string; value: string | number}[];
}) => (
  <View style={styles.row}>
    {items.map(item => (
      <View key={item.label} style={styles.card}>
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.value}>{item.value}</Text>
      </View>
    ))}
  </View>
);

export default StatCards;

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 8, marginBottom: 18},
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  value: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
});
