import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';

const AMOUNTS = [501, 1008, 2001];

const JapaAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const [amount, setAmount] = useState(1008);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    apiService
      .get('/japa/milestones')
      .then(response => setCompleted(Number(response.data.data?.total || 0)))
      .catch(() => undefined);
  }, []);

  return (
    <ScreenLayout title="Japa Annadanam" showBack tab="SevaHub">
      <Text style={styles.section}>Your Japa milestone</Text>
      <StatCards
        items={[
          {label: 'COMPLETED', value: completed.toLocaleString()},
          {label: 'OFFER', value: 'Annadanam'},
        ]}
      />
      <Text style={styles.section}>Suggested offering</Text>
      <View style={styles.grid}>
        {AMOUNTS.map(value => (
          <TouchableOpacity
            key={value}
            style={[styles.chip, amount === value && styles.chipOn]}
            onPress={() => setAmount(value)}>
            <Text style={styles.chipText}>₹ {value.toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, amount === 0 && styles.chipOn]}
          onPress={() => setAmount(0)}>
          <Text style={styles.chipText}>Custom</Text>
        </TouchableOpacity>
      </View>
      <PrimaryButton
        title="DONATE NOW"
        onPress={() =>
          navigation.navigate('DonationForm', {
            kind: 'JAPA_ANNADANAM',
            amount: amount || 1008,
            itemName: 'Japa Annadanam',
          })
        }
      />
    </ScreenLayout>
  );
};

export default JapaAnnadanamScreen;

const styles = StyleSheet.create({
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 8,
  },
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20},
  chip: {
    width: '47%',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.sacredBrown,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  chipOn: {borderWidth: 2, backgroundColor: Colors.lightGold},
  chipText: {fontWeight: '800', color: Colors.sacredBrown},
});
