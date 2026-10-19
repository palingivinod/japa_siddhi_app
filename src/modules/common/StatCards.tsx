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
            <Text style={styles.label} numberOfLines={3}>
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
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 14,
    minHeight: 92,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  /** Fixed label zone so values share one baseline on every phone. */
  labelBox: {
    minHeight: 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.2,
    textAlign: 'center',
    includeFontPadding: false,
    paddingBottom: 2,
  },
  value: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingBottom: 2,
  },
});
