import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import OutlineButton from '../common/OutlineButton';
import apiService from '../../services/apiService';

const SocialAuthScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const provider = String(route.params?.provider || 'Email');

  const continueSignup = async () => {
    try {
      await apiService.post('/auth/social', {provider: provider.toLowerCase()});
    } catch {
      // Social login is a placeholder until provider SDKs are connected.
    }
    navigation.navigate('SignupPersonal', {provider});
  };

  return (
    <ScreenLayout title={`Continue with ${provider}`} showBack>
      <Text style={styles.title}>Continue with {provider}</Text>
      <Text style={styles.copy}>
        {provider} login will complete in a later release. New devotees can
        create a profile now. Returning devotees can use mobile number and a
        4-digit email OTP.
      </Text>
      <PrimaryButton title="CREATE PROFILE" onPress={continueSignup} />
      <Text style={styles.gap} />
      <OutlineButton
        title="USE MOBILE + EMAIL OTP"
        onPress={() => navigation.navigate('Login')}
      />
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
  gap: {height: 12},
});
