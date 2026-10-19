import React, {useEffect, useState} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const CallSupportScreen = () => {
  const {t} = useLanguage();
  const [phone, setPhone] = useState('+919849535599');
  const [hours, setHours] = useState('9 AM – 6 PM');

  useEffect(() => {
    apiService
      .get('/customer-care/config')
      .then(response => {
        const data = response.data.data || {};
        if (data.supportPhone) {
          setPhone(data.supportPhone);
        }
        if (data.hours) {
          setHours(data.hours);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <ScreenLayout title={t('callSupport')} showBack tab="Profile">
      <View style={styles.center}>
        <View style={styles.icon}>
          <Text style={styles.phone}>☎</Text>
        </View>
        <Text style={styles.title}>{t('speakWithSupport')}</Text>
        <Text style={styles.sub}>
          {t('supportHoursLabel', {hours})}
        </Text>
      </View>
      <PrimaryButton
        title={t('callSupport')}
        onPress={() => Linking.openURL(`tel:${phone}`)}
      />
    </ScreenLayout>
  );
};

export default CallSupportScreen;

const styles = StyleSheet.create({
  center: {alignItems: 'center', marginVertical: 40},
  icon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.templeGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  phone: {fontSize: 34},
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    textAlign: 'center',
    lineHeight: 30,
    includeFontPadding: false,
    paddingBottom: 2,
  },
  sub: {
    marginTop: 8,
    color: Colors.textSecondary,
    lineHeight: 22,
    includeFontPadding: false,
    paddingBottom: 2,
  },
});
