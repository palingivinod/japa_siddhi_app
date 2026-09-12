import React, {useCallback, useState} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

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

const BanaLingamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
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
        const name =
          profile?.fullName ||
          stored?.fullName ||
          stored?.full_name ||
          t('devotee');
        const phone =
          profile?.mobileNumber ||
          stored?.mobileNumber ||
          stored?.mobile_number ||
          '';
        setFullName(current => current || String(name));
        setMobile(current => current || String(phone));
        setGothram(current => current || String(profile?.gothram || ''));
        setNakshatram(current => current || String(profile?.nakshatram || ''));
        setSavedAddresses(addresses);
        const latest = addresses[0] || String(profile?.address || '');
        setAddress(current => current || latest);
      };
      load();
      return () => {
        active = false;
      };
    }, [t]),
  );

  const submit = async () => {
    if (!fullName.trim() || !mobile.trim() || !address.trim()) {
      Alert.alert('Baanalingam', 'Name, mobile and address are required.');
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
    });
  };

  return (
    <ScreenLayout title="Baanalingam" showBack tab="SevaHub">
      <Text style={styles.heading}>{t('baanalingamDistribution')}</Text>
      <MenuCard
        icon="banalingam"
        title={t('sacredService')}
        subtitle={t('applyBaanalingamDelivery')}
      />
      <FormField
        label="Name"
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <FormField
        label="Mobile"
        placeholder="Mobile number"
        keyboardType="phone-pad"
        value={mobile}
        onChangeText={setMobile}
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
      <PrimaryButton title="SUBMIT" onPress={submit} />
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
});
