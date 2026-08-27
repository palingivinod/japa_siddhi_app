import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';

const SignupPersonalScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(route.params?.email || '');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('01/01/1995');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');

  const next = () => {
    if (fullName.trim().length < 3) {
      Alert.alert('Required', 'Enter your full name.');
      return;
    }
    navigation.navigate('SignupSpiritual', {
      ...route.params,
      fullName: fullName.trim(),
      email: email.trim(),
      gender,
      dob,
      address,
      city,
      stateName,
    });
  };

  return (
    <ScreenLayout title="Create Your Profile" showBack>
      <Text style={styles.step}>Step 1 of 2</Text>
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
      <Text style={styles.percent}>50%</Text>
      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} placeholder="Your name" value={fullName} onChangeText={setFullName} />
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Optional"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.label}>Date of Birth</Text>
      <TextInput style={styles.input} placeholder="DD / MM / YYYY" value={dob} onChangeText={setDob} />
      <Text style={styles.label}>Gender</Text>
      <TextInput style={styles.input} placeholder="Select gender" value={gender} onChangeText={setGender} />
      <Text style={styles.label}>Address</Text>
      <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />
      <Text style={styles.label}>City</Text>
      <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
      <Text style={styles.label}>State</Text>
      <TextInput style={styles.input} placeholder="State" value={stateName} onChangeText={setStateName} />
      <PrimaryButton title="CONTINUE" onPress={next} />
    </ScreenLayout>
  );
};

export default SignupPersonalScreen;

const styles = StyleSheet.create({
  step: {color: Colors.leafGreen, fontWeight: '700', marginBottom: 8},
  track: {
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.lightGold,
    overflow: 'hidden',
  },
  fill: {width: '50%', height: 10, backgroundColor: Colors.templeGold},
  percent: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '700',
    color: Colors.sacredBrown,
  },
  label: {color: Colors.leafGreen, fontWeight: '700', marginBottom: 6, marginTop: 10},
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.sacredBrown,
  },
});
