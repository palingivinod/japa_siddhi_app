import environment from '../config/environment';
import AppError from '../utils/appError';

/**
 * Twilio SMS for mobile login OTP.
 *
 * Preferred: Twilio Verify (TWILIO_VERIFY_SERVICE_SID = VA...) — no From number needed.
 * Fallback: Messages API with TWILIO_FROM_NUMBER when Verify SID is not set.
 */
class TwilioSmsService {
  usesVerify(): boolean {
    return Boolean(
      environment.TWILIO_ACCOUNT_SID &&
        environment.TWILIO_AUTH_TOKEN &&
        environment.TWILIO_VERIFY_SERVICE_SID,
    );
  }

  usesMessages(): boolean {
    return Boolean(
      environment.TWILIO_ACCOUNT_SID &&
        environment.TWILIO_AUTH_TOKEN &&
        environment.TWILIO_FROM_NUMBER,
    );
  }

  isConfigured(): boolean {
    return this.usesVerify() || this.usesMessages();
  }

  maskPhone(countryCode: string, mobileNumber: string): string {
    const digits = String(mobileNumber || '').replace(/\D/g, '');
    if (digits.length < 4) {
      return `+${countryCode}****`;
    }
    return `+${countryCode}******${digits.slice(-4)}`;
  }

  private authHeader(): string {
    const sid = environment.TWILIO_ACCOUNT_SID;
    const token = environment.TWILIO_AUTH_TOKEN;
    return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;
  }

  private toE164(countryCode: string, mobileNumber: string): {
    cc: string;
    num: string;
    to: string;
  } {
    const cc = String(countryCode || '').replace(/\D/g, '');
    const num = String(mobileNumber || '').replace(/\D/g, '');
    if (!cc || num.length < 6) {
      throw new AppError('Enter a valid mobile number for SMS OTP.', 400);
    }
    return {cc, num, to: `+${cc}${num}`};
  }

  /**
   * Start SMS OTP. With Verify, Twilio generates the code (set code length to 4
   * in the Verify service to match the app). With Messages API, `otp` is sent.
   */
  async sendOtp(
    countryCode: string,
    mobileNumber: string,
    otp: string,
  ): Promise<void> {
    const {to} = this.toE164(countryCode, mobileNumber);

    if (!this.isConfigured()) {
      if (environment.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(
          `[twilio-dev] OTP ${otp} for ${to} (set TWILIO_VERIFY_SERVICE_SID or TWILIO_FROM_NUMBER)`,
        );
        return;
      }
      throw new AppError(
        'Mobile OTP is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID (or TWILIO_FROM_NUMBER) on the server.',
        503,
      );
    }

    if (this.usesVerify()) {
      const serviceSid = environment.TWILIO_VERIFY_SERVICE_SID;
      const body = new URLSearchParams({
        To: to,
        Channel: 'sms',
      });
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        },
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new AppError(
          `Unable to send SMS OTP${detail ? `: ${detail.slice(0, 180)}` : '.'}`,
          502,
        );
      }
      return;
    }

    const from = environment.TWILIO_FROM_NUMBER;
    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: `Your Japa Siddhi login OTP is ${otp}. Valid for a few minutes. Do not share this code.`,
    });
    const sid = environment.TWILIO_ACCOUNT_SID;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new AppError(
        `Unable to send SMS OTP${detail ? `: ${detail.slice(0, 180)}` : '.'}`,
        502,
      );
    }
  }

  /** Twilio Verify check — returns true when code is approved. */
  async checkVerifyOtp(
    countryCode: string,
    mobileNumber: string,
    code: string,
  ): Promise<boolean> {
    if (!this.usesVerify()) {
      return false;
    }
    const {to} = this.toE164(countryCode, mobileNumber);
    const serviceSid = environment.TWILIO_VERIFY_SERVICE_SID;
    const body = new URLSearchParams({
      To: to,
      Code: String(code || '').trim(),
    });
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    if (!response.ok) {
      return false;
    }
    const json: any = await response.json().catch(() => ({}));
    return String(json?.status || '').toLowerCase() === 'approved';
  }
}

export default new TwilioSmsService();
