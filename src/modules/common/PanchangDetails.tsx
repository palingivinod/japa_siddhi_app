import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {PanchangPayload} from '../../services/panchang';
import Colors from '../../theme/colors';

type Props = {
  panchang: PanchangPayload;
  compact?: boolean;
};

const value = (text?: string) => text || '—';

const PanchangDetails = ({panchang, compact}: Props) => {
  const items = [
    [
      'NAKSHATRA',
      panchang.pada
        ? `${value(panchang.nakshatra)} · Pada ${panchang.pada}`
        : value(panchang.nakshatra),
    ],
    ['TITHI', value(panchang.tithi)],
    ['VARA', panchang.vara ? `${panchang.weekday} · ${panchang.vara}` : '—'],
    ['PAKSHA', value(panchang.paksha)],
    ['YOGA', value(panchang.yoga)],
    ['KARANA', value(panchang.karana)],
  ];

  if (!compact) {
    items.push(
      ['MOON RASHI', value(panchang.moonRashi)],
      ['SUN RASHI', value(panchang.sunRashi)],
    );
  }

  return (
    <View style={styles.row}>
      {items.map(([label, text]) => (
        <View key={label} style={styles.item}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{text}</Text>
        </View>
      ))}
    </View>
  );
};

export default PanchangDetails;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  item: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.iconBackground,
    borderRadius: 12,
    padding: 10,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  value: {
    marginTop: 4,
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 14,
  },
});
