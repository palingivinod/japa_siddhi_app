import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
import Colors from '../../theme/colors';

const FEATURE_KEYS: Record<
  string,
  {titleKey: TranslationKey; descKey: TranslationKey}
> = {
  Chant: {titleKey: 'chantJapa', descKey: 'chantJapaDesc'},
  FamilyJapa: {titleKey: 'familyJapa', descKey: 'familyJapaDesc'},
  Donate: {titleKey: 'donate', descKey: 'donateDesc'},
  Festivals: {titleKey: 'festivals', descKey: 'festivalsDesc'},
  Progress: {titleKey: 'myProgress', descKey: 'myProgressDesc'},
  Profile: {titleKey: 'tabProfile', descKey: 'profileDesc'},
};

const FeatureScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {t} = useLanguage();
  const keys = FEATURE_KEYS[route.name];
  const title = keys ? t(keys.titleKey) : route.name;
  const description = keys ? t(keys.descKey) : t('featureReady');

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹ {t('back')}</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
};

export default FeatureScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 12,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.cream,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
});
