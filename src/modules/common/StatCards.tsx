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
          <View style={styles.labelBox}>
            <Text style={styles.label} numberOfLines={2}>
              {tt(item.label)}
            </Text>
          </View>
          <Text style={styles.value} numberOfLines={1}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

export default StatCards;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 18,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 88,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'flex-start',
  },
  /** Fixed 2-line label zone so values share one baseline on every phone. */
  labelBox: {
    height: 36,
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  value: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
