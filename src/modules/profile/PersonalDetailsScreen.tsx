import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const Row = ({label, value}: {label: string; value?: string}) =>
  value ? (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  ) : null;

const PersonalDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const profile = route.params?.profile ?? {};
  const location = [profile.cityName, profile.stateName, profile.countryName]
    .filter(Boolean)
    .join(', ');

  return (
    <ScreenLayout title="Personal Details" showBack tab="Profile">
      <Row label="Full name" value={profile.fullName} />
      <Row label="Mobile" value={profile.mobileNumber} />
      <Row label="Email" value={profile.email} />
      <Row label="Location" value={location} />
      <Row label="Language" value={profile.preferredLanguageName} />
      <Row label="Marital status" value={profile.maritalStatus} />
      <PrimaryButton
        title="SPIRITUAL DETAILS"
        onPress={() => navigation.navigate('SpiritualDetails', {profile})}
      />
    </ScreenLayout>
  );
};

export default PersonalDetailsScreen;

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
