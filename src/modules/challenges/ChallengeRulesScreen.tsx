import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

const RULES = [
  'One user can join a challenge once.',
  'Progress tracking updates from Japa counts.',
  'Completion percentage is based on target count.',
  'Leaderboard ranks participating users.',
  'One eligible user can claim one Mala.',
  'Out-of-stock rewards are disabled automatically.',
];

const ChallengeRulesScreen = () => (
  <ScreenLayout title="Challenge Rules" showBack tab="JapaHub">
    {RULES.map(rule => (
      <View key={rule} style={styles.row}>
        <View style={styles.bullet} />
        <Text style={styles.text}>{rule}</Text>
      </View>
    ))}
  </ScreenLayout>
);

export default ChallengeRulesScreen;

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
});
