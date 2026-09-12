import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';

const InsightCard = ({
  text,
}: {
  text?: string;
}) => {
  const {t, tt} = useLanguage();
  return (
  <View style={styles.card}>
    <View style={styles.dot}>
      <Text style={styles.emoji}>✨</Text>
    </View>
    <View style={styles.copy}>
      <Text style={styles.title}>{t('spiritualInsight')}</Text>
      <Text style={styles.text}>{tt(text || t('consistencyInsight'))}</Text>
    </View>
  </View>
  );
};

export default InsightCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E2C6',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
  copy: {flex: 1},
  title: {fontWeight: '800', color: Colors.sacredBrown, marginBottom: 4},
  text: {color: Colors.textSecondary, lineHeight: 20},
});
