import React, {useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
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
import ProfileApi from './services/profileApi';
import {getValidSession, saveSession} from '../../services/session';
import {resetToHomeAfterAuth} from '../../navigation/goHomeAfterAuth';
import AuthLoadingOverlay, {
  waitForLoadingPaint,
} from './components/AuthLoadingOverlay';
import GoogleCompleteDetailsModal, {
  googleAccountNeedsDetails,
  GoogleDetailsPayload,
} from './components/GoogleCompleteDetailsModal';

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
  const [showGoogleDetailsModal, setShowGoogleDetailsModal] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleSaving, setGoogleSaving] = useState(false);
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
      await waitForLoadingPaint();
      const signedIn = await signInWithGoogle();
      const user = signedIn.user || {};
      resetAuthGate();

      if (!googleAccountNeedsDetails(user)) {
        setTimeout(() => resetToHomeAfterAuth(navigation), 150);
        return;
      }

      setGoogleUser(user);
      setShowGoogleDetailsModal(true);
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
      await waitForLoadingPaint();
      const signedIn = await signInWithFacebook();
      const user = signedIn.user || {};
      resetAuthGate();

      // Same required fields as Google for social first-time accounts.
      if (!googleAccountNeedsDetails(user)) {
        setTimeout(() => resetToHomeAfterAuth(navigation), 150);
        return;
      }

      setGoogleUser(user);
      setShowGoogleDetailsModal(true);
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

  const submitGoogleDetails = async (payload: GoogleDetailsPayload) => {
    setGoogleSaving(true);
    try {
      const updated = await ProfileApi.updateProfile({
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        mobileCountryCode: payload.mobileCountryCode,
        mobileNumber: payload.mobileNumber,
      });
      const session = await getValidSession();
      if (session.token) {
        await saveSession(session.token, {
          ...(session.user || {}),
          ...(updated || {}),
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender,
          mobileCountryCode: payload.mobileCountryCode,
          mobileNumber: payload.mobileNumber,
        });
      }
      setShowGoogleDetailsModal(false);
      resetAuthGate();
      await resetToHomeAfterAuth(navigation);
    } catch (error: any) {
      Alert.alert(
        (t as any)('updateFailedTitle') || 'Error',
        error?.response?.data?.message || 'Could not save details',
      );
    } finally {
      setGoogleSaving(false);
    }
  };

  const detailsModal = (
    <GoogleCompleteDetailsModal
      visible={showGoogleDetailsModal}
      saving={googleSaving}
      initialUser={googleUser}
      onSubmit={submitGoogleDetails}
    />
  );

  if (provider === 'Google') {
    return (
      <ScreenLayout title={t('continueWithGoogle')} showBack>
        <AuthLoadingOverlay
          visible={busy}
          title={t('loggingIn') || 'Signing in...'}
          subtitle="Connecting your Google account"
        />
        <Text style={styles.title}>{t('continueWithGoogle')}</Text>
        <Text style={styles.copy}>{t('googleAuthHelper')}</Text>
        <PrimaryButton
          title={t('continueWithGoogleBtn')}
          onPress={continueWithGoogle}
          disabled={busy}
        />
        <View style={styles.gap} />
        <OutlineButton
          title={t('signInWithEmailPassword')}
          onPress={() => navigation.navigate('Login', {forceLoginForm: true})}
        />
        {detailsModal}
      </ScreenLayout>
    );
  }

  if (provider === 'Facebook') {
    return (
      <ScreenLayout title={t('continueWithFacebook')} showBack>
        <AuthLoadingOverlay
          visible={busy}
          title={t('loggingIn') || 'Signing in...'}
          subtitle="Connecting your Facebook account"
        />
        <Text style={styles.title}>{t('continueWithFacebook')}</Text>
        <Text style={styles.copy}>{t('facebookAuthHelper')}</Text>
        <PrimaryButton
          title={t('continueWithFacebookBtn')}
          onPress={continueWithFacebook}
          disabled={busy}
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
        {detailsModal}
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
      {detailsModal}
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
