import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const TERM_KEYS = [
  'rewardTerm1',
  'rewardTerm2',
  'rewardTerm3',
  'rewardTerm4',
  'rewardTerm5',
] as const;

const RewardTermsScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();

  return (
    <ScreenLayout title={t('rewardTermsTitle')} showBack tab="JapaHub">
      {TERM_KEYS.map(key => (
        <View key={key} style={styles.row}>
          <View style={styles.bullet} />
          <Text style={styles.text}>{t(key)}</Text>
        </View>
      ))}
      <View style={styles.gap} />
      <PrimaryButton title={t('iUnderstand')} onPress={() => navigation.goBack()} />
    </ScreenLayout>
  );
};

export default RewardTermsScreen;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.sacredBrown,
    marginTop: 7,
    marginRight: 12,
  },
  text: {
    flex: 1,
    color: Colors.sacredBrown,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  gap: {height: 12},
});
