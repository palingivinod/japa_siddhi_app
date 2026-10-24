import React, {useEffect, useState} from 'react';
import {Image, Linking, StyleSheet, Text, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const WhatsAppSupportScreen = () => {
  const {t} = useLanguage();
  const [url, setUrl] = useState('https://wa.me/919849535599');

  useEffect(() => {
    apiService
      .get('/customer-care/config')
      .then(response => {
        if (response.data.data?.whatsappUrl) {
          setUrl(response.data.data.whatsappUrl);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <ScreenLayout title={t('whatsappSupport')} showBack tab="Profile">
      <View style={styles.center}>
        <Image
          source={require('../../assets/images/whatsapp_logo.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.title}>{t('chatWithSupportTeam')}</Text>
        <Text style={styles.sub}>{t('availableForServiceHelp')}</Text>
      </View>
      <PrimaryButton
        title={t('openWhatsapp')}
        onPress={() => Linking.openURL(url)}
      />
    </ScreenLayout>
  );
};

export default WhatsAppSupportScreen;

const styles = StyleSheet.create({
  center: {alignItems: 'center', marginVertical: 40},
  icon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  sub: {marginTop: 8, color: Colors.textSecondary, textAlign: 'center'},
});
