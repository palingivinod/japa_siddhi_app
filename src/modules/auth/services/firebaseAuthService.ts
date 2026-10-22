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

class FirebaseAuthService {
  private pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null =
    null;
  private pendingE164: string | null = null;

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
    try {
      // Firebase delivers the SMS to this exact E.164 number.
      const confirmation = await auth().signInWithPhoneNumber(
        e164,
        Boolean(options?.forceResend),
      );
      const verificationId = String(confirmation?.verificationId || '').trim();
      if (!verificationId) {
        return {
          success: false,
          e164,
          message: 'Could not start phone verification. Please try again.',
        };
      }
      this.pendingConfirmation = confirmation;
      this.pendingE164 = e164;
      await persist({
        verificationId,
        e164,
        savedAt: Date.now(),
      });
      return {
        success: true,
        confirmation,
        verificationId,
        e164,
      };
    } catch (error: any) {
      console.log('Send OTP Error:', e164, error?.code, error?.message);
      // A failed resend must not throw away a code the devotee already received.
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
    if (!id) {
      return {
        success: false,
        message: 'OTP session expired. Request a new code.',
      };
    }
    try {
      // Use the saved verification id. confirmation.confirm() only works while
      // Android still holds the original native session, which is often gone
      // by the time the devotee types the SMS code.
      const credential = PhoneAuthProvider.credential(id, code);
      const userCredential = await auth().signInWithCredential(credential);
      const user = userCredential?.user;
      if (!user) {
        return {
          success: false,
          message: 'OTP verification failed.',
        };
      }
      const idToken = await user.getIdToken(true);
      this.pendingConfirmation = null;
      this.pendingE164 = null;
      await clearStored();
      return {
        success: true,
        user,
        idToken,
      };
    } catch (error: any) {
      console.log('Verify OTP Error:', error?.code, error?.message);
      const errorCode = String(error?.code || '');
      if (
        errorCode === 'auth/session-expired' ||
        errorCode === 'auth/code-expired' ||
        errorCode === 'auth/invalid-verification-id'
      ) {
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
