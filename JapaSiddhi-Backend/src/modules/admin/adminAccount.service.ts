import bcrypt from 'bcrypt';

import mysql from '../../database/mysql';
import environment from '../../config/environment';
import AppError from '../../utils/appError';
import otpRepository from '../auth/otp.repository';
import emailOtpService from '../../services/emailOtp.service';

const DEFAULT_ADMIN_EMAIL = 'kailaasavaasi@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'Kailaasa5599!';

const normalizeEmail = (email: string) =>
  String(email || '')
    .trim()
    .toLowerCase();

const normalizePhone = (value: string) =>
  String(value || '').replace(/\D/g, '');

const parseMobile = (countryCode: string, mobileNumber: string) => {
  const cc = normalizePhone(countryCode) || '91';
  const mobile = normalizePhone(mobileNumber);
  if (mobile.length < 8 || /^0+$/.test(mobile)) {
    return null;
  }
  return {
    countryCode: cc,
    mobile: mobile.length > 10 ? mobile.slice(-10) : mobile,
  };
};

class AdminAccountService {
  private seeded = false;
  private mobileColumnsReady = false;

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private async ensureMobileColumns() {
    if (this.mobileColumnsReady) {
      return;
    }
    this.mobileColumnsReady = true;
    try {
      await mysql.query(`
        ALTER TABLE admin_accounts
        ADD COLUMN mobile_country_code VARCHAR(8) NOT NULL DEFAULT '91'
      `);
    } catch {
      // Column already exists.
    }
    try {
      await mysql.query(`
        ALTER TABLE admin_accounts
        ADD COLUMN mobile_number VARCHAR(20) NULL
      `);
    } catch {
      // Column already exists.
    }
  }

