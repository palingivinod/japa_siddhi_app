import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const TERMS = [
  'Reward choice is made after challenge completion.',
  'Only eligible, in-stock rewards can be selected.',
  'You may change to another eligible reward before placing the order.',
  'After the order is placed, the reward cannot be changed.',
  'Stock changes are reflected automatically.',
];

const RewardTermsScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout title="Reward Terms" showBack tab="JapaHub">
      {TERMS.map(term => (
        <View key={term} style={styles.row}>
          <View style={styles.bullet} />
          <Text style={styles.text}>{term}</Text>
        </View>
      ))}
      <View style={styles.gap} />
      <PrimaryButton title="I UNDERSTAND" onPress={() => navigation.goBack()} />
    </ScreenLayout>
  );
};

export default RewardTermsScreen;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.sacredBrown,
    marginTop: 7,
    marginRight: 12,
  },
  text: {
    flex: 1,
    color: Colors.sacredBrown,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  gap: {height: 12},
});
