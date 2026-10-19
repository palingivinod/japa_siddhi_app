import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Colors from '../../theme/colors';
import {TranslationKey} from '../../i18n';
import {useLanguage} from '../../i18n/LanguageContext';

const resolveInsight = (
  raw: string | undefined,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  tt: (english: string) => string,
) => {
  const value = String(raw || '').trim();
  if (!value) {
    return t('consistencyInsight');
  }
  if (value === 'insightBeginDaily' || value === 'insightSavedBefore') {
    return t(value);
  }
  if (value.startsWith('insightStreakForming:')) {
    const streak = Number(value.split(':')[1] || 0) || 0;
    return t('insightStreakForming', {streak});
  }
  if (value.startsWith('insightTodayUpdating:')) {
    const streak = Number(value.split(':')[1] || 0) || 0;
    return t('insightTodayUpdating', {
      streak,
      dayWord: streak === 1 ? t('daySingular') : t('dayPlural'),
    });
  }
  // Legacy English sentences from older API builds — translate as a whole phrase.
  return tt(value);
};

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
      <Text style={styles.text}>{resolveInsight(text, t, tt)}</Text>
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
  title: {
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 4,
    lineHeight: 22,
    includeFontPadding: false,
    paddingBottom: 2,
  },
  text: {
    color: Colors.textSecondary,
    lineHeight: 22,
    includeFontPadding: false,
    paddingBottom: 2,
  },
});
