import React, {useCallback, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
import apiService from '../../services/apiService';
import {
  getLatestSelectedAddress,
  loadSavedAddresses,
  saveDeliveryAddress,
  setLatestSelectedAddress,
} from '../../services/savedAddresses';
import {getStoredUser} from '../../services/session';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import SelectField from '../common/SelectField';
import SavedAddressSelectorModal from '../../components/SavedAddressSelectorModal';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';
import {
  addressHasValidPin,
  parseDeliveryAddress,
} from '../../utils/deliveryAddress';

const BanaLingamScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
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
          const num = String(ord.orderNumber || '').toUpperCase();
          const isBana =
            type === 'BANA_LINGAM' ||
            name.includes('baanalingam') ||
            name.includes('banalingam') ||
            num.startsWith('BL-') ||
            num.startsWith('#BL-');
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
        if (route.params?.selectedAddress) {
          setAddress(route.params.selectedAddress);
          await setLatestSelectedAddress(route.params.selectedAddress);
        } else {
          const latestChosen = await getLatestSelectedAddress();
          const candidates = [latestChosen, addresses[0]].filter(Boolean) as string[];
          const withPin = candidates.find(addressHasValidPin);
          if (withPin) {
            setAddress(current => current || withPin);
          }
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [route.params?.selectedAddress]),
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
    if (!addressHasValidPin(address)) {
      Alert.alert(
        t('pinCode') || 'PIN Code',
        t('pinCodeMandatory') || 'PIN code is mandatory (6 digits)',
        [
          {
            text: t('addNewAddress') || 'Add Address',
            onPress: () =>
              navigation.navigate('AddAddress', {returnTo: 'BanaLingam'}),
          },
          {text: t('ok') || 'OK', style: 'cancel'},
        ],
      );
      return;
    }
    const parsed = parseDeliveryAddress(address.trim());
    const nextAddresses = await saveDeliveryAddress(address);
    await setLatestSelectedAddress(address.trim());
    setSavedAddresses(nextAddresses);
    navigation.navigate('BanaLingamReview', {
      fullName,
      mobile,
      address: address.trim(),
      city: parsed.city,
      state: parsed.state,
      pinCode: parsed.pinCode,
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
      <View style={styles.deliverySection}>
        <Text style={styles.deliveryLabel}>{t('deliveryAddress')}</Text>

        <View style={styles.addressBtnRow}>
          <TouchableOpacity
            style={styles.savedAddressesBtn}
            activeOpacity={0.8}
            onPress={() => setSavedModalVisible(true)}>
            <Text
              style={styles.savedAddressesBtnText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}>
              {t('savedAddresses') || 'Saved Addresses'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addNewAddrBtn}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('AddAddress', {returnTo: 'BanaLingam'})
            }>
            <Text
              style={styles.addNewAddrBtnText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}>
              ＋ {t('addNewAddress') || 'Add New Address'}
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder={t('deliveryAddress')}
          placeholderTextColor={Colors.placeholder}
          style={styles.deliveryInput}
          value={address}
          onChangeText={text => {
            setAddress(text);
            setLatestSelectedAddress(text);
          }}
        />
        <Text style={styles.addressRedNote}>
          {t('flatDoorStreetAreaNote')}
        </Text>
      </View>
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
            : fullName.trim() &&
                isMobile(mobile) &&
                address.trim() &&
                addressHasValidPin(address) &&
                purpose
              ? t('overviewBtn') || 'OVERVIEW'
              : t('enterRequiredDetails') || 'ENTER REQUIRED DETAILS'
        }
        onPress={submit}
        disabled={
          hasActiveOrder ||
          !fullName.trim() ||
          !isMobile(mobile) ||
          !address.trim() ||
          !addressHasValidPin(address) ||
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

      <SavedAddressSelectorModal
        visible={savedModalVisible}
        addresses={savedAddresses}
        selectedAddress={address}
        onSelect={async addr => {
          if (!addressHasValidPin(addr)) {
            Alert.alert(
              t('pinCode') || 'PIN Code',
              t('pinCodeMandatory') || 'PIN code is mandatory (6 digits)',
              [
                {
                  text: t('addNewAddress') || 'Add Address',
                  onPress: () =>
                    navigation.navigate('AddAddress', {returnTo: 'BanaLingam'}),
                },
                {text: t('ok') || 'OK', style: 'cancel'},
              ],
            );
            return;
          }
          setAddress(addr);
          await setLatestSelectedAddress(addr);
        }}
        onAddNew={() => {
          navigation.navigate('AddAddress', {returnTo: 'BanaLingam'});
        }}
        onClose={() => setSavedModalVisible(false)}
      />
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
  deliverySection: {
    marginBottom: 14,
  },
  deliveryLabel: {
    color: Colors.leafGreen,
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
    paddingBottom: 2,
  },
  deliveryInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 52,
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  addressBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  savedAddressesBtn: {
    flex: 1.5,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8EE',
    borderWidth: 1.2,
    borderColor: Colors.templeGold,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  savedAddressesBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  addNewAddrBtn: {
    flex: 1,
    minHeight: 42,
    backgroundColor: Colors.leafGreen,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewAddrBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  addressRedNote: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '700',
    marginTop: -8,
    marginBottom: 14,
    lineHeight: 17,
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
