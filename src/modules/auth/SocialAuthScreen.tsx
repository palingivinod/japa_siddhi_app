import React, {useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import OutlineButton from '../common/OutlineButton';
import {resetAuthGate} from '../common/AuthGate';
import {signInWithGoogle} from './services/googleAuthService';
import ENV from '../../env';

const SocialAuthScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const provider = String(route.params?.provider || 'Email');
  const [busy, setBusy] = useState(false);

  const continueWithGoogle = async () => {
    if (!String(ENV.GOOGLE_WEB_CLIENT_ID || '').trim()) {
      Alert.alert(
        'Google setup needed',
        'Add your Firebase Web Client ID to src/env.ts as GOOGLE_WEB_CLIENT_ID, enable Google sign-in in Firebase, add your Android SHA-1, then download a fresh google-services.json.',
      );
      return;
    }

    setBusy(true);
    try {
      const result = await signInWithGoogle();
      resetAuthGate();
      const incomplete =
        !result.user?.profileCompleted ||
        Number(result.user?.profileCompleted) === 0 ||
        result.isNewUser;
      navigation.reset({
        index: 0,
        routes: [
          {
            name: incomplete ? 'SignupPersonal' : 'Home',
          },
        ],
      });
    } catch (error: any) {
      const message = String(error?.message || 'Google sign-in failed.');
      if (/cancel|cancelled|12501/i.test(message)) {
        return;
      }
      Alert.alert('Google sign-in', message);
    } finally {
      setBusy(false);
    }
  };

  if (provider === 'Google') {
    return (
      <ScreenLayout title="Continue with Google" showBack>
        <Text style={styles.title}>Continue with Google</Text>
        <Text style={styles.copy}>
          Sign in with your Google account. New devotees finish personal details
          next; returning devotees go straight to Home.
        </Text>
        {busy ? (
          <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 16}} />
        ) : (
          <PrimaryButton title="CONTINUE WITH GOOGLE" onPress={continueWithGoogle} />
        )}
        <View style={styles.gap} />
        <OutlineButton
          title="SIGN IN WITH EMAIL + PASSWORD"
          onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={`Continue with ${provider}`} showBack>
      <Text style={styles.title}>Continue with {provider}</Text>
      <Text style={styles.copy}>
        {provider} login will complete in a later release. Use Google, or create
        an account with email and password.
      </Text>
      <PrimaryButton
        title="TRY GOOGLE INSTEAD"
        onPress={() => navigation.replace('SocialAuth', {provider: 'Google'})}
      />
      <View style={styles.gap} />
      <OutlineButton
        title="CREATE ACCOUNT"
        onPress={() => navigation.navigate('CreateAccount')}
      />
      <View style={styles.gap} />
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
