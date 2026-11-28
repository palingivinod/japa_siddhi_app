import {createHash, randomBytes, timingSafeEqual} from 'crypto';

import authRepository from '../auth/auth.repository';
import jwtService from '../../utils/jwt';
import AppError from '../../utils/appError';
import biometricRepository from './biometricLogin.repository';

/** Server-side safety net. The phone keeps the credential until app data is cleared. */
const CREDENTIAL_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

const DEVICE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
const CREDENTIAL_RE = /^[A-Za-z0-9_-]{40,96}$/;

const sha256Hex = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const parseDeviceId = (value: unknown) => {
  const deviceId = String(value || '').trim();
  if (!DEVICE_ID_RE.test(deviceId)) {
    throw new AppError('Invalid device.', 400);
  }
  return deviceId;
};

const issueSessionToken = (user: any) =>
  jwtService.generate({
    id: user.id,
    uuid: user.uuid,
    firebaseUid: user.firebaseUid,
    mobileNumber: user.mobileNumber,
    role: user.role,
  });

class BiometricLoginService {
  /**
   * Signed-in user turns the option on for this phone. Returns a random
   * credential once; only its hash is stored. The phone keeps the raw value
   * in the Android Keystore-backed keychain.
   */
  async enroll(userId: number, rawDeviceId: unknown) {
    const deviceId = parseDeviceId(rawDeviceId);
    const credential = randomBytes(32).toString('base64url');
    const now = Date.now();
    await biometricRepository.replaceForDevice({
      userId,
      deviceId,
      tokenHash: sha256Hex(credential),
      createdAtMs: now,
      expiresAtMs: now + CREDENTIAL_LIFETIME_MS,
    });
    return {
      credential,
      expiresAt: new Date(now + CREDENTIAL_LIFETIME_MS).toISOString(),
    };
  }

  /** Public: the login screen exchanges the saved credential for a session. */
  async exchange(rawDeviceId: unknown, rawCredential: unknown) {
    const deviceId = parseDeviceId(rawDeviceId);
    const credential = String(rawCredential || '');
    const invalid = () => new AppError('Please log in again.', 401);

    if (!CREDENTIAL_RE.test(credential)) {
      throw invalid();
    }

    const row = await biometricRepository.findByDevice(deviceId);
    if (!row) {
      throw invalid();
    }

    const given = Buffer.from(sha256Hex(credential), 'hex');
    const stored = Buffer.from(row.tokenHash, 'hex');
    if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
      throw invalid();
    }

    const now = Date.now();
    if (row.expiresAtMs <= now) {
      await biometricRepository.deleteForDevice(row.userId, deviceId);
      throw invalid();
    }

    const user = await authRepository.findUserById(row.userId);
    if (!user) {
      await biometricRepository.deleteForDevice(row.userId, deviceId);
      throw invalid();
    }

    await biometricRepository.touchLastUsed(row.id, now);
    return {
      token: issueSessionToken(user),
      user,
    };
  }

  /** Signed-in user turns the option off on this phone. */
  async revoke(userId: number, rawDeviceId: unknown) {
    const deviceId = parseDeviceId(rawDeviceId);
    await biometricRepository.deleteForDevice(userId, deviceId);
    return {revoked: true};
  }

  /** Password changed, reset or account deleted: every phone must sign in again. */
  async revokeAllForUser(userId: number) {
    await biometricRepository.deleteAllForUser(userId);
  }
}

export default new BiometricLoginService();
