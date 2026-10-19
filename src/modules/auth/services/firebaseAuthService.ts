import auth, {
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';

export interface SendOtpResponse {
  success: boolean;
  confirmation?: FirebaseAuthTypes.ConfirmationResult;
  e164?: string;
  message?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  user?: FirebaseAuthTypes.User;
  idToken?: string;
  message?: string;
}

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
      return 'OTP session expired. Request a new code.';
    case 'auth/invalid-verification-code':
      return 'Invalid OTP. Check the SMS code and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet and try again.';
    default:
      return message || 'Unable to send OTP to this number.';
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
      this.pendingConfirmation = confirmation;
      this.pendingE164 = e164;
      return {
        success: true,
        confirmation,
        e164,
      };
    } catch (error: any) {
      console.log('Send OTP Error:', e164, error?.code, error?.message);
      this.pendingConfirmation = null;
      this.pendingE164 = null;
      return {
        success: false,
        e164,
        message: friendlyAuthError(error),
      };
    }
  }

  async verifyPendingOTP(otp: string): Promise<VerifyOtpResponse> {
    if (!this.pendingConfirmation) {
      return {
        success: false,
        message: 'OTP session expired. Request a new code.',
      };
    }
    return this.verifyOTP(this.pendingConfirmation, otp);
  }

  async verifyOTP(
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    otp: string,
  ): Promise<VerifyOtpResponse> {
    try {
      const credential = await confirmation.confirm(String(otp || '').trim());

      if (!credential || !credential.user) {
        return {
          success: false,
          message: 'OTP verification failed.',
        };
      }

      const idToken = await credential.user.getIdToken(true);
      this.pendingConfirmation = null;
      this.pendingE164 = null;

      return {
        success: true,
        user: credential.user,
        idToken,
      };
    } catch (error: any) {
      console.log('Verify OTP Error:', error?.code, error?.message);
      return {
        success: false,
        message: friendlyAuthError(error),
      };
    }
  }

  getPendingE164(): string | null {
    return this.pendingE164;
  }

  clearPending(): void {
    this.pendingConfirmation = null;
    this.pendingE164 = null;
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
