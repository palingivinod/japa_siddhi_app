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

const RAMAKOTI_POSTER = require('../../assets/images/ramakoti_poster.jpg');

const RamakotiBooksScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [comments, setComments] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);

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
        setSavedAddresses(addresses);
        const name = profile?.fullName || stored?.fullName || stored?.full_name || '';
        const phone =
          profile?.mobileNumber ||
          stored?.mobileNumber ||
          stored?.mobile_number ||
          stored?.phone ||
          '';
        if (name) {
          setFullName(String(name));
        }
        if (phone) {
          setMobile(digitsOnly(String(phone)).slice(-MOBILE_DIGITS));
        }

        if (route.params?.selectedAddress) {
          setAddress(route.params.selectedAddress);
          await setLatestSelectedAddress(route.params.selectedAddress);
        } else {
          const latestChosen = await getLatestSelectedAddress();
          const profileAddr = [
            String(profile?.address || stored?.address || '').trim(),
            String(profile?.region || stored?.region || '').trim(),
            String(profile?.cityName || stored?.cityName || '').trim(),
            String(profile?.stateName || stored?.stateName || '').trim(),
            String(
              profile?.postalCode ||
                (profile as any)?.pinCode ||
                stored?.postalCode ||
                stored?.pinCode ||
                '',
            )
              .replace(/\D/g, '')
              .slice(0, 6),
          ]
            .filter(Boolean)
            .join(', ');
          const latest = latestChosen || addresses[0] || profileAddr;
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
    if (!fullName.trim() || !isMobile(mobile)) {
      Alert.alert(t('ramakotiSeva'), t('baanalingamFieldsRequired'));
      return;
    }
    if (!address.trim()) {
      Alert.alert(
        t('ramakotiSeva'),
        t('flatDoorStreetAreaNote') ||
          '* Please enter flat no, door no, street and area name',
      );
      return;
    }
    await saveDeliveryAddress(address.trim());
    await setLatestSelectedAddress(address.trim());
    navigation.navigate('RamakotiBooksReview', {
      fullName: fullName.trim(),
      mobile,
      address: address.trim(),
      comments: comments.trim(),
    });
  };

  return (
    <ScreenLayout title={t('ramakotiSeva')} showBack tab="SevaHub">
      <Text style={styles.heading}>{t('ramakotiSeva')}</Text>
      <MenuCard icon="ramakoti" title={t('ramakotiSeva')} subtitle={t('ramakotiIntro')} />
      <TouchableOpacity
        style={styles.thumbWrap}
        activeOpacity={0.85}
        onPress={() => setPhotoOpen(true)}>
        <Image source={RAMAKOTI_POSTER} style={styles.thumb} resizeMode="contain" />
      </TouchableOpacity>
      <Modal
        visible={photoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoOpen(false)}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setPhotoOpen(false)}>
          <Image source={RAMAKOTI_POSTER} style={styles.large} resizeMode="contain" />
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
              navigation.navigate('AddAddress', {returnTo: 'RamakotiBooks'})
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
          fullName.trim() && isMobile(mobile) && address.trim()
            ? t('overviewBtn') || 'OVERVIEW'
            : t('enterRequiredDetails') || 'ENTER REQUIRED DETAILS'
        }
        onPress={submit}
        disabled={!fullName.trim() || !isMobile(mobile) || !address.trim()}
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
          navigation.navigate('AddAddress', {returnTo: 'RamakotiBooks'});
        }}
        onClose={() => setSavedModalVisible(false)}
      />
    </ScreenLayout>
  );
};

export default RamakotiBooksScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 14,
  },
  thumbWrap: {
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginBottom: 16,
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
