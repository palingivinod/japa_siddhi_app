import React from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity} from 'react-native';

import ENV from '../../env';
import {useLanguage} from '../../i18n/LanguageContext';
import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';

const PrivacyPolicyScreen = () => {
  const {t} = useLanguage();
  return (
    <ScreenLayout title={t('privacyPolicy')}>
      <Text style={styles.updated}>{t('privacyUpdated')}</Text>
      <Text style={styles.body}>{t('privacyIntro')}</Text>
      <Text style={styles.heading}>{t('privacyCollectTitle')}</Text>
      <Text style={styles.body}>{t('privacyCollectBody')}</Text>
      <Text style={styles.heading}>{t('privacyUseTitle')}</Text>
      <Text style={styles.body}>{t('privacyUseBody')}</Text>
      <Text style={styles.heading}>{t('privacyDeleteTitle')}</Text>
      <Text style={styles.body}>{t('privacyDeleteBody')}</Text>
      <Text style={styles.heading}>{t('privacyContact')}</Text>
      <Text style={styles.body}>
        {t('privacyContactBody', {email: ENV.SUPPORT_EMAIL})}
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(ENV.PRIVACY_POLICY_URL)}>
        <Text style={styles.link}>{t('privacyOpenOnline')}</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  updated: {
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  heading: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  body: {
    color: Colors.textSecondary,
    lineHeight: 22,
    fontSize: 15,
  },
  link: {
    marginTop: 20,
    color: Colors.primary,
    fontWeight: '700',
  },
});
