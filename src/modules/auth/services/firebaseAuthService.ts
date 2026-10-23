import AsyncStorage from '@react-native-async-storage/async-storage';
import auth, {
  FirebaseAuthTypes,
  PhoneAuthProvider,
} from '@react-native-firebase/auth';

export interface SendOtpResponse {
  success: boolean;
  confirmation?: FirebaseAuthTypes.ConfirmationResult;
  verificationId?: string;
  e164?: string;
  message?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  user?: FirebaseAuthTypes.User;
  idToken?: string;
  message?: string;
}

const STORAGE_KEY = 'phone_otp_verification';
const MAX_AGE_MS = 10 * 60 * 1000;

type StoredOtp = {
  verificationId: string;
  e164: string;
  savedAt: number;
};

let memory: StoredOtp | null = null;

const toE164 = (phoneNumber: string, countryCode = '91'): string => {
  const raw = String(phoneNumber || '').trim();
  if (raw.startsWith('+')) {
    return `+${raw.replace(/\D/g, '')}`;
  }
  const digits = raw.replace(/\D/g, '');
  const cc = String(countryCode || '91').replace(/\D/g, '') || '91';
  if (digits.startsWith(cc) && digits.length > cc.length) {
    return `+${digits}`;
  }
  return `+${cc}${digits}`;
};

const friendlyAuthError = (error: any): string => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  const blob = `${code} ${message}`.toLowerCase();
  if (
    blob.includes('billing') ||
    blob.includes('billing_not_enabled') ||
    code === 'auth/billing-not-enabled' ||
    code === 'auth/billing-not'
  ) {
    return 'Phone OTP needs Firebase Blaze billing enabled on this project. Enable billing in Firebase Console, or use Email OTP for now.';
  }
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Enter a valid mobile number with country code.';
    case 'auth/too-many-requests':
      return 'Too many OTP requests. Please wait a few minutes and try again.';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded for today. Try again later or use email OTP.';
    case 'auth/missing-client-identifier':
    case 'auth/app-not-authorized':
      return 'App is not authorized for phone OTP. Check Firebase Phone sign-in and SHA fingerprints.';
    case 'auth/session-expired':
    case 'auth/code-expired':
      return 'OTP session expired. Request a new code.';
    case 'auth/invalid-verification-code':
      return 'Invalid OTP. Check the SMS code and try again.';
    case 'auth/invalid-verification-id':
      return 'OTP session expired. Request a new code.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet and try again.';
    default:
      return message || 'Unable to send OTP to this number.';
  }
};

const persist = async (session: StoredOtp) => {
  memory = session;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Memory still holds the id for this app run.
  }
};

const readStored = async (): Promise<StoredOtp | null> => {
  if (memory && Date.now() - memory.savedAt < MAX_AGE_MS && memory.verificationId) {
    return memory;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredOtp;
    if (
      !parsed?.verificationId ||
      Date.now() - Number(parsed.savedAt || 0) > MAX_AGE_MS
    ) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      memory = null;
      return null;
    }
    memory = parsed;
    return parsed;
  } catch {
    return memory;
  }
};

const clearStored = async () => {
  memory = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
};

const isSessionError = (error: any) => {
  const errorCode = String(error?.code || '');
  return (
    errorCode === 'auth/session-expired' ||
    errorCode === 'auth/code-expired' ||
    errorCode === 'auth/invalid-verification-id'
  );
};

const signedInAfter = (user: FirebaseAuthTypes.User | null, startedAt: number) => {
  const phone = String(user?.phoneNumber || '');
  if (!user || !phone || !startedAt) {
    return false;
  }
  const last = Date.parse(String(user.metadata?.lastSignInTime || ''));
  return !Number.isNaN(last) && last >= startedAt - 15000;
};

class FirebaseAuthService {
  private pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null =
    null;
  private pendingE164: string | null = null;
  private authUnsub: (() => void) | null = null;
  private autoVerifiedUser: FirebaseAuthTypes.User | null = null;
  private autoCode = '';
  private autoCodeWaiters: Array<(code: string) => void> = [];

  getAutoCode() {
    return this.autoCode;
  }

  subscribeAutoCode(onCode: (code: string) => void) {
    this.autoCodeWaiters.push(onCode);
    if (this.autoCode) {
      onCode(this.autoCode);
    }
    return () => {
      this.autoCodeWaiters = this.autoCodeWaiters.filter(waiter => waiter !== onCode);
    };
  }

  private noteAutoCode(code: string) {
    const digits = String(code || '').replace(/\D/g, '');
    if (digits.length < 4) {
      return;
    }
    this.autoCode = digits;
    this.autoCodeWaiters.forEach(waiter => waiter(digits));
  }

  private watchAutoVerify(e164: string, startedAt: number) {
    this.authUnsub?.();
    this.autoVerifiedUser = null;
    this.authUnsub = auth().onAuthStateChanged(user => {
      if (String(user?.phoneNumber || '') !== e164) {
        return;
      }
      if (signedInAfter(user, startedAt)) {
        this.autoVerifiedUser = user;
      }
    });
  }

  private async finishVerified(
    user: FirebaseAuthTypes.User,
  ): Promise<VerifyOtpResponse> {
    const idToken = await user.getIdToken(true);
    this.pendingConfirmation = null;
    this.pendingE164 = null;
    this.autoVerifiedUser = null;
    this.authUnsub?.();
    this.authUnsub = null;
    await clearStored();
    return {success: true, user, idToken};
  }

