import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';

import {useLanguage} from '../../../i18n/LanguageContext';
import Colors from '../../../theme/colors';

const LoginHeader: React.FC = () => {
  const {t} = useLanguage();
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/images/login_logo.webp')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>
        Japa Siddhi
      </Text>

      <Text style={styles.subtitle}>{t('spiritualCompanion')}</Text>

      <Text style={styles.description}>{t('loginHeaderBody')}</Text>
    </View>
  );
};

export default LoginHeader;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 35,
    paddingHorizontal: 20,
  },

  logo: {
    width: 170,
    height: 170,
    marginBottom: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  description: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
});