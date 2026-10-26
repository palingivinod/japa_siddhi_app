import React, {useCallback, useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
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
    });
  };

  const ready = Boolean(fullName.trim() && isMobile(mobile) && address.trim());

  return (
    <ScreenLayout title={t(request.titleKey)} showBack tab="SevaHub">
      <Text style={styles.heading}>{t(request.titleKey)}</Text>
      <MenuCard icon={request.icon} title={t('sacredService')} subtitle={t(request.detailKey)} />
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
      <FormField label="Gothram" placeholder="Optional" value={gothram} onChangeText={setGothram} />
      <FormField
        label="Nakshatram"
        placeholder="Optional"
        value={nakshatram}
        onChangeText={setNakshatram}
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
});
