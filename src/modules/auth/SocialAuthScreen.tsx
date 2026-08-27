import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import apiService from '../../services/apiService';

const SocialAuthScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const provider = String(route.params?.provider || 'Email');

  const continueLogin = async () => {
    try {
      await apiService.post('/auth/social', {provider: provider.toLowerCase()});
    } catch {
      undefined;
    }
    navigation.navigate('Login');
  };

  return (
    <ScreenLayout title={`Continue with ${provider}`} showBack>
      <Text style={styles.title}>Continue with {provider}</Text>
      <Text style={styles.copy}>
        A 4-digit OTP is sent to your email. Use your mobile number and email on
        the login screen to sign in or create an account.
      </Text>
      <PrimaryButton title="USE EMAIL OTP" onPress={continueLogin} />
    </ScreenLayout>
  );
};

export default SocialAuthScreen;

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 12,
  },
  copy: {
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
});
