import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const SWATCHES = [
  {name: 'Sacred Brown', value: Colors.sacredBrown},
  {name: 'Temple Gold', value: Colors.templeGold},
  {name: 'Light Gold', value: Colors.gold},
  {name: 'Leaf Green', value: Colors.leafGreen},
  {name: 'Warm Cream', value: Colors.cream, dark: true},
];

const DesignSystemScreen = () => {
  const navigation = useNavigation<any>();
  return (
  <ScreenLayout title="Japa Siddhi Design System" showBack tab="Home">
    <Text style={styles.heading}>Logo colour palette</Text>
    {SWATCHES.map(item => (
      <View
        key={item.name}
        style={[styles.swatch, {backgroundColor: item.value}]}>
        <Text style={[styles.swatchText, item.dark && styles.darkText]}>
          {item.name}
        </Text>
        <Text style={[styles.swatchText, item.dark && styles.darkText]}>
          {item.value}
        </Text>
      </View>
    ))}
    <Text style={styles.heading}>Guidelines</Text>
    <Text style={styles.rule}>Clean sans-serif headers in Sacred Brown</Text>
    <Text style={styles.rule}>Large rounded buttons and touch targets</Text>
    <Text style={styles.rule}>Clean cards and progress indicators</Text>
    <Text style={styles.rule}>Accessible spacing</Text>
    <Text style={styles.note}>Vector-only spiritual motifs • No raster images</Text>
    <PrimaryButton
      title="VIEW ALL SCREENS"
      onPress={() => navigation.navigate('ScreenIndex')}
    />
  </ScreenLayout>
  );
};

export default DesignSystemScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
    marginTop: 8,
  },
  swatch: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  swatchText: {color: Colors.white, fontWeight: '800'},
  darkText: {color: Colors.sacredBrown},
  rule: {color: Colors.sacredBrown, marginBottom: 8, fontWeight: '600'},
  note: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginVertical: 16,
  },
});
