import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {shortMonthDayYear} from '../../i18n/calendar';
import {useLanguage} from '../../i18n/LanguageContext';
import apiService, {getApiError} from '../../services/apiService';
import {saveDeliveryAddress} from '../../services/savedAddresses';
import Colors from '../../theme/colors';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {promptRewardAddressDisclaimer} from '../../utils/rewardAddressDisclaimer';
import {sevaRequestFromRoute} from './sevaRequestConfig';

const SevaRequestReviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const request = sevaRequestFromRoute(String(route.name || ''));
  const [saving, setSaving] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const params = route.params || {};
  const address = String(params.address || '').trim();
  const hasAddress = address.length > 0;

  const submitOrder = async () => {
    if (!hasAddress) {
      Alert.alert(t(request.titleKey), t('addAddressBeforeApplication'));
      return;
    }
    setDisclaimerAccepted(true);
    setSaving(true);
    try {
      await saveDeliveryAddress(address);
      const response = await apiService.post('/donations/checkout', {
        kind: request.kind,
        fullName: params.fullName,
        mobile: params.mobile,
        address,
        city: params.city || undefined,
        state: params.state || undefined,
        pinCode: params.pinCode || undefined,
        comments: params.comments?.trim() || undefined,
        remarks: params.comments?.trim() || `${t(request.titleKey)} request`,
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
      const msg = getApiError(error, t('couldNotSubmitApplication'));
      const lower = msg.toLowerCase();
      if (
        lower.includes('already one') ||
        lower.includes('in progress') ||
        lower.includes('in review')
      ) {
        Alert.alert(
          t('banaLingamPendingOrderTitle') || 'Order In Review',
          msg,
          [
            {
              text: t('myOrders') || 'My Orders',
              onPress: () => navigation.navigate('Orders'),
            },
            {
              text: t('ok') || 'OK',
              style: 'cancel',
            },
          ],
        );
      } else if (
        lower.includes('30 days') ||
        lower.includes('order again after')
      ) {
        let cooldownMessage = msg;
        try {
          const {
            findBhasmamReorderCooldown,
            isBhasmamCooldownKind,
          } = await import('../../utils/bhasmamReorderCooldown');
          if (isBhasmamCooldownKind(request.kind)) {
            const ordersRes = await apiService.get('/orders').catch(() => null);
            const allOrders = ordersRes?.data?.data || [];
            const cooldown = findBhasmamReorderCooldown(
              allOrders,
              request.matchOrder,
              new Date(),
              iso => shortMonthDayYear(t, iso),
            );
            if (cooldown) {
              const label = t(request.titleKey) || 'this item';
              cooldownMessage =
                t('bhasmamReorderCooldownMessage', {
                  item: label,
                  orderedOn: cooldown.orderedOnLabel,
                  availableOn: cooldown.availableOnLabel,
                }) ||
                `You ordered ${label} on ${cooldown.orderedOnLabel}. You can order again after 30 days, on ${cooldown.availableOnLabel}.`;
            }
          }
        } catch {
          // Keep API message if local rebuild fails.
        }
        Alert.alert(
          t('bhasmamReorderCooldownTitle') || 'Please wait 30 days',
          cooldownMessage,
          [{text: t('ok') || 'OK'}],
        );
      } else {
        Alert.alert(t('applicationOverview'), msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const placeOrder = () => {
    if (disclaimerAccepted) {
      submitOrder();
      return;
    }
    promptRewardAddressDisclaimer(t, submitOrder);
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
        {params.comments ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{t('comments')}</Text>
              <Text style={styles.value}>{params.comments}</Text>
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
