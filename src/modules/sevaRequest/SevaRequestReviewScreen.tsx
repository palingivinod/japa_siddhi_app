import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import {saveDeliveryAddress} from '../../services/savedAddresses';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {sevaRequestFromRoute} from './sevaRequestConfig';

const SevaRequestReviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const request = sevaRequestFromRoute(String(route.name || ''));
  const [saving, setSaving] = useState(false);
  const params = route.params || {};
  const address = String(params.address || '').trim();
  const hasAddress = address.length > 0;

  const placeOrder = async () => {
    if (!hasAddress) {
      Alert.alert(t(request.titleKey), t('addAddressBeforeApplication'));
      return;
    }
    setSaving(true);
    try {
      await saveDeliveryAddress(address);
      const response = await apiService.post('/donations/checkout', {
        kind: request.kind,
        fullName: params.fullName,
        mobile: params.mobile,
        address,
        nakshatram: params.nakshatram,
        gothram: params.gothram,
        remarks: `${t(request.titleKey)} request`,
      });
      const orderNumber = String(response.data?.data?.orderNumber || '');
      Alert.alert(
        t('requestSubmittedTitle'),
        orderNumber
          ? `${t('weWillContactSoon')}\n${t('orderNumberPlain', {number: orderNumber})}`
          : t('weWillContactSoon'),
        [{text: t('ok'), onPress: () => navigation.navigate('Orders')}],
        {cancelable: false},
      );
    } catch (error) {
      Alert.alert(
        t('applicationOverview'),
        getApiError(error, t('couldNotSubmitApplication')),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title={t('applicationOverview')} showBack tab="SevaHub">
      <MenuCard
        icon={request.icon}
        title={t(request.titleKey)}
        subtitle={t('reviewBeforeSubmit')}
      />
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
          <Text style={styles.valueAddress}>{hasAddress ? address : '—'}</Text>
        </View>
        {params.gothram ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{t('gothram')}</Text>
              <Text style={styles.value}>{params.gothram}</Text>
            </View>
          </>
        ) : null}
        {params.nakshatram ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{t('nakshatram')}</Text>
              <Text style={styles.value}>{params.nakshatram}</Text>
            </View>
          </>
        ) : null}
      </View>
      {hasAddress ? (
        <>
          <PrimaryButton
            title={saving ? t('submitting') : t('submit')}
            onPress={placeOrder}
            disabled={saving}
          />
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}>
            <Text style={styles.editBtnText}>{t('editDetailsLink')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.hint}>{t('pleaseAddDeliveryAddress')}</Text>
          <PrimaryButton
            title={t('addAddress')}
            onPress={() => navigation.navigate(request.formRoute)}
          />
        </>
      )}
    </ScreenLayout>
  );
};

export default SevaRequestReviewScreen;

const styles = StyleSheet.create({
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8D9B8',
    padding: 18,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: '32%',
  },
  value: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  valueAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EBD9',
    marginVertical: 4,
  },
  editBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  editBtnText: {
    color: Colors.templeGold,
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  hint: {
    color: Colors.textSecondary,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
});
