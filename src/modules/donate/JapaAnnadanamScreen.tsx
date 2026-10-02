import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import StatCards from '../common/StatCards';

import AnnadanamMembersSelector, {RATE_PER_PERSON} from './components/AnnadanamMembersSelector';

const JapaAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [persons, setPersons] = useState(5);
  const [completed, setCompleted] = useState(0);
  const [enabled, setEnabled] = useState(true);

  const totalAmount = persons * RATE_PER_PERSON;

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
          <AnnadanamMembersSelector
            persons={persons}
            onChangePersons={setPersons}
            title="Sponsor Annadanam for Devotees"
          />
          <PrimaryButton
            title={persons > 0 ? `DONATE ₹${totalAmount.toLocaleString()} (${persons} ${persons === 1 ? 'PERSON' : 'PERSONS'})` : 'ENTER NUMBER OF PERSONS'}
            disabled={persons <= 0}
            onPress={() =>
              navigation.navigate('DonationForm', {
                kind: 'JAPA_ANNADANAM',
                persons,
                amount: totalAmount,
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
    fontSize: 15.5,
    lineHeight: 23,
    marginBottom: 10,
    marginTop: 8,
    paddingBottom: 2,
  },
  disabled: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
