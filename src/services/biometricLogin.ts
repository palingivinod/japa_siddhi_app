import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import apiService from './apiService';

/**
 * Fingerprint / face login. The phone keeps a random credential in the
 * Android Keystore-backed keychain, and it is released only after the
 * fingerprint or strong face check. The server stores a hash of it.
 */

const KEYCHAIN_SERVICE = 'japa_siddhi_quick_login';
const DEVICE_KEY = 'biometric_device_id_v1';
const ENABLED_KEY = 'biometric_login_on_v1';

const PROMPT = {
  title: 'Japa Siddhi',
  subtitle: 'Confirm it is you',
  description: 'Use your fingerprint or face to log in',
  cancel: 'Cancel',
};

export type EnableResult = 'ok' | 'unavailable' | 'cancelled' | 'failed';

export type QuickLoginResult =
  | {status: 'ok'; token: string; user: any}
  | {status: 'cancelled'}
  | {status: 'expired'}
  | {status: 'retry'};

const ID_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const randomId = (length: number) => {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return out;
};

/** Stable per install. Cleared only when app data is cleared. */
const getDeviceId = async () => {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id || id.length < 16) {
    id = randomId(40);
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
};

/** 'fingerprint' | 'face' | ... or null when none is enrolled / supported. */
export const getBiometryType = async (): Promise<string | null> => {
  try {
    const type = await Keychain.getSupportedBiometryType();
    return type ? String(type) : null;
  } catch {
    return null;
  }
};

/** Settings switch: on for this phone. */
export const isQuickLoginOn = async () =>
  (await AsyncStorage.getItem(ENABLED_KEY)) === '1';

/** On and a credential is actually stored (no prompt shown for this check). */
export const hasQuickLogin = async () => {
  if (!(await isQuickLoginOn())) {
    return false;
  }
  try {
    return await Keychain.hasGenericPassword({service: KEYCHAIN_SERVICE});
  } catch {
    return false;
  }
};

const removeLocalCredential = async () => {
  try {
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
  } catch {
    // Nothing stored.
  }
  await AsyncStorage.removeItem(ENABLED_KEY);
};

const isCancel = (error: unknown) =>
  /cancel/i.test(String((error as any)?.message || error || ''));

/**
 * Must be called while the devotee is signed in. Creates the server
 * credential, stores it behind the fingerprint / face check, and proves the
 * check works before switching the option on.
 */
export const enableQuickLogin = async (): Promise<EnableResult> => {
  if (!(await getBiometryType())) {
    return 'unavailable';
  }
  const deviceId = await getDeviceId();

  let credential = '';
  try {
    const res = await apiService.post('/auth/biometric/enroll', {deviceId});
    credential = String(res.data?.data?.credential || '');
  } catch {
    return 'failed';
  }
  if (!credential) {
    return 'failed';
  }

  try {
    await Keychain.setGenericPassword(deviceId, credential, {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      authenticationPrompt: PROMPT,
    });
    // Proof the fingerprint / face check works before we switch it on.
    const check = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
      authenticationPrompt: PROMPT,
    });
    if (!check || check.password !== credential) {
      throw new Error('verify failed');
    }
  } catch (error) {
    await removeLocalCredential();
    try {
      await apiService.post('/auth/biometric/revoke', {deviceId});
    } catch {
      // Best effort; the server credential is useless without the phone's secret.
    }
    return isCancel(error) ? 'cancelled' : 'failed';
  }

  await AsyncStorage.setItem(ENABLED_KEY, '1');
  return 'ok';
};

/** Settings switch off, or any failure that means the saved login is no longer valid. */
export const disableQuickLogin = async () => {
  const deviceId = await AsyncStorage.getItem(DEVICE_KEY);
  if (deviceId) {
    try {
      await apiService.post('/auth/biometric/revoke', {deviceId});
    } catch {
      // Offline: the server copy is also removed on password change and deletion.
    }
  }
  await removeLocalCredential();
};

/**
 * Login screen button. Asks for the fingerprint / face, then trades the saved
 * credential for a session on the server. No OTP is sent.
 */
export const loginWithQuickLogin = async (): Promise<QuickLoginResult> => {
  let creds: false | {username: string; password: string};
  try {
    creds = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
      authenticationPrompt: PROMPT,
    });
  } catch (error) {
    if (isCancel(error)) {
      return {status: 'cancelled'};
    }
    // Typically a new fingerprint was added, which invalidates the key.
    await removeLocalCredential();
    return {status: 'expired'};
  }
  if (!creds) {
    await removeLocalCredential();
    return {status: 'expired'};
  }

  try {
    const res = await apiService.post('/auth/biometric/exchange', {
      deviceId: creds.username,
      credential: creds.password,
    });
    const data = res.data?.data;
    if (!data?.token || !data?.user) {
      return {status: 'retry'};
    }
    return {status: 'ok', token: data.token, user: data.user};
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 401 || status === 400) {
      // Revoked on the server (password change, deletion, expiry).
      await removeLocalCredential();
      return {status: 'expired'};
    }
    return {status: 'retry'};
  }
};
