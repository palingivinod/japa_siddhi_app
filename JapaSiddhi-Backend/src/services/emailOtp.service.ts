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

  adminInbox(): string {
    return (
      process.env.NOTIFY_EMAIL ||
      environment.SMTP_USER ||
      ''
    ).trim();
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new AppError(
        'Email OTP is not configured. Add a Gmail address and App Password to SMTP_USER and SMTP_PASS in JapaSiddhi-Backend/.env. This stays free for production.',
        503,
      );
    }

    const mail = {
      from: `"Japa Siddhi" <${environment.SMTP_USER}>`,
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
          user: environment.SMTP_USER,
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

    const message = String(lastError?.message || '');
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
