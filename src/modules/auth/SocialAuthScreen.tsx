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
import {
  explainFacebookSignInError,
  signInWithFacebook,
} from './services/facebookAuthService';
import ENV from '../../env';
import {resetAfterSocialAuth} from '../../navigation/goHomeAfterAuth';

const showAlertLater = (title: string, message: string) => {
  // Android Activity can be null right as native sign-in returns; Alert then
  // no-ops or destabilizes the resume. Wait a beat before presenting UI.
  setTimeout(() => Alert.alert(title, message), 350);
};

const isCancelledSignIn = (error: any, message: string) =>
  /cancel|cancelled|12501|SIGN_IN_CANCELLED|USER_CANCELLED/i.test(message) ||
  error?.code === '12501' ||
  error?.code === 'SIGN_IN_CANCELLED';

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
      showAlertLater(t('googleSetupNeeded'), t('googleSetupMessage'));
      return;
    }

    if (busy) {
      return;
    }

    try {
      setBusy(true);
      const signedIn = await signInWithGoogle();
      resetAuthGate();
      setTimeout(() => {
        resetAfterSocialAuth(navigation, signedIn.user, {
          title: t('socialDetailsTitle'),
          message: t('socialDetailsMessage'),
          ok: t('ok'),
        });
      }, 150);
    } catch (error: any) {
      const message = explainGoogleSignInError(error);
      if (isCancelledSignIn(error, message)) {
        return;
      }
      showAlertLater(t('googleSignInTitle'), message);
    } finally {
      setBusy(false);
    }
  };

  const continueWithFacebook = async () => {
    if (
      !String(ENV.FACEBOOK_APP_ID || '').trim() ||
      !String(ENV.FACEBOOK_CLIENT_TOKEN || '').trim()
    ) {
      showAlertLater(t('facebookSetupNeeded'), t('facebookSetupMessage'));
      return;
    }

    if (busy) {
      return;
    }

    try {
      setBusy(true);
      const signedIn = await signInWithFacebook();
      resetAuthGate();
      setTimeout(() => {
        resetAfterSocialAuth(navigation, signedIn.user, {
          title: t('socialDetailsTitle'),
          message: t('socialDetailsMessage'),
          ok: t('ok'),
        });
      }, 150);
    } catch (error: any) {
      const message = explainFacebookSignInError(error);
      if (isCancelledSignIn(error, message)) {
        return;
      }
      showAlertLater(t('facebookSignInTitle'), message);
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
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.templeGold} />
            <Text style={styles.loadingTitle}>Signing in with Google...</Text>
            <Text style={styles.loadingSubtitle}>
              Please wait while we connect your account
            </Text>
          </View>
        ) : (
          <>
            <PrimaryButton
              title={t('continueWithGoogleBtn')}
              onPress={continueWithGoogle}
            />
            <View style={styles.gap} />
            <OutlineButton
              title={t('signInWithEmailPassword')}
              onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
            />
          </>
        )}
      </ScreenLayout>
    );
  }

  if (provider === 'Facebook') {
    return (
      <ScreenLayout title={t('continueWithFacebook')} showBack>
        <Text style={styles.title}>{t('continueWithFacebook')}</Text>
        <Text style={styles.copy}>{t('facebookAuthHelper')}</Text>
        {busy ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.templeGold} />
            <Text style={styles.loadingTitle}>Signing in with Facebook...</Text>
            <Text style={styles.loadingSubtitle}>
              Please wait while we connect your account
            </Text>
          </View>
        ) : (
          <>
            <PrimaryButton
              title={t('continueWithFacebookBtn')}
              onPress={continueWithFacebook}
            />
            <View style={styles.gap} />
            <OutlineButton
              title={t('tryGoogleInstead')}
              onPress={() =>
                navigation.replace('SocialAuth', {provider: 'Google'})
              }
            />
            <View style={styles.gap} />
            <OutlineButton
              title={t('signInWithEmailPassword')}
              onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
            />
          </>
        )}
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
  loadingBox: {
    backgroundColor: Colors.cream,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  loadingTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.sacredBrown,
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
