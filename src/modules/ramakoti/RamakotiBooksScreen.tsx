import React, {useCallback, useRef, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import MenuCard from '../common/MenuCard';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const RAMAKOTI_POSTER = require('../../assets/images/ramakoti_poster.jpg');

const RamakotiBooksScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const askedForAddress = useRef(false);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [comments, setComments] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);

  const askForProfileAddress = useCallback(() => {
    Alert.alert(t('ramakotiSeva'), t('addAddressInProfile'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('personalDetails'),
        onPress: () => navigation.navigate('PersonalDetails'),
      },
    ]);
  }, [navigation, t]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const [stored, profile] = await Promise.all([
          getStoredUser(),
          ProfileApi.getProfile().catch(() => null),
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
        const line = String(profile?.address || stored?.address || '').trim();
        const pin = String(
          profile?.postalCode ||
            profile?.pinCode ||
            stored?.postalCode ||
            stored?.pinCode ||
            '',
        )
          .replace(/\D/g, '')
          .slice(0, 6);
        const region = String(profile?.region || stored?.region || '').trim();
        const city = String(profile?.cityName || stored?.cityName || '').trim();
        const state = String(
          profile?.stateName || stored?.stateName || '',
        ).trim();
        const profileAddress = [line, region, city, state, pin]
          .filter(Boolean)
          .join(', ');
        if (name) {
          setFullName(String(name));
        }
        if (phone) {
          setMobile(digitsOnly(String(phone)).slice(-MOBILE_DIGITS));
        }
        // Always refresh from latest profile so address/pincode edits apply.
        if (profileAddress) {
          setAddress(profileAddress);
          askedForAddress.current = false;
          return;
        }
        setAddress('');
        if (!askedForAddress.current) {
          askedForAddress.current = true;
          askForProfileAddress();
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [askForProfileAddress]),
  );

  const submit = () => {
    if (!fullName.trim() || !isMobile(mobile)) {
      Alert.alert(t('ramakotiSeva'), t('baanalingamFieldsRequired'));
      return;
    }
    if (!address.trim()) {
      askForProfileAddress();
      return;
    }
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
      <FormField
        label={t('address')}
        placeholder={t('deliveryAddress')}
        value={address}
        onChangeText={setAddress}
      />
      <Text style={styles.addressNote}>* {t('addressDetailedHint')}</Text>
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
            ? 'OVERVIEW'
            : 'ENTER REQUIRED DETAILS'
        }
        onPress={submit}
        disabled={!fullName.trim() || !isMobile(mobile) || !address.trim()}
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
