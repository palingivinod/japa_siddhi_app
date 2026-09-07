import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';

const AMOUNTS = [501, 1008, 2001];

const JapaAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [amount, setAmount] = useState(1008);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    apiService
      .get('/japa/milestones')
      .then(response => setCompleted(Number(response.data.data?.total || 0)))
      .catch(() => undefined);
  }, []);

  return (
    <ScreenLayout title={t('japaAnnadanam')} showBack tab="SevaHub">
      <Text style={styles.section}>{t('yourJapaMilestone')}</Text>
      <StatCards
        items={[
          {label: t('completedLabel'), value: completed.toLocaleString()},
          {label: t('offerLabel'), value: t('tileAnnadanam')},
        ]}
      />
      <Text style={styles.section}>{t('suggestedOffering')}</Text>
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
          <Text style={styles.chipText}>{t('customAmount')}</Text>
        </TouchableOpacity>
      </View>
      <PrimaryButton
        title={t('donateNowAction')}
        onPress={() =>
          navigation.navigate('DonationForm', {
            kind: 'JAPA_ANNADANAM',
            amount: amount || 1008,
            itemName: t('japaAnnadanam'),
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
