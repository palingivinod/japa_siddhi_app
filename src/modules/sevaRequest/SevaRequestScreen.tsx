import React, {useCallback, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
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
import {sevaRequestFromRoute} from './sevaRequestConfig';

const BIRAVA_PHOTOS = [
  require('../../assets/images/birava_pendant.jpg'),
  require('../../assets/images/birava_pendant_back.jpg'),
];

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
  const [gothram, setGothram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [comments, setComments] = useState('');
  const [largePhoto, setLargePhoto] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const [stored, profile, addresses] = await Promise.all([
          getStoredUser(),
          ProfileApi.getProfile().catch(() => null),
          loadSavedAddresses(),
        ]);
        if (!active) {
          return;
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
        if (profile?.gothram || stored?.gothram) {
          setGothram(current => current || String(profile?.gothram || stored?.gothram || ''));
        }
        if (profile?.nakshatram || stored?.nakshatram) {
          setNakshatram(
            current => current || String(profile?.nakshatram || stored?.nakshatram || ''),
          );
        }
        setSavedAddresses(addresses);
        if (route.params?.selectedAddress) {
          setAddress(route.params.selectedAddress);
          await setLatestSelectedAddress(route.params.selectedAddress);
        } else {
          const latestChosen = await getLatestSelectedAddress();
          const latest =
            latestChosen ||
            addresses[0] ||
            String(profile?.address || stored?.address || '');
          if (latest) {
            setAddress(current => current || latest);
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
    const nextAddresses = await saveDeliveryAddress(address);
    await setLatestSelectedAddress(address.trim());
    setSavedAddresses(nextAddresses);
    navigation.navigate(request.reviewRoute, {
      fullName,
      mobile,
      address: address.trim(),
      gothram,
      nakshatram,
      comments: comments.trim(),
    });
  };

  const ready = Boolean(fullName.trim() && isMobile(mobile) && address.trim());

  return (
    <ScreenLayout title={t(request.titleKey)} showBack tab="SevaHub">
      <Text style={styles.heading}>{t(request.titleKey)}</Text>
      <MenuCard icon={request.icon} title={t('sacredService')} subtitle={t(request.detailKey)} />
      {request.kind === 'BIRAVA_PENDANT' ? (
        <View style={styles.photos}>
          {BIRAVA_PHOTOS.map((photo, index) => (
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
          onChangeText={text => {
            setAddress(text);
            setLatestSelectedAddress(text);
          }}
        />
        <Text style={styles.addressRedNote}>
          {t('flatDoorStreetAreaNote')}
        </Text>
      </View>
      <FormField label="Gothram" placeholder="Optional" value={gothram} onChangeText={setGothram} />
      <FormField
        label="Nakshatram"
        placeholder="Optional"
        value={nakshatram}
        onChangeText={setNakshatram}
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
          ready
            ? t('overviewBtn') || 'OVERVIEW'
            : t('enterRequiredDetails') || 'ENTER REQUIRED DETAILS'
        }
        onPress={submit}
        disabled={!ready}
      />
      <SavedAddressSelectorModal
        visible={savedModalVisible}
        addresses={savedAddresses}
        selectedAddress={address}
        onSelect={async addr => {
          setAddress(addr);
          await setLatestSelectedAddress(addr);
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
    marginBottom: 14,
    lineHeight: 18,
    includeFontPadding: true,
  },
  commentsInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
