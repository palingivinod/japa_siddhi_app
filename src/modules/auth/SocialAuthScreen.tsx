import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import OutlineButton from '../common/OutlineButton';

const SocialAuthScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const provider = String(route.params?.provider || 'Email');

  return (
    <ScreenLayout title={`Continue with ${provider}`} showBack>
      <Text style={styles.title}>Continue with {provider}</Text>
      <Text style={styles.copy}>
        {provider} login will complete in a later release. New devotees can
        create an account with email, password and mobile. Returning devotees
        sign in with email and password.
      </Text>
      <PrimaryButton
        title="CREATE ACCOUNT"
        onPress={() => navigation.navigate('CreateAccount')}
      />
      <Text style={styles.gap} />
      <OutlineButton
        title="SIGN IN WITH EMAIL + PASSWORD"
        onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
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
