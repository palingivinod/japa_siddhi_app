import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import DatePickerModal from '../common/DatePickerModal';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

import AnnadanamMembersSelector, {RATE_PER_PERSON} from './components/AnnadanamMembersSelector';

const JapaAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [persons, setPersons] = useState(0);
  const [preferDate, setPreferDate] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [comments, setComments] = useState('');
  const [completed, setCompleted] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const dateReady = /^\d{4}-\d{2}-\d{2}$/.test(preferDate);

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
          <Text style={styles.label}>{t('preferDate')} *</Text>
          <TouchableOpacity style={styles.dateField} onPress={() => setShowDate(true)}>
            <Text style={preferDate ? styles.dateValue : styles.datePlaceholder}>
              {preferDate || t('selectDate')}
            </Text>
          </TouchableOpacity>
          <DatePickerModal
            visible={showDate}
            value={
              dateReady
                ? new Date(
                    Number(preferDate.slice(0, 4)),
                    Number(preferDate.slice(5, 7)) - 1,
                    Number(preferDate.slice(8, 10)),
                  )
                : new Date()
            }
            minimumDate={new Date()}
            onCancel={() => setShowDate(false)}
            onConfirm={selected => {
              const month = String(selected.getMonth() + 1).padStart(2, '0');
              const day = String(selected.getDate()).padStart(2, '0');
              setPreferDate(`${selected.getFullYear()}-${month}-${day}`);
              setShowDate(false);
            }}
          />
          <FormField
            label={t('comments')}
            placeholder={t('annadanamCommentsPlaceholder')}
            value={comments}
            onChangeText={setComments}
            maxLength={1000}
            multiline
            numberOfLines={3}
            style={styles.commentsInput}
          />
          <PrimaryButton
            title={
              persons > 0 && dateReady
                ? `DONATE ₹${totalAmount.toLocaleString('en-IN')} (${persons} ${
                    persons === 1 ? 'PERSON' : 'PERSONS'
                  })`
                : persons > 0
                  ? 'ENTER REQUIRED DETAILS'
                  : 'SELECT OR ENTER NO OF PERSONS'
            }
            disabled={persons <= 0 || !dateReady}
            onPress={() => {
              if (!dateReady) {
                Alert.alert(t('validationTitle'), t('selectPreferDate'));
                return;
              }
              navigation.navigate('DonationForm', {
                kind: 'JAPA_ANNADANAM',
                persons,
                amount: totalAmount,
                itemName: t('japaAnnadanam'),
                preferDate,
                comments: comments.trim(),
              });
            }}
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
  label: {
    marginTop: 4,
    marginBottom: 6,
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  dateField: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  dateValue: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  datePlaceholder: {
    color: Colors.placeholder,
    fontSize: 16,
  },
  commentsInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
