import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

const Row = ({label, value}: {label: string; value?: string}) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || 'Not added'}</Text>
  </View>
);

const SpiritualDetailsScreen = () => {
  const route = useRoute<any>();
  const profile = route.params?.profile ?? {};

  return (
    <ScreenLayout title="Spiritual Details" showBack tab="Profile">
      <Row label="Gothram" value={profile.gothram} />
      <Row label="Nakshatram" value={profile.nakshatram} />
      <Row label="Marital status" value={profile.maritalStatus} />
    </ScreenLayout>
  );
};

export default SpiritualDetailsScreen;

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 4,
  },
  value: {
    color: Colors.sacredBrown,
    fontSize: 16,
    fontWeight: '700',
  },
});
