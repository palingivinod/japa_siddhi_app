import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const BENEFITS = [
  {emoji: '📜', text: 'Daily sankalpam'},
  {emoji: '🙏', text: 'Spiritual participation'},
  {emoji: '🔔', text: 'Personalized reminders'},
];

const NithyaHomamScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout title="Nithya Homam" showBack tab="SevaHub">
      <MenuCard
        emoji="🔥"
        title="Daily Sacred Homam"
        subtitle="Enroll for Nithya Homam participation."
      />
      <Text style={styles.section}>Benefits</Text>
      {BENEFITS.map(item => (
        <View key={item.text} style={styles.row}>
          <Text style={styles.benefitEmoji}>{item.emoji}</Text>
          <Text style={styles.item}>{item.text}</Text>
        </View>
      ))}
      <View style={styles.gap} />
      <PrimaryButton
        title="ENROLL NOW"
        onPress={() => navigation.navigate('HomamEnroll')}
      />
    </ScreenLayout>
  );
};

export default NithyaHomamScreen;

const styles = StyleSheet.create({
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 8,
  },
  row: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  benefitEmoji: {
    width: 28,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    marginRight: 8,
  },
  item: {color: Colors.sacredBrown, fontWeight: '600'},
  gap: {height: 20},
});
