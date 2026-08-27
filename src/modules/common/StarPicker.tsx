import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

const StarPicker = ({
  value,
  onChange,
  count = 5,
}: {
  value: number;
  onChange: (value: number) => void;
  count?: number;
}) => (
  <View style={styles.wrap}>
    <View style={styles.row}>
      {Array.from({length: count}, (_, index) => index + 1).map(star => (
        <TouchableOpacity key={star} onPress={() => onChange(star)}>
          <Text style={[styles.star, star <= value && styles.active]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
    {value ? <Text style={styles.label}>{LABELS[value]}</Text> : null}
  </View>
);

export default StarPicker;

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', marginVertical: 16},
  row: {flexDirection: 'row', gap: 10},
  star: {fontSize: 36, color: Colors.lightGold},
  active: {color: Colors.templeGold},
  label: {
    marginTop: 10,
    fontWeight: '800',
    color: Colors.sacredBrown,
    fontSize: 18,
  },
});
