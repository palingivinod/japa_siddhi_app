import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {shortMonthDayYear} from '../../i18n/calendar';
import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
import apiService from '../../services/apiService';
import {playIntroVideo} from '../../services/introVideos';
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
import SavedAddressSelectorModal from '../../components/SavedAddressSelectorModal';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';
import {
  addressHasValidPin,
  parseDeliveryAddress,
} from '../../utils/deliveryAddress';
import {ensureAddressHasPinOrEdit} from '../../utils/promptAddressPin';
import {sevaRequestFromRoute} from './sevaRequestConfig';

const BIRAVA_PHOTOS = [
  require('../../assets/images/birava_pendant.jpg'),
  require('../../assets/images/birava_pendant_back.jpg'),
];
const SHIVAKOTI_PHOTOS = [require('../../assets/images/shivakoti_icon.png')];
const POOJA_BHASMAM_POSTER = require('../../assets/images/gou_maya_bhasma_icon.jpg');
/** Bundled in android/app/src/main/res/raw/pooja_bhasmam.mp4 */
const POOJA_BHASMAM_ANDROID_URI =
  'android.resource://com.japasiddhi/raw/pooja_bhasmam';

const photosForRequest = (kind: string) => {
  if (kind === 'BIRAVA_PENDANT') return BIRAVA_PHOTOS;
  if (kind === 'SHIVAKOTI_BOOKS') return SHIVAKOTI_PHOTOS;
  return [];
};

const SevaRequestScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const request = sevaRequestFromRoute(String(route.name || ''));
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [comments, setComments] = useState('');
  const [largePhoto, setLargePhoto] = useState<number | null>(null);
  const [videoOpening, setVideoOpening] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [reorderCooldown, setReorderCooldown] = useState<{
    orderedOnIso: string;
    availableOnIso: string;
  } | null>(null);
  const [gatesReady, setGatesReady] = useState(false);
  const [gatesError, setGatesError] = useState(false);
  const [gatesReloadKey, setGatesReloadKey] = useState(0);
  const photos = photosForRequest(request.kind);
  const pendingTitle =
    t(request.pendingTitleKey) ||
    t('banaLingamPendingOrderTitle') ||
    'Order In Review';
  const pendingMessage = t(request.pendingMessageKey) || pendingTitle;
  const itemLabel = t(request.titleKey) || 'this item';
  const cooldownTitle =
    t('bhasmamReorderCooldownTitle') || 'Please wait 30 days';
  const cooldownOrderedOn = reorderCooldown
    ? shortMonthDayYear(t, reorderCooldown.orderedOnIso)
    : '';
  const cooldownAvailableOn = reorderCooldown
    ? shortMonthDayYear(t, reorderCooldown.availableOnIso)
    : '';
  const cooldownMessage = reorderCooldown
    ? t('bhasmamReorderCooldownMessage', {
        item: itemLabel,
        orderedOn: cooldownOrderedOn,
        availableOn: cooldownAvailableOn,
      }) ||
      `You ordered ${itemLabel} on ${cooldownOrderedOn}. You can order again after 30 days, on ${cooldownAvailableOn}.`
    : '';

  const openPoojaVideo = async () => {
    if (videoOpening) {
      return;
    }
    setVideoOpening(true);
    try {
      if (Platform.OS !== 'android') {
        Alert.alert(
          t(request.titleKey),
          t('introVideoPlayError') || 'Could not play this video.',
        );
        return;
      }
      const ok = await playIntroVideo(POOJA_BHASMAM_ANDROID_URI);
      if (!ok) {
        Alert.alert(
          t(request.titleKey),
          t('introVideoPlayError') || 'Could not play this video.',
        );
      }
    } finally {
      setVideoOpening(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setGatesReady(false);
        setGatesError(false);
        const [stored, profile, addresses, ordersSettled] = await Promise.all([
          getStoredUser(),
          ProfileApi.getProfile().catch(() => null),
          loadSavedAddresses(),
          apiService
            .get('/orders')
            .then(res => ({ok: true as const, res}))
            .catch(() => ({ok: false as const, res: null})),
        ]);
        if (!active) {
          return;
        }

        if (!ordersSettled.ok) {
          setGatesError(true);
          setHasActiveOrder(false);
          setActiveOrder(null);
          setReorderCooldown(null);
          setGatesReady(true);
          Alert.alert(
            t(request.titleKey),
            t('couldNotLoadOrders') ||
              'Could not verify your existing orders. Please try again.',
            [{text: t('ok') || 'OK'}],
          );
        } else {
          const {ordersFromApiResponse, findOpenProductOrder} = await import(
            '../../utils/openProductOrderGate'
          );
          const allOrders = ordersFromApiResponse(ordersSettled.res);
          // Any undelivered product order blocks every new product order.
          const undeliveredOrder = findOpenProductOrder(allOrders);

          if (undeliveredOrder) {
            setHasActiveOrder(true);
            setActiveOrder(undeliveredOrder);
            setReorderCooldown(null);
            Alert.alert(
              t('openOrderBlockTitle') || pendingTitle,
              t('openOrderBlockMessage') || pendingMessage,
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
          } else {
            setHasActiveOrder(false);
            setActiveOrder(null);

            const {findBhasmamReorderCooldown, isBhasmamCooldownKind} =
              await import('../../utils/bhasmamReorderCooldown');
            if (isBhasmamCooldownKind(request.kind)) {
              const formatDay = (iso: string) => shortMonthDayYear(t, iso);
              const cooldown = findBhasmamReorderCooldown(
                allOrders,
                request.matchOrder,
                new Date(),
                formatDay,
              );
              if (cooldown) {
                setReorderCooldown({
                  orderedOnIso: cooldown.orderedOnIso,
                  availableOnIso: cooldown.availableOnIso,
                });
                const label = t(request.titleKey) || 'this item';
                const orderedOn = cooldown.orderedOnLabel;
                const availableOn = cooldown.availableOnLabel;
                Alert.alert(
                  t('bhasmamReorderCooldownTitle') || 'Please wait 30 days',
                  t('bhasmamReorderCooldownMessage', {
                    item: label,
                    orderedOn,
                    availableOn,
                  }) ||
                    `You ordered ${label} on ${orderedOn}. You can order again after 30 days, on ${availableOn}.`,
                  [{text: t('ok') || 'OK'}],
                );
              } else {
                setReorderCooldown(null);
              }
            } else {
              setReorderCooldown(null);
            }
          }
          setGatesReady(true);
        }

        const name = profile?.fullName || stored?.fullName || stored?.full_name || '';
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
        setSavedAddresses(addresses);
        const latestChosen = await getLatestSelectedAddress();
        const {pickPrefillAddress} = await import('../../utils/deliveryAddress');
        const prefill = pickPrefillAddress({
          selectedAddress: route.params?.selectedAddress,
          profile,
          latestChosen,
          savedAddresses: addresses,
        });
        if (route.params?.selectedAddress) {
          await setLatestSelectedAddress(route.params.selectedAddress);
        }
        if (prefill) {
          setAddress(current =>
            current && addressHasValidPin(current) ? current : prefill,
          );
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [
      route.params?.selectedAddress,
      request.kind,
      request.matchOrder,
      t,
      gatesReloadKey,
    ]),
  );

  const submit = async () => {
    if (gatesError) {
      setGatesReloadKey(k => k + 1);
      return;
    }
    if (!gatesReady) {
      return;
    }
    if (hasActiveOrder) {
      Alert.alert(
        t('openOrderBlockTitle') || pendingTitle,
        t('openOrderBlockMessage') || pendingMessage,
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
      return;
    }
    if (reorderCooldown) {
      Alert.alert(cooldownTitle, cooldownMessage, [
        {text: t('ok') || 'OK'},
      ]);
      return;
    }
    if (!fullName.trim() || !mobile.trim() || !address.trim()) {
      Alert.alert(t(request.titleKey), t('baanalingamFieldsRequired'));
      return;
    }
    if (!isMobile(mobile)) {
      Alert.alert(
        t(request.titleKey),
        t('enterValidMobileDigits', {digits: String(MOBILE_DIGITS)}),
      );
      return;
    }
    if (
      !ensureAddressHasPinOrEdit(address, {
        t,
        navigate: navigation.navigate,
        returnTo: request.formRoute,
      })
    ) {
      return;
    }
    const parsed = parseDeliveryAddress(address.trim());
    const nextAddresses = await saveDeliveryAddress(address);
    await setLatestSelectedAddress(address.trim());
    setSavedAddresses(nextAddresses);
    navigation.navigate(request.reviewRoute, {
      fullName,
      mobile,
      address: address.trim(),
      city: parsed.city,
      state: parsed.state,
      pinCode: parsed.pinCode,
      comments: comments.trim(),
    });
  };

  const ready = Boolean(
    gatesReady &&
      !gatesError &&
      fullName.trim() &&
      isMobile(mobile) &&
      address.trim() &&
      !hasActiveOrder &&
      !reorderCooldown,
  );

  return (
    <ScreenLayout title={t(request.titleKey)} showBack tab="SevaHub">
      <Text style={styles.heading}>{t(request.titleKey)}</Text>
      <MenuCard icon={request.icon} title={t('sacredService')} subtitle={t(request.detailKey)} />
      {hasActiveOrder ? (
        <View style={styles.pendingOrderBanner}>
          <Text style={styles.pendingOrderIcon}>⏳</Text>
          <View style={styles.pendingOrderTextCol}>
            <Text style={styles.pendingOrderTitle}>{pendingTitle}</Text>
            <Text style={styles.pendingOrderDesc}>{pendingMessage}</Text>
            {activeOrder?.orderNumber ? (
              <Text style={styles.pendingOrderNum}>
                {t('orderDetails') || 'Order Details'}: {activeOrder.orderNumber}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      {reorderCooldown && !hasActiveOrder ? (
        <View style={styles.pendingOrderBanner}>
          <Text style={styles.pendingOrderIcon}>⏳</Text>
          <View style={styles.pendingOrderTextCol}>
            <Text style={styles.pendingOrderTitle}>{cooldownTitle}</Text>
            <Text style={styles.pendingOrderDesc}>{cooldownMessage}</Text>
          </View>
        </View>
      ) : null}
      {request.showVideo ? (
        <TouchableOpacity
          style={styles.videoThumbWrap}
          activeOpacity={0.85}
          onPress={() => void openPoojaVideo()}
          disabled={videoOpening}>
          <Image
            source={POOJA_BHASMAM_POSTER}
            style={styles.videoThumb}
            resizeMode="cover"
          />
          <View style={styles.videoPlayOverlay}>
            {videoOpening ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.videoPlayIcon}>▶</Text>
            )}
            <Text style={styles.videoPlayLabel}>
              {videoOpening
                ? t('loading') || 'Opening…'
                : t('playVideo') || 'Tap to play video'}
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}
      {request.showPhotos && photos.length > 0 ? (
        <View style={styles.photos}>
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              style={styles.thumbWrap}
              activeOpacity={0.85}
              onPress={() => setLargePhoto(photo)}>
              <Image source={photo} style={styles.thumb} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <Modal
        visible={largePhoto != null}
        transparent
        animationType="fade"
        onRequestClose={() => setLargePhoto(null)}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setLargePhoto(null)}>
          {largePhoto != null ? (
            <Image source={largePhoto} style={styles.large} resizeMode="contain" />
          ) : null}
        </TouchableOpacity>
      </Modal>
      {request.registerNoteKey ? (
        <Text style={styles.registerNote}>{t(request.registerNoteKey)}</Text>
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
              navigation.navigate('AddAddress', {returnTo: request.formRoute})
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
          multiline
          textAlignVertical="top"
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
        label={t('comments')}
        placeholder={t('generalCommentsPlaceholder')}
        value={comments}
        onChangeText={setComments}
        maxLength={1000}
        multiline
        numberOfLines={3}
        style={styles.commentsInput}
      />
      {hasActiveOrder || reorderCooldown ? (
        <TouchableOpacity
          style={styles.viewOrdersBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Orders')}>
          <Text style={styles.viewOrdersBtnText}>📦 {t('myOrders') || 'My Orders'}</Text>
        </TouchableOpacity>
      ) : (
        <PrimaryButton
          title={
            !gatesReady
              ? t('loading') || 'Loading…'
              : gatesError
                ? t('tryAgain') || 'TRY AGAIN'
                : ready
                  ? t('overviewBtn') || 'OVERVIEW'
                  : t('enterRequiredDetails') || 'ENTER REQUIRED DETAILS'
          }
          onPress={submit}
          disabled={!ready && !gatesError}
        />
      )}
      <SavedAddressSelectorModal
        visible={savedModalVisible}
        addresses={savedAddresses}
        selectedAddress={address}
        onSelect={async addr => {
          if (
            !ensureAddressHasPinOrEdit(addr, {
              t,
              navigate: navigation.navigate,
              returnTo: request.formRoute,
            })
          ) {
            return;
          }
          setAddress(addr);
          await setLatestSelectedAddress(addr);
        }}
        onEdit={addr => {
          navigation.navigate('AddAddress', {
            returnTo: request.formRoute,
            editAddress: addr,
          });
        }}
        onAddNew={() => {
          navigation.navigate('AddAddress', {returnTo: request.formRoute});
        }}
        onClose={() => setSavedModalVisible(false)}
      />
    </ScreenLayout>
  );
};

export default SevaRequestScreen;

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
  photos: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  videoThumbWrap: {
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginBottom: 16,
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  videoPlayIcon: {
    color: Colors.white,
    fontSize: 34,
    fontWeight: '800',
  },
  videoPlayLabel: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  large: {
    width: '100%',
    height: '78%',
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
    minHeight: 110,
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
  registerNote: {
    color: '#8A4104',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 12,
    backgroundColor: '#FFF4E5',
    borderWidth: 1,
    borderColor: '#E8C48A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    marginBottom: 14,
    lineHeight: 18,
    includeFontPadding: true,
  },
  commentsInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pendingOrderBanner: {
    backgroundColor: '#FFF4E5',
    borderWidth: 1.5,
    borderColor: '#E8730C',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
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
    color: '#9A3412',
    marginBottom: 4,
  },
  pendingOrderDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#7C2D12',
  },
  pendingOrderNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
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
    letterSpacing: 0.5,
  },
});
