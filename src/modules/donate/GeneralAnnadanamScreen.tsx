import React, {useEffect, useState} from 'react';
import {Alert, Linking, StyleSheet, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import AnnadanamMembersSelector, {RATE_PER_PERSON} from './components/AnnadanamMembersSelector';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const PAYMENTS_URL = 'https://japasiddhi.com/payments';

const GeneralAnnadanamScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [occasion, setOccasion] = useState('');
  const [persons, setPersons] = useState(5);
  const [enabled, setEnabled] = useState(true);

  const totalAmount = persons * RATE_PER_PERSON;

  useEffect(() => {
    apiService
      .get('/annadanam/visibility')
      .then(response => setEnabled(response.data?.data?.general !== false))
      .catch(() => setEnabled(true));
  }, []);

  const continuePay = async () => {
    if (fullName.trim().length < 2) {
      Alert.alert('Required', 'Please enter devotee name.');
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!isMobile(cleanMobile) || /^0+$/.test(cleanMobile)) {
      Alert.alert('Required', `Please enter a valid ${MOBILE_DIGITS}-digit mobile number.`);
      return;
    }
    if (persons <= 0) {
      Alert.alert('Required', 'Please select or enter the number of persons.');
      return;
    }

    try {
      await Linking.openURL(PAYMENTS_URL);
    } catch {
      Alert.alert('Payment', 'Could not open payments page.');
    }
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
            placeholder={t('enterMobileNumber')}
            value={mobile}
            onChangeText={text =>
              setMobile(digitsOnly(text).slice(0, MOBILE_DIGITS))
            }
            keyboardType="phone-pad"
            maxLength={MOBILE_DIGITS}
          />
          <FormField
            label={t('occasionLabel')}
            placeholder={t('occasionPlaceholder')}
            value={occasion}
            onChangeText={setOccasion}
          />
          <AnnadanamMembersSelector
            persons={persons}
            onChangePersons={setPersons}
            title={t('selectNoOfPersons')}
          />
          <PrimaryButton
            title={persons > 0 ? `CONTINUE TO PAYMENT (₹${totalAmount.toLocaleString()})` : 'ENTER NUMBER OF PERSONS'}
            disabled={persons <= 0}
            onPress={continuePay}
          />
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
