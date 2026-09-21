import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
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
    });
    configured = true;
  }
  return webClientId;
};

export const signInWithGoogle = async () => {
  ensureGoogleConfigured();

  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  const result = await GoogleSignin.signIn();
  const idToken =
    (result as any)?.data?.idToken ||
    (result as any)?.idToken ||
    null;

  if (!idToken) {
    throw new Error(
      'Google did not return an ID token. Check Firebase OAuth setup.',
    );
  }

  const credential = auth.GoogleAuthProvider.credential(idToken);
  const userCredential = await auth().signInWithCredential(credential);
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

export default {
  signInWithGoogle,
};
