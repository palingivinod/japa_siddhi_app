import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const RamakotiBooksReviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [saving, setSaving] = useState(false);
  const params = route.params || {};
  const address = String(params.address || '').trim();

  const placeOrder = async () => {
    if (!address) {
      Alert.alert(t('ramakotiSeva'), t('addAddressInProfile'));
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.post('/donations/checkout', {
        kind: 'RAMAKOTI_BOOKS',
        fullName: params.fullName,
        mobile: params.mobile,
        address,
        remarks: 'Ramakoti Books request',
      });
      const orderNumber = String(response.data?.data?.orderNumber || '');
      Alert.alert(
        t('requestSubmittedTitle'),
        orderNumber
          ? `${t('weWillContactSoon')}\n${t('orderNumberPlain', {number: orderNumber})}`
          : t('weWillContactSoon'),
        [
          {
            text: t('ok'),
            onPress: () => navigation.navigate('Orders'),
          },
        ],
        {cancelable: false},
      );
    } catch (error) {
      Alert.alert(t('applicationOverview'), getApiError(error, t('couldNotSubmitApplication')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('applicationOverview')} showBack tab="SevaHub">
      <MenuCard emoji="📖" title={t('ramakotiSeva')} subtitle={t('reviewBeforeSubmit')} />
      <View style={styles.overviewCard}>
        <Text style={styles.cardHeader}>{t('devoteeDeliveryDetails')}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('nameLabel')}</Text>
          <Text style={styles.value}>{params.fullName || '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>{t('mobileLabel')}</Text>
          <Text style={styles.value}>{params.mobile || '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>{t('address')}</Text>
          <Text style={styles.value}>{address || '—'}</Text>
        </View>
      </View>
      <PrimaryButton
        title={saving ? t('submitting') : t('submit')}
        onPress={placeOrder}
        disabled={saving || !address}
      />
      <TouchableOpacity
        style={styles.edit}
        onPress={() => navigation.goBack()}
        disabled={saving}>
        <Text style={styles.editText}>{t('editDetailsLink')}</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
};

export default RamakotiBooksReviewScreen;

const styles = StyleSheet.create({
  overviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 12,
  },
  row: {paddingVertical: 8},
  label: {color: Colors.textSecondary, fontWeight: '700', marginBottom: 4},
  value: {color: Colors.textPrimary, fontSize: 16, fontWeight: '700'},
  divider: {height: 1, backgroundColor: Colors.cardBorder},
  edit: {marginTop: 12, alignItems: 'center'},
  editText: {color: Colors.templeGold, fontWeight: '800'},
});
