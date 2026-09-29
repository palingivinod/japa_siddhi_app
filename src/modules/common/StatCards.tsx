import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';

const StatCards = ({
  items,
}: {
  items: {label: string; value: string | number}[];
}) => {
  const {tt} = useLanguage();
  return (
  <View style={styles.row}>
    {items.map(item => (
      <View key={item.label} style={styles.card}>
        <Text style={styles.label}>{tt(item.label)}</Text>
        <Text style={styles.value}>{item.value}</Text>
      </View>
    ))}
  </View>
  );
};

export default StatCards;

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 8, marginBottom: 18},
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    minHeight: 76,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  value: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
});