  private async ensureDefaultAdmin() {
    if (this.seeded) {
      return;
    }
    this.seeded = true;
    await this.ensureMobileColumns();

    try {
      const rows = await mysql.query<any[]>(
        `
        SELECT id, password_hash AS passwordHash
        FROM admin_accounts
        WHERE lower(email) = ?
        LIMIT 1
        `,
        [DEFAULT_ADMIN_EMAIL],
      );

      if (!rows.length) {
        const passwordHash = await this.hashPassword(DEFAULT_ADMIN_PASSWORD);
        await mysql.query(
          `
          INSERT INTO admin_accounts (
            email,
            password_hash,
            full_name,
            mobile_country_code,
            mobile_number,
            is_active
          )
          VALUES (?, ?, ?, '91', NULL, 1)
          `,
          [DEFAULT_ADMIN_EMAIL, passwordHash, 'Primary Admin'],
        );
        return;
      }

      if (rows[0].passwordHash === 'PENDING_SEED') {
        const passwordHash = await this.hashPassword(DEFAULT_ADMIN_PASSWORD);
        await mysql.query(
          `
          UPDATE admin_accounts
          SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [passwordHash, rows[0].id],
        );
      }
    } catch (error) {
      console.error('Failed to seed default admin account', error);
      this.seeded = false;
    }
  }

  async login(identifier: string, password: string) {
    await this.ensureDefaultAdmin();
    const value = String(identifier || '').trim();
    if (!value || !password) {
      throw new AppError('Enter admin email or mobile number and password.', 400);
    }

    let rows: any[] = [];
    if (value.includes('@')) {
      const normalized = normalizeEmail(value);
      rows = await mysql.query<any[]>(
        `
        SELECT
          id,
          email,
          password_hash AS passwordHash,
          full_name AS fullName,
          mobile_country_code AS mobileCountryCode,
          mobile_number AS mobileNumber,
          is_active AS isActive
        FROM admin_accounts
        WHERE lower(email) = ?
        LIMIT 1
        `,
        [normalized],
      );
    } else {
      const digits = normalizePhone(value);
      const mobile = digits.length > 10 ? digits.slice(-10) : digits;
      if (mobile.length < 8) {
        throw new AppError('Enter a valid admin mobile number.', 400);
      }
      rows = await mysql.query<any[]>(
        `
        SELECT
          id,
          email,
          password_hash AS passwordHash,
          full_name AS fullName,
          mobile_country_code AS mobileCountryCode,
          mobile_number AS mobileNumber,
          is_active AS isActive
        FROM admin_accounts
        WHERE REPLACE(REPLACE(IFNULL(mobile_number, ''), '+', ''), ' ', '') = ?
        LIMIT 1
        `,
        [mobile],
      );
    }

    const admin = rows[0];
    if (!admin || Number(admin.isActive) !== 1) {
      throw new AppError('Invalid admin email or password.', 401);
    }

    const ok = await bcrypt.compare(password, String(admin.passwordHash || ''));
    if (!ok) {
      throw new AppError('Invalid admin email or password.', 401);
    }

    return {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName || 'Admin',
      mobileCountryCode: admin.mobileCountryCode || '91',
      mobileNumber: admin.mobileNumber || '',
    };
  }

  async sendForgotOtp(email: string) {
    await this.ensureDefaultAdmin();
    const normalized = normalizeEmail(email);
    if (!normalized.includes('@')) {
      throw new AppError('Enter a valid admin email.', 400);
    }

    const rows = await mysql.query<any[]>(
      `
      SELECT id
      FROM admin_accounts
      WHERE lower(email) = ?
      AND is_active = 1
      LIMIT 1
      `,
      [normalized],
    );

    if (!rows.length) {
      throw new AppError('No admin account found for this email.', 404);
    }

    const existing = await otpRepository.findActiveByEmail(normalized);
    if (
      existing &&
      Date.now() - Number(existing.createdAt) <
        environment.OTP_RESEND_SECONDS * 1000
    ) {
      throw new AppError(
        `Please wait ${environment.OTP_RESEND_SECONDS} seconds before requesting another OTP.`,
        429,
      );
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    await emailOtpService.sendOtp(normalized, otp);
    await otpRepository.save({
      mobileCountryCode: '91',
      mobileNumber: '0000000000',
      email: normalized,
      codeHash: emailOtpService.hashOtp(otp),
      expiresAt: Date.now() + environment.OTP_EXPIRES_SECONDS * 1000,
    });

    return {
      sent: true,
      sentTo: emailOtpService.maskEmail(normalized),
      expiresInSeconds: environment.OTP_EXPIRES_SECONDS,
    };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    await this.ensureDefaultAdmin();
    const normalized = normalizeEmail(email);
    const code = String(otp || '').trim();
    const password = String(newPassword || '');

    if (!normalized.includes('@')) {
      throw new AppError('Enter a valid admin email.', 400);
    }
    if (code.length !== 4) {
      throw new AppError('Enter the 4-digit OTP.', 400);
    }
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters.', 400);
    }

    const rows = await mysql.query<any[]>(
      `
      SELECT id
      FROM admin_accounts
      WHERE lower(email) = ?
      AND is_active = 1
      LIMIT 1
      `,
      [normalized],
    );
    if (!rows.length) {
      throw new AppError('No admin account found for this email.', 404);
    }

    const stored = await otpRepository.findActiveByEmail(normalized);
    if (!stored || Number(stored.expiresAt) < Date.now()) {
      throw new AppError('Invalid or expired OTP.', 401);
    }
    if (Number(stored.attempts) >= environment.OTP_MAX_ATTEMPTS) {
      await otpRepository.deleteByEmail(normalized);
      throw new AppError('Too many incorrect attempts. Request a new OTP.', 401);
    }

    const valid = emailOtpService.matches(code, stored.codeHash);
    if (!valid) {
      await otpRepository.incrementAttempts(stored.id);
      throw new AppError('Invalid or expired OTP.', 401);
    }

    await otpRepository.deleteByEmail(normalized);
    const passwordHash = await this.hashPassword(password);
    await mysql.query(
      `
      UPDATE admin_accounts
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [passwordHash, rows[0].id],
    );

    return {success: true, email: normalized};
  }

  async listAdmins() {
    await this.ensureDefaultAdmin();
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        email,
        full_name AS fullName,
        mobile_country_code AS mobileCountryCode,
        mobile_number AS mobileNumber,
        is_active AS isActive,
        created_at AS createdAt
      FROM admin_accounts
      ORDER BY id ASC
      `,
    );
    return rows.map(row => ({
      id: row.id,
      email: row.email,
      fullName: row.fullName || 'Admin',
      mobileCountryCode: row.mobileCountryCode || '91',
      mobileNumber: row.mobileNumber || '',
      isActive: Number(row.isActive) === 1,
      createdAt: row.createdAt,
    }));
  }

  async addAdmin(data: {
    email: string;
    password: string;
    fullName: string;
    mobileCountryCode: string;
    mobileNumber: string;
  }) {
    await this.ensureDefaultAdmin();
    const email = normalizeEmail(data.email);
    const password = String(data.password || '');
    const fullName = String(data.fullName || '').trim();
    const mobile = parseMobile(data.mobileCountryCode, data.mobileNumber);

    if (!fullName) {
      throw new AppError('Full name is required.', 400);
    }
    if (!email.includes('@')) {
      throw new AppError('Enter a valid admin email.', 400);
    }
    if (!mobile) {
      throw new AppError('Enter a valid mobile number.', 400);
    }
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters.', 400);
    }

    const existingEmail = await mysql.query<any[]>(
      `
      SELECT id FROM admin_accounts WHERE lower(email) = ? LIMIT 1
      `,
      [email],
    );
    if (existingEmail.length) {
      throw new AppError('An admin with this email already exists.', 409);
    }

    const existingMobile = await mysql.query<any[]>(
      `
      SELECT id
      FROM admin_accounts
      WHERE REPLACE(REPLACE(IFNULL(mobile_number, ''), '+', ''), ' ', '') = ?
      LIMIT 1
      `,
      [mobile.mobile],
    );
    if (existingMobile.length) {
      throw new AppError('An admin with this mobile number already exists.', 409);
    }

    const passwordHash = await this.hashPassword(password);
    const result = await mysql.query<any>(
      `
      INSERT INTO admin_accounts (
        email,
        password_hash,
        full_name,
        mobile_country_code,
        mobile_number,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, 1)
      `,
      [email, passwordHash, fullName, mobile.countryCode, mobile.mobile],
    );

    return {
      id: result.insertId,
      email,
      fullName,
      mobileCountryCode: mobile.countryCode,
      mobileNumber: mobile.mobile,
    };
  }
}

export default new AdminAccountService();
