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
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    apiService
      .get('/japa/milestones')
      .then(response => setCompleted(Number(response.data.data?.total || 0)))
      .catch(() => undefined);
    apiService
      .get('/annadanam/visibility')
      .then(response => setEnabled(response.data?.data?.japa !== false))
      .catch(() => setEnabled(true));
  }, []);

  return (
    <ScreenLayout title={t('japaAnnadanam')} showBack tab="SevaHub">
      {!enabled ? (
        <Text style={styles.disabled}>
          Japa Annadanam is currently unavailable.
        </Text>
      ) : (
        <>
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
        </>
      )}
    </ScreenLayout>
  );
};

export default JapaAnnadanamScreen;

const styles = StyleSheet.create({
  section: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  disabled: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  grid: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16},
  chip: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  chipOn: {borderColor: Colors.templeGold, backgroundColor: '#FFF4E0'},
  chipText: {color: Colors.sacredBrown, fontWeight: '700'},
});
