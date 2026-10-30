import auth from '@react-native-firebase/auth';
import {Platform} from 'react-native';
import {
  AccessToken,
  LoginManager,
  Settings,
} from 'react-native-fbsdk-next';

import ENV from '../../../env';
import apiService from '../../../services/apiService';
import {saveSession} from '../../../services/session';
import {getAppVersionName} from '../../../utils/appVersion';

let sdkReady = false;

const ensureFacebookConfigured = () => {
  const appId = String(ENV.FACEBOOK_APP_ID || '').trim();
  const clientToken = String(ENV.FACEBOOK_CLIENT_TOKEN || '').trim();
  if (!appId || !clientToken) {
    throw new Error(
      'Facebook App ID / Client Token missing. Add FACEBOOK_APP_ID and FACEBOOK_CLIENT_TOKEN in src/env.ts from Meta Developer Console, enable Facebook in Firebase Auth, then rebuild.',
    );
  }
  if (!sdkReady) {
    Settings.setAppID(appId);
    Settings.setClientToken(clientToken);
    Settings.initializeSDK();
    sdkReady = true;
  }
  return {appId, clientToken};
};

const mapFacebookError = (error: unknown): Error => {
  const raw = String((error as any)?.message || error || '');
  if (/cancel|cancelled|USER_CANCELLED/i.test(raw)) {
    const cancelled = new Error('SIGN_IN_CANCELLED');
    (cancelled as any).code = 'SIGN_IN_CANCELLED';
    return cancelled;
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(raw || 'Facebook sign-in failed.');
};

export const signInWithFacebook = async () => {
  ensureFacebookConfigured();

  // Clear a stale Facebook session so the account picker returns a fresh token.
  try {
    LoginManager.logOut();
  } catch {
    // First-time users have nothing to sign out.
  }

  let loginResult;
  try {
    loginResult = await LoginManager.logInWithPermissions([
      'public_profile',
      'email',
    ]);
  } catch (error) {
    throw mapFacebookError(error);
  }

  if (loginResult.isCancelled) {
    const cancelled = new Error('SIGN_IN_CANCELLED');
    (cancelled as any).code = 'SIGN_IN_CANCELLED';
    throw cancelled;
  }

  const data = await AccessToken.getCurrentAccessToken();
  const accessToken = String(data?.accessToken || '').trim();
  if (!accessToken) {
    throw new Error(
      'Facebook did not return an access token. Check Meta App ID, Client Token, package name, and key hashes, then rebuild.',
    );
  }

  const credential = auth.FacebookAuthProvider.credential(accessToken);

  let userCredential;
  try {
    userCredential = await auth().signInWithCredential(credential);
  } catch (error) {
    throw mapFacebookError(error);
  }

  const firebaseToken = await userCredential.user.getIdToken(true);

  const response = await apiService.post('/auth/social', {
    provider: 'facebook',
    firebaseToken,
    deviceType: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    deviceOs: String(Platform.Version),
    appVersion: getAppVersionName(),
  });

  const payload = response.data?.data;
  if (!payload?.token || !payload?.user) {
    throw new Error(
      response.data?.message || 'Facebook sign-in failed on server.',
    );
  }

  let user = {
    ...payload.user,
    authProvider: payload.user?.authProvider || 'facebook',
  };
  await saveSession(payload.token, user);
  try {
    const profileResponse = await apiService.get('/auth/profile');
    const profile = profileResponse.data?.data;
    if (profile) {
      user = {
        ...user,
        ...profile,
        authProvider:
          profile.authProvider ||
          profile.auth_provider ||
          user.authProvider ||
          'facebook',
      };
      await saveSession(payload.token, user);
    }
  } catch {
    // Session from social login is enough if profile refresh fails.
  }

  return {
    token: payload.token,
    user,
    isNewUser: Boolean(payload.isNewUser),
  };
};

export const explainFacebookSignInError = (error: unknown): string =>
  mapFacebookError(error).message;

export default {
  signInWithFacebook,
  explainFacebookSignInError,
};
