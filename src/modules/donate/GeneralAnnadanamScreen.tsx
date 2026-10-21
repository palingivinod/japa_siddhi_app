import React, {useCallback, useEffect, useState} from 'react';
import {Alert, Linking, StyleSheet, Text} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {useLanguage} from '../../i18n/LanguageContext';
import apiService from '../../services/apiService';
import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
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
  const [persons, setPersons] = useState(0);
  const [enabled, setEnabled] = useState(true);

  const totalAmount = persons * RATE_PER_PERSON;
  const cleanMobileReady = mobile.replace(/\D/g, '');
  const detailsReady =
    fullName.trim().length >= 2 &&
    isMobile(cleanMobileReady) &&
    !/^0+$/.test(cleanMobileReady) &&
    persons > 0;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadProfile = async () => {
        try {
          const [stored, profile] = await Promise.all([
            getStoredUser(),
            ProfileApi.getProfile().catch(() => null),
          ]);
          if (!active) return;
          const name = profile?.fullName || stored?.fullName || stored?.full_name || '';
          const phone = profile?.mobileNumber || stored?.mobileNumber || stored?.mobile_number || stored?.phone || '';

          setFullName(current => current || String(name));
          setMobile(current => current || digitsOnly(String(phone)).slice(-MOBILE_DIGITS));
        } catch {
          // ignore profile load error
        }
      };

      loadProfile();
      return () => {
        active = false;
      };
    }, []),
  );

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

    Alert.alert(
      t('requestSubmittedTitle'),
      t('requestSubmittedMessage'),
      [
        {
          text: 'OK',
          onPress: () => {
            Linking.openURL(PAYMENTS_URL).catch(() => {
              Alert.alert('Payment', 'Could not open payments page.');
            });
          },
        },
      ],
      {cancelable: false},
    );
  };

  return (
    <ScreenLayout title={t('generalAnnadanam')} showBack tab="SevaHub">
      {!enabled ? (
        <Text style={styles.disabled}>
          General Anna Santharpana is currently unavailable.
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
            title={
              detailsReady
                ? `CONTINUE TO PAYMENT (₹${totalAmount.toLocaleString('en-IN')})`
                : 'ENTER REQUIRED DETAILS'
            }
            disabled={!detailsReady}
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
