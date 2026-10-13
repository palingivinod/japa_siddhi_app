import React, {useEffect, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import ProfileApi from '../auth/services/profileApi';
import {getStoredUser} from '../../services/session';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';
import {MOBILE_DIGITS, digitsOnly, isMobile} from '../../utils/validators';

const ChallengeRewardDeliveryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const challengeId = Number(route.params?.id || 0);
  const rewardName = String(route.params?.rewardName || 'Reward');

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const [stored, profile] = await Promise.all([
          getStoredUser(),
          ProfileApi.getProfile().catch(() => null),
        ]);
        if (!active) {
          return;
        }
        const name =
          profile?.fullName || stored?.fullName || stored?.full_name || '';
        const phone =
          profile?.mobileNumber ||
          stored?.mobileNumber ||
          stored?.mobile_number ||
          stored?.phone ||
          '';
        const addr = profile?.address || stored?.address || '';
        const cityName = profile?.cityName || stored?.cityName || '';
        const stateName = profile?.stateName || stored?.stateName || '';
        const pin =
          profile?.pinCode ||
          profile?.postalCode ||
          stored?.pinCode ||
          stored?.postalCode ||
          '';

        if (name) {
          setFullName(String(name));
        }
        if (phone) {
          setMobile(digitsOnly(String(phone)).slice(-MOBILE_DIGITS));
        }
        if (addr) {
          setAddress(String(addr));
        }
        if (cityName) {
          setCity(String(cityName));
        }
        if (stateName) {
          setState(String(stateName));
        }
        if (pin) {
          setPinCode(digitsOnly(String(pin)).slice(0, 6));
        }
      } catch {
        // User can enter details manually.
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    if (
      !fullName.trim() ||
      !mobile.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pinCode.trim()
    ) {
      Alert.alert('Required', 'Enter all delivery details.');
      return;
    }
    if (!isMobile(mobile)) {
      Alert.alert(
        'Required',
        `Enter a valid ${MOBILE_DIGITS}-digit mobile number.`,
      );
      return;
    }
    if (!challengeId) {
      Alert.alert('Reward', 'Missing challenge details.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiService.post(
        `/challenges/${challengeId}/rewards/delivery`,
        {
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pinCode: pinCode.trim(),
        },
      );
      const data = response.data?.data || {};
      navigation.replace('ChallengeRewardOrderCreated', {
        id: challengeId,
        rewardName: data.rewardName || rewardName,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
      });
    } catch (err) {
      Alert.alert(
        'Delivery',
        getApiError(err, 'Could not save delivery details.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Reward Delivery" showBack tab="JapaHub">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <Text style={styles.heading}>Enter delivery details</Text>
        <Text style={styles.hint}>
          Prefills from your profile when available. Edit any field before
          submitting.
        </Text>

        <FormField
          label="Full Name"
          placeholder="Enter here"
          value={fullName}
          onChangeText={setFullName}
        />
        <FormField
          label="Mobile Number"
          placeholder="Enter here"
          value={mobile}
          onChangeText={text =>
            setMobile(digitsOnly(text).slice(0, MOBILE_DIGITS))
          }
          keyboardType="phone-pad"
          maxLength={MOBILE_DIGITS}
        />
        <FormField
          label="Address"
          placeholder="Enter here"
          value={address}
          onChangeText={setAddress}
        />
        <FormField
          label="City"
          placeholder="Enter here"
          value={city}
          onChangeText={setCity}
        />
        <FormField
          label="State"
          placeholder="Enter here"
          value={state}
          onChangeText={setState}
        />
        <FormField
          label="PIN Code"
          placeholder="Enter here"
          value={pinCode}
          onChangeText={text => setPinCode(digitsOnly(text).slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
        />

        <PrimaryButton
          title={saving ? 'SUBMITTING...' : 'SUBMIT DELIVERY DETAILS'}
          onPress={submit}
          disabled={saving}
        />
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

export default ChallengeRewardDeliveryScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 8,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
});
