import React, {useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const BanaLingamScreen = () => {
  const navigation = useNavigation<any>();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');

  const submit = () => {
    if (!fullName.trim() || !mobile.trim() || !address.trim()) {
      Alert.alert('Baanalingam', 'Name, mobile and address are required.');
      return;
    }
    navigation.navigate('BanaLingamReview', {
      fullName,
      mobile,
      address,
      gothram,
      nakshatram,
      amount: 1008,
    });
  };

  return (
    <ScreenLayout title="Baanalingam" showBack tab="SevaHub">
      <Text style={styles.heading}>Baanalingam Distribution.</Text>
      <MenuCard
        title="Sacred service"
        subtitle="Apply to receive Baanalingam with delivery."
      />
      <FormField
        label="Name"
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <FormField
        label="Mobile"
        placeholder="Mobile number"
        keyboardType="phone-pad"
        value={mobile}
        onChangeText={setMobile}
      />
      <FormField
        label="Address"
        placeholder="Delivery address"
        value={address}
        onChangeText={setAddress}
      />
      <FormField
        label="Gothram"
        placeholder="Optional"
        value={gothram}
        onChangeText={setGothram}
      />
      <FormField
        label="Nakshatram"
        placeholder="Optional"
        value={nakshatram}
        onChangeText={setNakshatram}
      />
      <PrimaryButton title="SUBMIT" onPress={submit} />
    </ScreenLayout>
  );
};

export default BanaLingamScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
});
