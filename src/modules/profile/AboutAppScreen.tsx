import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import {getAppVersionName} from '../../utils/appVersion';
import ScreenLayout from '../common/ScreenLayout';

const AboutAppScreen = () => {
  const {t} = useLanguage();
  const version = getAppVersionName();

  return (
    <ScreenLayout title={t('aboutApp')} showBack tab="Profile">
      <View style={styles.card}>
        <Text style={styles.appName}>{t('appName')}</Text>
        <Text style={styles.body}>{t('aboutAppBody')}</Text>
        <View style={styles.versionBlock}>
          <Text style={styles.versionLabel}>{t('appVersion')}</Text>
          <Text style={styles.version}>{version}</Text>
        </View>
      </View>
    </ScreenLayout>
  );
};

export default AboutAppScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 22,
    alignItems: 'center',
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  versionBlock: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    overflow: 'visible',
  },
  versionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.leafGreen,
    marginBottom: 10,
    lineHeight: 28,
    paddingVertical: 4,
    textAlign: 'center',
    includeFontPadding: true,
  },
  version: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.templeGold,
    lineHeight: 56,
    paddingVertical: 6,
    textAlign: 'center',
    includeFontPadding: true,
  },
});
