import React, {useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import FormField from '../common/FormField';
import PrimaryButton from '../common/PrimaryButton';
import ScreenLayout from '../common/ScreenLayout';

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
      <Text style={styles.heading}>Enter delivery details</Text>

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
        onChangeText={setMobile}
        keyboardType="phone-pad"
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
        onChangeText={setPinCode}
        keyboardType="number-pad"
      />

      <PrimaryButton
        title={saving ? 'SUBMITTING...' : 'SUBMIT DELIVERY DETAILS'}
        onPress={submit}
        disabled={saving}
      />
    </ScreenLayout>
  );
};

export default ChallengeRewardDeliveryScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 18,
  },
});
