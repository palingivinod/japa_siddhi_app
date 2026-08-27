import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import ScreenLayout from '../common/ScreenLayout';

const DonateScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout title="Annadanam" showBack tab="SevaHub">
      <Text style={styles.heading}>Offer Annadanam</Text>
      <MenuCard
        title="Japa Annadanam"
        subtitle="After a Japa milestone, sponsor food seva."
        tone="gold"
        onPress={() => navigation.navigate('JapaAnnadanam')}
      />
      <MenuCard
        title="General Annadanam"
        subtitle="Offer food service for an occasion."
        tone="green"
        onPress={() => navigation.navigate('GeneralAnnadanam')}
      />
      <MenuCard
        title="Milestone reminders"
        subtitle="See Japa milestone notifications."
        onPress={() => navigation.navigate('MilestoneNotifications')}
      />
    </ScreenLayout>
  );
};

export default DonateScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 16,
  },
});
