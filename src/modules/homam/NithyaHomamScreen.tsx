import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const BENEFITS = [
  'Daily sankalpam',
  'Spiritual participation',
  'Personalized reminders',
];

const NithyaHomamScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout title="Nithya Homam" showBack tab="SevaHub">
      <MenuCard
        title="Daily Sacred Homam"
        subtitle="Enroll for Nithya Homam participation."
      />
      <Text style={styles.section}>Benefits</Text>
      {BENEFITS.map(item => (
        <View key={item} style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.item}>{item}</Text>
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.templeGold,
    marginRight: 10,
  },
  item: {color: Colors.sacredBrown, fontWeight: '600'},
  gap: {height: 20},
});
