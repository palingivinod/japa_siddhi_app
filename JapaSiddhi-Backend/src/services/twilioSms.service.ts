import environment from '../config/environment';
import AppError from '../utils/appError';

/**
 * Twilio SMS for mobile login OTP.
 * Credentials come from env (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER).
 * Uses the REST API so no twilio npm package is required.
 */
class TwilioSmsService {
  isConfigured(): boolean {
    return Boolean(
      environment.TWILIO_ACCOUNT_SID &&
        environment.TWILIO_AUTH_TOKEN &&
        environment.TWILIO_FROM_NUMBER,
    );
  }

  maskPhone(countryCode: string, mobileNumber: string): string {
    const digits = String(mobileNumber || '').replace(/\D/g, '');
    if (digits.length < 4) {
      return `+${countryCode}****`;
    }
    return `+${countryCode}******${digits.slice(-4)}`;
  }

  async sendOtp(
    countryCode: string,
    mobileNumber: string,
    otp: string,
  ): Promise<void> {
    const cc = String(countryCode || '').replace(/\D/g, '');
    const num = String(mobileNumber || '').replace(/\D/g, '');
    if (!cc || num.length < 6) {
      throw new AppError('Enter a valid mobile number for SMS OTP.', 400);
    }

    if (!this.isConfigured()) {
      if (environment.NODE_ENV !== 'production') {
        // Local/dev without Twilio: log OTP so QA can continue.
        // eslint-disable-next-line no-console
        console.log(
          `[twilio-dev] OTP ${otp} for +${cc}${num} (set TWILIO_* in .env to send real SMS)`,
        );
        return;
      }
      throw new AppError(
        'Mobile OTP is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to the backend .env.',
        503,
      );
    }

    const sid = environment.TWILIO_ACCOUNT_SID;
    const token = environment.TWILIO_AUTH_TOKEN;
    const from = environment.TWILIO_FROM_NUMBER;
    const to = `+${cc}${num}`;
    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: `Your Japa Siddhi login OTP is ${otp}. Valid for a few minutes. Do not share this code.`,
    });

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
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
}

export default new TwilioSmsService();
