import React, {useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const PrivateJapaScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [mantra, setMantra] = useState('');
  const [goal, setGoal] = useState('1008');

  return (
    <ScreenLayout title="My Japa" showBack tab="JapaHub">
      <Text style={styles.heading}>{t('privateJapaHeading')}</Text>
      <View style={styles.card}>
        <View style={styles.dot}>
          <Text style={styles.emoji}>📿</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('privateMantra')}</Text>
          <Text style={styles.meta}>{t('mantraHiddenSecure')}</Text>
        </View>
      </View>
      <Text style={styles.label}>{t('enterYourMantra')}</Text>
      <TextInput
        style={styles.input}
        value={mantra}
        onChangeText={setMantra}
        placeholder={t('keptPrivateReports')}
        placeholderTextColor={Colors.placeholder}
        secureTextEntry
      />
      <Text style={styles.label}>{t('setGoal')}</Text>
      <TextInput
        style={styles.input}
        value={goal}
        onChangeText={setGoal}
        keyboardType="numeric"
      />
      <PrimaryButton
        title={t('startPrivateJapa')}
        onPress={() =>
          navigation.navigate('GoalSelect', {
            mode: 'private',
            privateMantra: mantra.trim() || t('privateJapaHeading'),
            goal: Number(String(goal).replace(/,/g, '')) || 1008,
          })
        }
      />
      <Text style={styles.note}>{t('reportsPrivateJapaOnly')}</Text>
    </ScreenLayout>
  );
};

export default PrivateJapaScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4EFDF',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
  copy: {flex: 1},
  title: {fontWeight: '800', color: Colors.sacredBrown, fontSize: 16},
  meta: {marginTop: 4, color: Colors.textSecondary},
  label: {color: Colors.leafGreen, fontWeight: '700', marginBottom: 8},
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.sacredBrown,
    marginBottom: 18,
  },
  note: {
    marginTop: 14,
    textAlign: 'center',
    color: Colors.leafGreen,
    fontWeight: '600',
  },
});