  private async alreadyVerified(
    expectedPhone: string,
    startedAt: number,
  ): Promise<VerifyOtpResponse | null> {
    const auto =
      this.autoVerifiedUser?.phoneNumber === expectedPhone
        ? this.autoVerifiedUser
        : null;
    const live = auth().currentUser;
    const user =
      auto ||
      (live?.phoneNumber === expectedPhone && signedInAfter(live, startedAt)
        ? live
        : null);
    if (!user) {
      return null;
    }
    return this.finishVerified(user);
  }

  /**
   * Sends an SMS OTP via Firebase Auth to the given phone number.
   * @param phoneNumber E.164 (+91…) or national digits
   * @param forceResend Android: request a new SMS for the same number
   */
  async sendOTP(
    phoneNumber: string,
    options?: {countryCode?: string; forceResend?: boolean},
  ): Promise<SendOtpResponse> {
    const e164 = toE164(phoneNumber, options?.countryCode);
    this.autoCode = '';
    this.pendingConfirmation = null;
    const savedAt = Date.now();
    try {
      // verifyPhoneNumber reports the SMS digits when Android reads the message.
      // signInWithPhoneNumber signs in silently and never gives those digits to the app.
      const listener = auth().verifyPhoneNumber(
        e164,
        60,
        Boolean(options?.forceResend),
      );
      return await new Promise(resolve => {
        let settled = false;
        const finish = (result: SendOtpResponse) => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(result);
        };
        const timer = setTimeout(() => {
          finish({
            success: false,
            e164,
            message: 'Unable to send OTP to this number.',
          });
        }, 30000);
        listener.on('state_changed', async snapshot => {
          const verificationId = String(snapshot.verificationId || '').trim();
          const smsCode = String(snapshot.code || '').replace(/\D/g, '');
          if (snapshot.state === 'error' || snapshot.error) {
            clearTimeout(timer);
            console.log(
              'Send OTP Error:',
              e164,
              snapshot.error?.code,
              snapshot.error?.message,
            );
            finish({
              success: false,
              e164,
              message: friendlyAuthError(snapshot.error),
            });
            return;
          }
          if (
            verificationId &&
            (snapshot.state === 'sent' ||
              snapshot.state === 'timeout' ||
              snapshot.state === 'verified')
          ) {
            this.pendingE164 = e164;
            if (!this.authUnsub) {
              this.watchAutoVerify(e164, savedAt);
            }
            await persist({verificationId, e164, savedAt});
            clearTimeout(timer);
            finish({
              success: true,
              verificationId,
              e164,
            });
          }
          if (snapshot.state === 'verified' && smsCode.length >= 4) {
            this.noteAutoCode(smsCode);
          }
        });
      });
    } catch (error: any) {
      console.log('Send OTP Error:', e164, error?.code, error?.message);
      return {
        success: false,
        e164,
        message: friendlyAuthError(error),
      };
    }
  }

  async verifyCode(
    otp: string,
    verificationId?: string | null,
  ): Promise<VerifyOtpResponse> {
    const code = String(otp || '').trim();
    const stored = await readStored();
    const id = String(verificationId || stored?.verificationId || '').trim();
    const expectedPhone = String(stored?.e164 || this.pendingE164 || '');
    const startedAt = Number(stored?.savedAt || 0);

    // Play Store builds auto-read the SMS and sign in before the devotee taps
    // Verify. Submitting the code again then looks like an expired session.
    const automatic = await this.alreadyVerified(expectedPhone, startedAt);
    if (automatic) {
      return automatic;
    }

    if (!id && !this.pendingConfirmation) {
      return {
        success: false,
        message: 'OTP session expired. Request a new code.',
      };
    }

    try {
      let user = null as FirebaseAuthTypes.User | null;
      if (this.pendingConfirmation) {
        try {
          const confirmed = await this.pendingConfirmation.confirm(code);
          user = confirmed?.user || null;
        } catch (error: any) {
          if (!isSessionError(error)) {
            throw error;
          }
        }
      }
      if (!user && id) {
        const credential = PhoneAuthProvider.credential(id, code);
        const userCredential = await auth().signInWithCredential(credential);
        user = userCredential?.user || null;
      }
      if (!user) {
        const after = await this.alreadyVerified(expectedPhone, startedAt);
        if (after) {
          return after;
        }
        return {
          success: false,
          message: 'OTP verification failed.',
        };
      }
      return this.finishVerified(user);
    } catch (error: any) {
      console.log('Verify OTP Error:', error?.code, error?.message);
      const after = await this.alreadyVerified(expectedPhone, startedAt);
      if (after) {
        return after;
      }
      if (isSessionError(error)) {
        this.pendingConfirmation = null;
        await clearStored();
      }
      return {
        success: false,
        message: friendlyAuthError(error),
      };
    }
  }

  async verifyPendingOTP(
    otp: string,
    verificationId?: string | null,
  ): Promise<VerifyOtpResponse> {
    return this.verifyCode(otp, verificationId);
  }

  async verifyOTP(
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    otp: string,
  ): Promise<VerifyOtpResponse> {
    return this.verifyCode(otp, confirmation?.verificationId);
  }

  getPendingE164(): string | null {
    return this.pendingE164 || memory?.e164 || null;
  }

  clearPending(): void {
    this.pendingConfirmation = null;
    this.pendingE164 = null;
    this.autoVerifiedUser = null;
    this.autoCode = '';
    this.authUnsub?.();
    this.authUnsub = null;
    memory = null;
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }

  getCurrentUser(): FirebaseAuthTypes.User | null {
    return auth().currentUser;
  }

  async refreshToken(): Promise<string | null> {
    try {
      const user = auth().currentUser;
      if (!user) {
        return null;
      }
      return await user.getIdToken(true);
    } catch (error) {
      console.log('Refresh Token Error:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    this.clearPending();
    await auth().signOut();
  }
}

export default new FirebaseAuthService();
