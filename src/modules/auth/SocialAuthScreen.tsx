import React, {useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import Colors from '../../theme/colors';
import {useLanguage} from '../../i18n/LanguageContext';
import ScreenLayout from '../common/ScreenLayout';
import PrimaryButton from '../common/PrimaryButton';
import OutlineButton from '../common/OutlineButton';
import {resetAuthGate} from '../common/AuthGate';
import {
  explainGoogleSignInError,
  signInWithGoogle,
} from './services/googleAuthService';
import ENV from '../../env';
import {resetToHomeAfterAuth} from '../../navigation/goHomeAfterAuth';

const showAlertLater = (title: string, message: string) => {
  // Android Activity can be null right as Google Sign-In returns; Alert then
  // no-ops or destabilizes the resume. Wait a beat before presenting UI.
  setTimeout(() => Alert.alert(title, message), 350);
};

const SocialAuthScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useLanguage();
  const provider = String(route.params?.provider || 'Email');
  const [busy, setBusy] = useState(false);
  const providerLabel =
    provider === 'Google'
      ? t('socialGoogle')
      : provider === 'Facebook'
        ? t('socialFacebook')
        : provider;

  const continueWithGoogle = async () => {
    if (!String(ENV.GOOGLE_WEB_CLIENT_ID || '').trim()) {
      showAlertLater(
        t('googleSetupNeeded'),
        t('googleSetupMessage'),
      );
      return;
    }

    if (busy) {
      return;
    }

    // Do not flip busy until after the account picker closes — a loading
    // overlay during the native Google UI can leave Activity null on return.
    try {
      await signInWithGoogle();
      setBusy(true);
      resetAuthGate();
      setTimeout(() => {
        void resetToHomeAfterAuth(navigation);
      }, 150);
    } catch (error: any) {
      const message = explainGoogleSignInError(error);
      if (
        /cancel|cancelled|12501|SIGN_IN_CANCELLED/i.test(message) ||
        error?.code === '12501' ||
        error?.code === 'SIGN_IN_CANCELLED'
      ) {
        return;
      }
      showAlertLater(t('googleSignInTitle'), message);
    } finally {
      setBusy(false);
    }
  };

  if (provider === 'Google') {
    return (
      <ScreenLayout title={t('continueWithGoogle')} showBack>
        <Text style={styles.title}>{t('continueWithGoogle')}</Text>
        <Text style={styles.copy}>{t('googleAuthHelper')}</Text>
        {busy ? (
          <ActivityIndicator color={Colors.templeGold} style={{marginVertical: 16}} />
        ) : (
          <PrimaryButton
            title={t('continueWithGoogleBtn')}
            onPress={continueWithGoogle}
          />
        )}
        <View style={styles.gap} />
        <OutlineButton
          title={t('signInWithEmailPassword')}
          onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title={t('continueWithProvider', {provider: providerLabel})}
      showBack>
      <Text style={styles.title}>
        {t('continueWithProvider', {provider: providerLabel})}
      </Text>
      <Text style={styles.copy}>
        {t('providerAuthLaterHelper', {provider: providerLabel})}
      </Text>
      <PrimaryButton
        title={t('tryGoogleInstead')}
        onPress={() => navigation.replace('SocialAuth', {provider: 'Google'})}
      />
      <View style={styles.gap} />
      <OutlineButton
        title={t('createAccountBtn')}
        onPress={() => navigation.navigate('CreateAccount')}
      />
      <View style={styles.gap} />
      <OutlineButton
        title={t('signInWithEmailPassword')}
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
