import React, {useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import OutlineButton from '../common/OutlineButton';
import {resetAuthGate} from '../common/AuthGate';
import {
  explainGoogleSignInError,
  signInWithGoogle,
} from './services/googleAuthService';
import ENV from '../../env';

const showAlertLater = (title: string, message: string) => {
  // Android Activity can be null right as Google Sign-In returns; Alert then
  // no-ops or destabilizes the resume. Wait a beat before presenting UI.
  setTimeout(() => Alert.alert(title, message), 350);
};

const SocialAuthScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const provider = String(route.params?.provider || 'Email');
  const [busy, setBusy] = useState(false);

  const continueWithGoogle = async () => {
    if (!String(ENV.GOOGLE_WEB_CLIENT_ID || '').trim()) {
      showAlertLater(
        'Google setup needed',
        'Add your Firebase Web Client ID to src/env.ts as GOOGLE_WEB_CLIENT_ID, enable Google sign-in in Firebase, add your Android SHA-1, then download a fresh google-services.json.',
      );
      return;
    }

    if (busy) {
      return;
    }

    // Do not flip busy until after the account picker closes — a loading
    // overlay during the native Google UI can leave Activity null on return.
    try {
      const result = await signInWithGoogle();
      setBusy(true);
      resetAuthGate();
      const incomplete =
        !result.user?.profileCompleted ||
        Number(result.user?.profileCompleted) === 0 ||
        result.isNewUser;
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: incomplete ? 'SignupPersonal' : 'Home',
              params: incomplete
                ? {
                    email: result.user?.email,
                    fullName: result.user?.fullName,
                    mobileCountryCode: result.user?.mobileCountryCode,
                    mobileNumber: result.user?.mobileNumber,
                  }
                : undefined,
            },
          ],
        });
      }, 200);
    } catch (error: any) {
      const message = explainGoogleSignInError(error);
      if (
        /cancel|cancelled|12501|SIGN_IN_CANCELLED/i.test(message) ||
        error?.code === '12501' ||
        error?.code === 'SIGN_IN_CANCELLED'
      ) {
        return;
      }
      showAlertLater('Google sign-in', message);
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
