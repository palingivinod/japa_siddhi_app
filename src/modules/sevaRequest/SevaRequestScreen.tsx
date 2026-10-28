import React, {useCallback, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
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
        title={ready ? 'OVERVIEW' : 'ENTER REQUIRED DETAILS'}
        onPress={submit}
        disabled={!ready}
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
