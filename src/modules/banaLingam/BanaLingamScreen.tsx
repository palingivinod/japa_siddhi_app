import React, {useCallback, useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
import apiService from '../../services/apiService';
import {
  loadSavedAddresses,
  saveDeliveryAddress,
} from '../../services/savedAddresses';
import {getStoredUser} from '../../services/session';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SelectField from '../common/SelectField';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const BanaLingamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [purpose, setPurpose] = useState('For Home pooja');
  const [comments, setComments] = useState('');
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const [stored, profile, addresses, ordersRes] = await Promise.all([
          getStoredUser(),
          ProfileApi.getProfile().catch(() => null),
          loadSavedAddresses(),
          apiService.get('/orders').catch(() => null),
        ]);
        if (!active) {
          return;
        }

        const allOrders = ordersRes?.data?.data || [];
        const undeliveredOrder = allOrders.find((ord: any) => {
          const type = String(ord.orderType || '').toUpperCase();
          const name = String(ord.itemName || '').toLowerCase();
          const isBana =
            type === 'BANA_LINGAM' ||
            name.includes('baanalingam') ||
            name.includes('banalingam');
          const status = String(ord.orderStatus || ord.status || '').toUpperCase();
          const isFinished = status === 'DELIVERED' || status === 'CANCELLED';
          return isBana && !isFinished;
        });

        if (undeliveredOrder) {
          setHasActiveOrder(true);
          setActiveOrder(undeliveredOrder);
          Alert.alert(
            t('banaLingamPendingOrderTitle'),
            t('banaLingamPendingOrderMessage'),
            [
              {
                text: t('myOrders'),
                onPress: () => navigation.navigate('Orders'),
              },
              {
                text: t('ok'),
                style: 'cancel',
              },
            ],
          );
        } else {
          setHasActiveOrder(false);
          setActiveOrder(null);
        }
        const name =
          profile?.fullName ||
          stored?.fullName ||
          stored?.full_name ||
          '';
        const phone =
          profile?.mobileNumber ||
          stored?.mobileNumber ||
          stored?.mobile_number ||
          stored?.phone ||
          '';
        if (name) {
          setFullName(current => current || String(name));
        }
        if (phone) {
          setMobile(
            current => current || digitsOnly(String(phone)).slice(-MOBILE_DIGITS),
          );
        }
        if (profile?.gothram || stored?.gothram) {
          setGothram(current => current || String(profile?.gothram || stored?.gothram || ''));
        }
        if (profile?.nakshatram || stored?.nakshatram) {
          setNakshatram(current => current || String(profile?.nakshatram || stored?.nakshatram || ''));
        }
        setSavedAddresses(addresses);
        const latest = addresses[0] || String(profile?.address || stored?.address || '');
        if (latest) {
          setAddress(current => current || latest);
        }
      };
      load();
      return () => {
        active = false;
      };
    }, []),
  );

  const submit = async () => {
    if (hasActiveOrder) {
      Alert.alert(
        t('banaLingamPendingOrderTitle'),
        t('banaLingamPendingOrderMessage'),
        [
          {
            text: t('myOrders'),
            onPress: () => navigation.navigate('Orders'),
          },
          {
            text: t('ok'),
            style: 'cancel',
          },
        ],
      );
      return;
    }
    if (!fullName.trim() || !mobile.trim() || !address.trim()) {
      Alert.alert(t('baanalingamSeva'), t('baanalingamFieldsRequired'));
      return;
    }
    if (!isMobile(mobile)) {
      Alert.alert(
        t('baanalingamSeva'),
        t('enterValidMobileDigits', {digits: String(MOBILE_DIGITS)}),
      );
      return;
    }
    if (!purpose) {
      Alert.alert(t('baanalingamSeva'), t('purposeRequiredBaanalingam'));
      return;
    }
    const nextAddresses = await saveDeliveryAddress(address);
    setSavedAddresses(nextAddresses);
    navigation.navigate('BanaLingamReview', {
      fullName,
      mobile,
      address: address.trim(),
      gothram,
      nakshatram,
      purpose,
      comments: comments.trim(),
    });
  };

  const purposeOptions = [
    {label: t('purposeHomePooja'), value: 'For Home pooja'},
    {label: t('purposeArchakaPooja'), value: 'For Archaka Sanchara pooja'},
    {label: t('purposeTemplePratistha'), value: 'For Temple Pratistha'},
  ];

  return (
    <ScreenLayout title={t('baanalingamSeva')} showBack tab="SevaHub">
      <Text style={styles.heading}>{t('baanalingamDistribution')}</Text>
      <MenuCard
        icon="banalingam"
        title={t('sacredService')}
        subtitle={t('applyBaanalingamDelivery')}
      />
      {hasActiveOrder ? (
        <View style={styles.pendingOrderBanner}>
          <Text style={styles.pendingOrderIcon}>⏳</Text>
          <View style={styles.pendingOrderTextCol}>
            <Text style={styles.pendingOrderTitle}>
              {t('banaLingamPendingOrderTitle')}
            </Text>
            <Text style={styles.pendingOrderDesc}>
              {t('banaLingamPendingOrderMessage')}
            </Text>
            {activeOrder?.orderNumber ? (
              <Text style={styles.pendingOrderNum}>
                {t('orderDetails')}: {activeOrder.orderNumber}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      <FormField
        label={t('nameLabel')}
        placeholder={t('fullName')}
        value={fullName}
        onChangeText={setFullName}
      />
      <FormField
        label={t('mobile')}
        placeholder={t('placeholderMobile')}
        keyboardType="phone-pad"
        maxLength={MOBILE_DIGITS}
        value={mobile}
        onChangeText={text => setMobile(digitsOnly(text).slice(0, MOBILE_DIGITS))}
      />
      {savedAddresses.length ? (
        <>
          <Text style={styles.label}>{t('savedAddresses')}</Text>
          <View style={styles.chips}>
            {savedAddresses.map(item => {
              const active = item === address.trim();
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipOn]}
                  onPress={() => setAddress(item)}>
                  <Text style={styles.chipText} numberOfLines={2}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}
      <FormField
        label={savedAddresses.length ? t('newOrSelectedAddress') : t('address')}
        placeholder={t('deliveryAddress')}
        value={address}
        onChangeText={setAddress}
      />
      <Text style={styles.addressNote}>* {t('addressDetailedHint')}</Text>
      <FormField
        label="Gothram"
        placeholder="Optional"
        value={gothram}
        onChangeText={setGothram}
      />
      <FormField
        label="Nakshatram"
        placeholder="Optional"
        value={nakshatram}
        onChangeText={setNakshatram}
      />
      <Text style={styles.label}>{t('purpose')} *</Text>
      <SelectField
        value={purpose}
        onChange={setPurpose}
        placeholder={t('selectPurpose')}
        title={t('purpose')}
        options={purposeOptions}
      />
      <FormField
        label={t('comments')}
        placeholder={t('generalCommentsPlaceholder')}
        value={comments}
        onChangeText={setComments}
        maxLength={1000}
        multiline
        numberOfLines={3}
        style={styles.commentsInput}
      />
      <PrimaryButton
        title={
          hasActiveOrder
            ? t('banaLingamPendingOrderTitle')
            : fullName.trim() && isMobile(mobile) && address.trim() && purpose
            ? 'OVERVIEW'
            : 'ENTER REQUIRED DETAILS'
        }
        onPress={submit}
        disabled={
          hasActiveOrder ||
          !fullName.trim() ||
          !isMobile(mobile) ||
          !address.trim() ||
          !purpose
        }
      />
      {hasActiveOrder ? (
        <TouchableOpacity
          style={styles.viewOrdersBtn}
          onPress={() => navigation.navigate('Orders')}
          activeOpacity={0.85}>
          <Text style={styles.viewOrdersBtnText}>{t('myOrders')}</Text>
        </TouchableOpacity>
      ) : null}
    </ScreenLayout>
  );
};

export default BanaLingamScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 8,
  },
  chips: {
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipOn: {
    borderColor: Colors.templeGold,
    borderWidth: 2,
    backgroundColor: '#F3E2C6',
  },
  chipText: {
    color: Colors.sacredBrown,
    fontWeight: '700',
  },
  pendingOrderBanner: {
    backgroundColor: '#FFF4E5',
    borderWidth: 1.5,
    borderColor: '#E8730C',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pendingOrderIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  pendingOrderTextCol: {
    flex: 1,
  },
  pendingOrderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8A4104',
    marginBottom: 4,
  },
  pendingOrderDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#6E3403',
  },
  pendingOrderNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A4104',
    marginTop: 6,
  },
  viewOrdersBtn: {
    marginTop: 12,
    backgroundColor: Colors.leafGreen,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOrdersBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  addressNote: {
    color: '#D32F2F',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: -6,
    marginBottom: 12,
    lineHeight: 18,
    includeFontPadding: true,
  },
  commentsInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
