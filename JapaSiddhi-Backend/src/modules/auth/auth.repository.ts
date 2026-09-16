import {randomUUID} from 'crypto';
import { ResultSetHeader } from 'mysql2';
import mysql from '../../database/mysql';
import { AuthUser } from './auth.types';

interface CreateUserData {
  firebaseUid?: string;
  mobileCountryCode: string;
  mobileNumber: string;
  email?: string;
  fullName?: string;
  passwordHash?: string;

  deviceType: 'ANDROID' | 'IOS';

  deviceModel?: string;
  deviceOs?: string;
  appVersion?: string;
  firebaseToken?: string;
}

const mapUser = (row: any): AuthUser | null => {
  if (!row) {
    return null;
  }

  const {
    password_hash: _passwordHashSnake,
    passwordHash: _passwordHashCamel,
    ...safeRow
  } = row;

  return {
    ...safeRow,
    firebaseUid: row.firebaseUid ?? row.firebase_uid,
    mobileCountryCode: row.mobileCountryCode ?? row.mobile_country_code,
    mobileNumber: row.mobileNumber ?? row.mobile_number,
    fullName: row.fullName ?? row.full_name,
    dateOfBirth: row.dateOfBirth ?? row.date_of_birth,
    profilePhoto: row.profilePhoto ?? row.profile_photo,
    countryId: row.countryId ?? row.country_id,
    stateId: row.stateId ?? row.state_id,
    cityId: row.cityId ?? row.city_id,
    address: row.address ?? null,
    maritalStatus: row.maritalStatus ?? row.marital_status ?? 'Bachelor',
    spouseName: row.spouseName ?? row.spouse_name ?? null,
    spouseDob: row.spouseDob ?? row.spouse_dob ?? null,
    anniversaryDate: row.anniversaryDate ?? row.anniversary_date ?? null,
    gothram: row.gothram ?? null,
    nakshatram: row.nakshatram ?? null,
    preferredLanguageId: row.preferredLanguageId ?? row.preferred_language_id,
    profileCompleted: row.profileCompleted ?? row.profile_completed,
  } as AuthUser;
};

