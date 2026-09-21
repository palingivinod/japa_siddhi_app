import auth from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {Platform} from 'react-native';

import ENV from '../../../env';
import apiService from '../../../services/apiService';
import {saveSession} from '../../../services/session';

let configured = false;

const ensureGoogleConfigured = () => {
  const webClientId = String(ENV.GOOGLE_WEB_CLIENT_ID || '').trim();
  if (!webClientId) {
    throw new Error(
      'Google Web Client ID is missing. Add GOOGLE_WEB_CLIENT_ID in src/env.ts from Firebase Console (Web client).',
    );
  }
  if (!configured) {
    GoogleSignin.configure({
      webClientId,
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
    configured = true;
  }
  return webClientId;
};

const mapGoogleError = (error: unknown): Error => {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      const cancelled = new Error('SIGN_IN_CANCELLED');
      (cancelled as any).code = statusCodes.SIGN_IN_CANCELLED;
      return cancelled;
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return new Error('Google sign-in is already in progress. Try again.');
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new Error('Google Play Services is missing or outdated on this phone.');
    }
    if (
      error.code === '10' ||
      /DEVELOPER_ERROR/i.test(String(error.message || error.code || ''))
    ) {
      return new Error(
        'Google Sign-In config error (SHA-1 / package). Add this APK’s signing SHA-1 in Firebase → Project settings → Android app, download a fresh google-services.json, and rebuild.',
      );
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(String((error as any)?.message || error || 'Google sign-in failed.'));
};

export const signInWithGoogle = async () => {
  ensureGoogleConfigured();

  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

  // Clear a stale Google session so the account picker always returns a fresh token.
  try {
    await GoogleSignin.signOut();
  } catch {
    // First-time users have nothing to sign out.
  }

  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result)) {
    const cancelled = new Error('SIGN_IN_CANCELLED');
    (cancelled as any).code = statusCodes.SIGN_IN_CANCELLED;
    throw cancelled;
  }

  // Prefer getTokens() — signIn()'s idToken alone can be null on some Android builds,
  // and Firebase Auth crashes natively if both idToken and accessToken are empty.
  let idToken = String(result.data?.idToken || '').trim();
  let accessToken = '';
  try {
    const tokens = await GoogleSignin.getTokens();
    idToken = String(tokens?.idToken || idToken || '').trim();
    accessToken = String(tokens?.accessToken || '').trim();
  } catch {
    // Keep idToken from signIn() if getTokens fails.
  }

  if (!idToken && !accessToken) {
    throw new Error(
      'Google did not return a sign-in token. Check Firebase Google provider, Web Client ID, and SHA-1, then rebuild the APK.',
    );
  }

  const credential = accessToken
    ? auth.GoogleAuthProvider.credential(idToken || null, accessToken)
    : auth.GoogleAuthProvider.credential(idToken);

  let userCredential;
  try {
    userCredential = await auth().signInWithCredential(credential);
  } catch (error) {
    throw mapGoogleError(error);
  }

  const firebaseToken = await userCredential.user.getIdToken(true);

  const response = await apiService.post('/auth/social', {
    provider: 'google',
    firebaseToken,
    deviceType: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    deviceOs: String(Platform.Version),
    appVersion: ENV.VERSION,
  });

  const data = response.data?.data;
  if (!data?.token || !data?.user) {
    throw new Error(
      response.data?.message || 'Google sign-in failed on server.',
    );
  }

  await saveSession(data.token, data.user);
  try {
    const profileResponse = await apiService.get('/auth/profile');
    const profile = profileResponse.data?.data;
    if (profile) {
      await saveSession(data.token, {...data.user, ...profile});
    }
  } catch {
    // Session from social login is enough if profile refresh fails.
  }

  return {
    token: data.token,
    user: data.user,
    isNewUser: Boolean(data.isNewUser),
  };
};

export const explainGoogleSignInError = (error: unknown): string =>
  mapGoogleError(error).message;

export default {
  signInWithGoogle,
  explainGoogleSignInError,
};
