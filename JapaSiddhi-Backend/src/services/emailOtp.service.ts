import crypto from 'crypto';

const nodemailer = require('nodemailer') as typeof import('nodemailer');

import environment from '../config/environment';
import AppError from '../utils/appError';

class EmailOtpService {
  isConfigured(): boolean {
    return Boolean(environment.SMTP_USER && environment.SMTP_PASS);
  }

  hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  matches(otp: string, expectedHash?: string | null): boolean {
    if (!expectedHash) {
      return false;
    }
    const actual = Buffer.from(this.hashOtp(otp));
    const expected = Buffer.from(expectedHash);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  maskEmail(email: string): string {
    const [name, domain] = String(email).split('@');
    if (!name || !domain) {
      return email;
    }
    const visible = name.slice(0, 1);
    return `${visible}***@${domain}`;
  }

  /** Trust inbox for order / request / feedback admin alerts. */
  adminInbox(): string {
    return (
      environment.NOTIFY_EMAIL ||
      environment.SMTP_USER ||
      'bilvapatratrust@gmail.com'
    );
  }

  /** Always Bilva Patra Trust — never send as kailaasavaasi. */
  mailFromAddress(): string {
    const configured = String(environment.SMTP_USER || '')
      .trim()
      .toLowerCase();
    if (configured && !configured.includes('kailaasavaasi')) {
      return configured;
    }
    return 'bilvapatratrust@gmail.com';
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new AppError(
        'Email OTP is not configured. Add bilvapatratrust@gmail.com and its Gmail App Password to SMTP_USER and SMTP_PASS in JapaSiddhi-Backend/.env (and Render).',
        503,
      );
    }

    const fromAddress = this.mailFromAddress();
    const mail = {
      from: `"Japa Siddhi" <${fromAddress}>`,
      to,
      subject,
      text,
      html: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
    };

    const attempts = [
      {port: 587, secure: false, requireTLS: true},
      {port: 465, secure: true, requireTLS: false},
    ];

    let lastError: any;
    for (const attempt of attempts) {
      const transporter = nodemailer.createTransport({
        host: environment.SMTP_HOST,
        port: attempt.port,
        secure: attempt.secure,
        requireTLS: attempt.requireTLS,
        family: 4,
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 15000,
        auth: {
          // Auth as Bilva Patra Trust mailbox (same as From).
          user: fromAddress,
          pass: environment.SMTP_PASS,
        },
        tls: {
          minVersion: 'TLSv1.2',
        },
      } as any);

      try {
        await transporter.sendMail(mail);
        return;
      } catch (error: any) {
        lastError = error;
        console.error(
          'Email send failed:',
          attempt.port,
          error?.code,
          error?.message,
        );
      }
    }

    const message = `${String(lastError?.response || '')} ${String(lastError?.message || '')}`;
    if (
      /550|551|553|user unknown|address not found|recipient address rejected|mailbox unavailable|no such user/i.test(
        message,
      )
    ) {
      throw new AppError(
        `Address not found. Your message wasn't delivered to ${to} because the address couldn't be found, or is unable to receive mail.`,
        400,
      );
    }
    if (message.includes('Invalid login') || message.includes('EAUTH')) {
      throw new AppError(
        'Gmail rejected the App Password. Confirm SMTP_USER and SMTP_PASS.',
        502,
      );
    }
    throw new AppError(
      'The live server could not reach Gmail SMTP. Render free plans often block mail ports. Upgrade the Render instance or use a mail API.',
      502,
    );
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    await this.sendMail(
      email,
      'Your Japa Siddhi verification code',
      `Your Japa Siddhi 4-digit OTP is ${otp}. It expires in ${environment.OTP_EXPIRES_SECONDS / 60} minutes. Do not share this code.`,
    );
  }

  async notifyAdmin(subject: string, text: string): Promise<void> {
    const inbox = this.adminInbox();
    if (!this.isConfigured() || !inbox) {
      console.warn('Admin notification skipped: SMTP is not configured.');
      return;
    }

    try {
      await this.sendMail(inbox, subject, text);
    } catch (error: any) {
      console.error('Admin notification failed:', error?.message || error);
    }
  }
}

export default new EmailOtpService();
