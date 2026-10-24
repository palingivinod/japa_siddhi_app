import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

const RULE_KEYS = [
  'challengeRule1',
  'challengeRule2',
  'challengeRule3',
  'challengeRule4',
  'challengeRule5',
  'challengeRule6',
] as const;

const ChallengeRulesScreen = () => {
  const {t} = useLanguage();
  return (
    <ScreenLayout title={t('challengeRulesTitle')} showBack tab="JapaHub">
      {RULE_KEYS.map(key => (
        <View key={key} style={styles.row}>
          <View style={styles.bullet} />
          <Text style={styles.text}>{t(key)}</Text>
        </View>
      ))}
    </ScreenLayout>
  );
};

export default ChallengeRulesScreen;

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
});
