import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

const GeneralAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('+91');
  const [occasion, setOccasion] = useState('');
  const [amount, setAmount] = useState('1008');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    apiService
      .get('/annadanam/visibility')
      .then(response => setEnabled(response.data?.data?.general !== false))
      .catch(() => setEnabled(true));
  }, []);

  const continuePay = () => {
    if (!fullName.trim()) {
      Alert.alert(t('tileAnnadanam'), t('pleaseEnterName'));
      return;
    }
    navigation.navigate('DonationForm', {
      kind: 'GENERAL',
      amount: Number(String(amount).replace(/[^\d]/g, '')) || 1008,
      fullName,
      mobile,
      occasion,
      itemName: t('generalAnnadanam'),
    });
  };

  return (
    <ScreenLayout title={t('generalAnnadanam')} showBack tab="SevaHub">
      {!enabled ? (
        <Text style={styles.disabled}>
          General Annadanam is currently unavailable.
        </Text>
      ) : (
        <>
          <FormField
            label={t('nameLabel')}
            placeholder={t('fullName')}
            value={fullName}
            onChangeText={setFullName}
          />
          <FormField
            label={t('mobileNumber')}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
          />
          <FormField
            label={t('occasionLabel')}
            placeholder={t('occasionPlaceholder')}
            value={occasion}
            onChangeText={setOccasion}
          />
          <FormField
            label={t('donationAmount')}
            value={amount.startsWith('₹') ? amount : `₹ ${amount}`}
            onChangeText={value => setAmount(value.replace(/[^\d]/g, ''))}
            keyboardType="numeric"
          />
          <PrimaryButton title={t('continueToPayment')} onPress={continuePay} />
        </>
      )}
    </ScreenLayout>
  );
};

export default GeneralAnnadanamScreen;

const styles = StyleSheet.create({
  disabled: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
