import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

import AnnadanamMembersSelector, {RATE_PER_PERSON} from './components/AnnadanamMembersSelector';

const JapaAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [persons, setPersons] = useState(0);
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
          Japa Anna Santharpana is currently unavailable.
        </Text>
      ) : (
        <>
          <Text style={styles.section}>{t('yourJapaMilestone')}</Text>
          <View style={styles.milestoneWrap}>
            <View style={styles.milestoneCard}>
              <Text style={styles.milestoneLabel} numberOfLines={2}>
                {t('completedJapaCount')}
              </Text>
              <Text style={styles.milestoneValue}>
                {completed.toLocaleString()}
              </Text>
            </View>
          </View>
          <AnnadanamMembersSelector
            persons={persons}
            onChangePersons={setPersons}
            title={t('selectNoOfPersons')}
          />
          <PrimaryButton
            title={
              persons > 0
                ? `DONATE ₹${totalAmount.toLocaleString('en-IN')} (${persons} ${
                    persons === 1 ? 'PERSON' : 'PERSONS'
                  })`
                : 'SELECT OR ENTER NO OF PERSONS'
            }
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
    lineHeight: 26,
    marginBottom: 10,
    marginTop: 8,
    paddingBottom: 4,
    includeFontPadding: false,
  },
  milestoneWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  milestoneCard: {
    width: '72%',
    maxWidth: 280,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneLabel: {
    alignSelf: 'stretch',
    width: '100%',
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.2,
    textAlign: 'center',
    includeFontPadding: false,
    paddingBottom: 6,
  },
  milestoneValue: {
    alignSelf: 'stretch',
    width: '100%',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    includeFontPadding: false,
  },
  disabled: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
