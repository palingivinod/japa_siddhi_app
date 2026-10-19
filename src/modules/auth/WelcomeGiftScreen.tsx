import React, {useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import FormField from '../common/FormField';
import OutlineButton from '../common/OutlineButton';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const WelcomeGiftScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const claim = async () => {
    if (address.trim().length < 6) {
      Alert.alert(t('address'), t('confirmShippingAddress'));
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.post('/orders', {
        orderType: 'SPIRITUAL_PRODUCT',
        orderSource: 'ADMIN_GIFT',
        itemName: 'Karungali Mala Welcome Gift',
        quantity: 1,
        remarks: `${address.trim()}, ${city.trim()}`.trim(),
      });
      const order = response.data.data || {};
      navigation.replace('Orders');
      if (order.id) {
        navigation.navigate('OrderDetails', {id: order.id, order});
      }
    } catch (error) {
      Alert.alert(
        t('welcomeGift'),
        getApiError(error, t('couldNotCreateWelcomeGift')),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('welcomeGift')} showBack>
      <Text style={styles.title}>{t('giftFirstRegistration')}</Text>
      <Text style={styles.copy}>{t('welcomeGiftCopy')}</Text>
      <FormField
        label={t('shippingAddress')}
        placeholder={t('houseStreet')}
        value={address}
        onChangeText={setAddress}
      />
      <FormField
        label={t('city')}
        placeholder={t('city')}
        value={city}
        onChangeText={setCity}
      />
      <PrimaryButton
        title={saving ? t('creatingOrder') : t('claimGift')}
        onPress={claim}
        disabled={saving}
      />
      <Text style={styles.gap} />
      <OutlineButton
        title={t('skipForNow')}
        onPress={() => {
          void import('../../navigation/goHomeAfterAuth').then(
            ({resetToHomeAfterAuth}) => resetToHomeAfterAuth(navigation),
          );
        }}
      />
    </ScreenLayout>
  );
};

export default WelcomeGiftScreen;

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  copy: {
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 18,
  },
  gap: {height: 12},
});