class AuthRepository {
  async findUserByFirebaseUid(
    firebaseUid: string,
  ): Promise<AuthUser | null> {
    const rows = await mysql.query<AuthUser[]>(
      `
      SELECT *
      FROM users
      WHERE firebase_uid = ?
      AND deleted_at IS NULL
      LIMIT 1
      `,
      [firebaseUid],
    );

    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  async findUserByMobile(
    mobileCountryCode: string,
    mobileNumber: string,
  ): Promise<AuthUser | null> {
    const country = String(mobileCountryCode || '').replace(/\D/g, '');
    const mobile = String(mobileNumber || '').replace(/\D/g, '');
    const rows = await mysql.query<AuthUser[]>(
      `
      SELECT *
      FROM users
      WHERE deleted_at IS NULL
      AND REPLACE(REPLACE(mobile_number, '+', ''), ' ', '') = ?
      AND (
        REPLACE(REPLACE(mobile_country_code, '+', ''), ' ', '') = ?
        OR REPLACE(REPLACE(mobile_country_code, '+', ''), ' ', '') = ''
      )
      LIMIT 1
      `,
      [mobile, country],
    );

    if (rows.length > 0) {
      return mapUser(rows[0]);
    }

    const byNumber = await mysql.query<AuthUser[]>(
      `
      SELECT *
      FROM users
      WHERE deleted_at IS NULL
      AND REPLACE(REPLACE(mobile_number, '+', ''), ' ', '') = ?
      LIMIT 1
      `,
      [mobile],
    );

    return byNumber.length > 0 ? mapUser(byNumber[0]) : null;
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const rows = await mysql.query<AuthUser[]>(
      `
      SELECT *
      FROM users
      WHERE lower(email) = ?
      AND deleted_at IS NULL
      LIMIT 1
      `,
      [email.toLowerCase()],
    );

    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  /** Soft-deleted rows keep password_hash; email/mobile are anonymized as deleted_{id}_{value}. */
  async findDeletedUserByEmail(email: string): Promise<AuthUser | null> {
    const normalized = email.toLowerCase().trim();
    if (!normalized) {
      return null;
    }

    const exact = await mysql.query<any[]>(
      `
      SELECT *
      FROM users
      WHERE deleted_at IS NOT NULL
      AND lower(email) = ?
      LIMIT 1
      `,
      [normalized],
    );
    if (exact.length > 0) {
      return mapUser(exact[0]);
    }

    const candidates = await mysql.query<any[]>(
      `
      SELECT *
      FROM users
      WHERE deleted_at IS NOT NULL
      AND lower(email) LIKE 'deleted_%'
      ORDER BY id DESC
      LIMIT 100
      `,
    );

    const match = candidates.find(row => {
      const stored = String(row.email || '').toLowerCase();
      const prefix = `deleted_${row.id}_`;
      return stored === `${prefix}${normalized}` || stored.endsWith(`_${normalized}`);
    });

    return match ? mapUser(match) : null;
  }

  async findDeletedUserByMobile(
    mobileCountryCode: string,
    mobileNumber: string,
  ): Promise<AuthUser | null> {
    const country = String(mobileCountryCode || '').replace(/\D/g, '');
    const mobile = String(mobileNumber || '').replace(/\D/g, '');
    if (mobile.length < 8) {
      return null;
    }

    const candidates = await mysql.query<any[]>(
      `
      SELECT *
      FROM users
      WHERE deleted_at IS NOT NULL
      ORDER BY id DESC
      LIMIT 100
      `,
    );

    const match = candidates.find(row => {
      const rawMobile = String(row.mobile_number ?? row.mobileNumber ?? '');
      const prefix = `deleted_${row.id}_`;
      const original = rawMobile.toLowerCase().startsWith(prefix.toLowerCase())
        ? rawMobile.slice(prefix.length)
        : rawMobile;
      const digits = original.replace(/\D/g, '');
      const rawCountry = String(
        row.mobile_country_code ?? row.mobileCountryCode ?? '',
      ).replace(/\D/g, '');
      const countryOk = !rawCountry || rawCountry === country;
      return digits === mobile && countryOk;
    });

    return match ? mapUser(match) : null;
  }

  async restoreUser(
    userId: number,
    email: string | null,
    mobileCountryCode: string,
    mobileNumber: string,
  ): Promise<void> {
    await mysql.query<ResultSetHeader>(
      `
      UPDATE users
      SET
        deleted_at = NULL,
        email = ?,
        mobile_country_code = ?,
        mobile_number = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        email ? email.toLowerCase() : null,
        mobileCountryCode,
        mobileNumber,
        userId,
      ],
    );
  }

  parseAnonymizedValue(value: string | null | undefined, userId: number): string {
    const raw = String(value || '');
    const prefix = `deleted_${userId}_`;
    if (raw.toLowerCase().startsWith(prefix.toLowerCase())) {
      return raw.slice(prefix.length);
    }
    return raw;
  }

  async findUserByCredentials(
    mobileCountryCode: string,
    mobileNumber: string,
    email: string,
  ): Promise<AuthUser | null> {
    const rows = await mysql.query<AuthUser[]>(
      `
      SELECT *
      FROM users
      WHERE mobile_country_code = ?
      AND mobile_number = ?
      AND lower(email) = ?
      AND deleted_at IS NULL
      LIMIT 1
      `,
      [mobileCountryCode, mobileNumber, email.toLowerCase()],
    );

    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  async findUserById(
    id: number,
  ): Promise<AuthUser | null> {
    const rows = await mysql.query<AuthUser[]>(
      `
      SELECT *
      FROM users
      WHERE id = ?
      AND deleted_at IS NULL
      LIMIT 1
      `,
      [id],
    );

    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  async createUser(
    data: CreateUserData,
  ): Promise<number> {
    const result =
      await mysql.query<ResultSetHeader>(
        `
        INSERT INTO users
        (
          uuid,
          firebase_uid,
          mobile_country_code,
          mobile_number,
          email,
          full_name,
          password_hash,
          device_type,
          device_model,
          device_os,
          app_version,
          firebase_token,
          profile_completed
        )
        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          0
        )
        `,
        [
          randomUUID(),
          data.firebaseUid ??
            (data.email
              ? `email:${String(data.email).trim().toLowerCase()}`
              : `usr:${randomUUID()}`),
          data.mobileCountryCode,
          data.mobileNumber,
          data.email ? data.email.toLowerCase() : null,
          data.fullName ?? 'Devotee',
          data.passwordHash ?? null,
          data.deviceType,
          data.deviceModel ?? null,
          data.deviceOs ?? null,
          data.appVersion ?? null,
          data.firebaseToken ?? null,
        ],
      );

    return result.insertId;
  }

  async getPasswordHashByEmail(email: string): Promise<string | null> {
    const rows = await mysql.query<Array<{password_hash?: string | null}>>(
      `
      SELECT password_hash
      FROM users
      WHERE lower(email) = ?
      AND deleted_at IS NULL
      LIMIT 1
      `,
      [email.toLowerCase()],
    );
    if (!rows.length) {
      return null;
    }
    const hash = rows[0]?.password_hash;
    return hash ? String(hash) : null;
  }

  async getPasswordHashByUserId(userId: number): Promise<string | null> {
    const rows = await mysql.query<Array<{password_hash?: string | null}>>(
      `
      SELECT password_hash
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    );
    if (!rows.length) {
      return null;
    }
    const hash = rows[0]?.password_hash;
    return hash ? String(hash) : null;
  }

  async setPasswordHash(userId: number, passwordHash: string): Promise<void> {
    await mysql.query<ResultSetHeader>(
      `
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [passwordHash, userId],
    );
  }

  async ensureDevUser(data: {
    email: string;
    fullName: string;
  }): Promise<AuthUser> {
    // Match the test account by its exact email only. Matching on the seed
    // phone took over whichever devotee happened to hold that number, which
    // showed the tester that devotee's japa history under the test name.
    const wanted = String(data.email || '').trim().toLowerCase();
    const existing = await this.findUserByEmail(wanted);

    if (existing) {
      if (String(existing.email || '').toLowerCase() !== wanted) {
        throw new Error(
          'Refusing to overwrite a real user for local test login.',
        );
      }
      await this.markDevProfileComplete(existing.id, data);
      return (await this.findUserById(existing.id)) as AuthUser;
    }

    const id = await this.createUser({
      firebaseUid: `dev-local:${String(data.email).toLowerCase()}`,
      mobileCountryCode: '91',
      mobileNumber: '9999999999',
      email: data.email,
      fullName: data.fullName,
      deviceType: 'ANDROID',
    });
    await this.markDevProfileComplete(id, data);
    return (await this.findUserById(id)) as AuthUser;
  }

  async markDevProfileComplete(
    userId: number,
    data: {email: string; fullName: string},
  ): Promise<void> {
    await mysql.query<ResultSetHeader>(
      `
      UPDATE users
      SET
        full_name = ?,
        email = ?,
        gender = 'Male',
        date_of_birth = '1990-01-01',
        country_id = 1,
        state_id = 1,
        city_id = 1,
        preferred_language_id = 1,
        profile_completed = 1,
        terms_accepted = 1,
        privacy_policy_accepted = 1
      WHERE id = ?
      `,
      [data.fullName, data.email.toLowerCase(), userId],
    );
  }

  async updateLastLogin(
    userId: number,
    firebaseToken?: string,
    deviceModel?: string,
    deviceOs?: string,
    appVersion?: string,
  ): Promise<void> {
    await mysql.query<ResultSetHeader>(
      `
      UPDATE users
      SET
        firebase_token = ?,
        device_model = ?,
        device_os = ?,
        app_version = ?,
        last_login_at = NOW()
      WHERE id = ?
      `,
      [
        firebaseToken ?? null,
        deviceModel ?? null,
        deviceOs ?? null,
        appVersion ?? null,
        userId,
      ],
    );
  }

  async updateMobileIfChanged(
    userId: number,
    mobileCountryCode: string,
    mobileNumber: string,
  ): Promise<void> {
    const country = String(mobileCountryCode || '').replace(/\D/g, '');
    const mobile = String(mobileNumber || '').replace(/\D/g, '');
    if (!country || mobile.length < 6) {
      return;
    }
    await mysql.query<ResultSetHeader>(
      `
      UPDATE users
      SET
        mobile_country_code = ?,
        mobile_number = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [country, mobile, userId],
    );
  }

  async completeProfile(
    userId: number,
    data: {
      fullName: string;
      email?: string;
      gender: string;
      dateOfBirth: string;
      countryId: number;
      stateId: number;
      cityId: number;
      address?: string;
      maritalStatus?: string;
      spouseName?: string;
      spouseDob?: string;
      anniversaryDate?: string;
      gothram?: string;
      nakshatram?: string;
      preferredLanguageId: number;
      profilePhoto?: string;
    },
  ): Promise<void> {
    await mysql.query<ResultSetHeader>(
      `
      UPDATE users
      SET
        full_name = ?,
        email = ?,
        gender = ?,
        date_of_birth = ?,
        country_id = ?,
        state_id = ?,
        city_id = ?,
        address = ?,
        marital_status = ?,
        spouse_name = ?,
        spouse_dob = ?,
        anniversary_date = ?,
        gothram = ?,
        nakshatram = ?,
        preferred_language_id = ?,
        profile_photo = ?,
        profile_completed = 1
      WHERE id = ?
      `,
      [
        data.fullName,
        data.email ?? null,
        data.gender,
        data.dateOfBirth,
        data.countryId,
        data.stateId,
        data.cityId,
        data.address ?? null,
        data.maritalStatus ?? 'Bachelor',
        data.spouseName ?? null,
        data.spouseDob ?? null,
        data.anniversaryDate ?? null,
        data.gothram ?? null,
        data.nakshatram ?? null,
        data.preferredLanguageId,
        data.profilePhoto ?? null,
        userId,
      ],
    );
  }

  async softDeleteUser(
    userId: number,
    anonymizedEmail: string,
    anonymizedMobile: string,
  ): Promise<void> {
    await mysql.query<ResultSetHeader>(
      `
      UPDATE users
      SET
        deleted_at = NOW(),
        firebase_token = NULL,
        firebase_uid = ?,
        email = ?,
        mobile_number = ?
      WHERE id = ?
      AND deleted_at IS NULL
      `,
      [`deleted-uid-${userId}-${Date.now()}`, anonymizedEmail, anonymizedMobile, userId],
    );
  }
}

export default new AuthRepository();