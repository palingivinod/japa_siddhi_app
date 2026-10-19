import mysql from '../../database/mysql';

export interface OtpChallenge {
  id: number;
  mobileCountryCode: string;
  mobileNumber: string;
  sessionId: string;
  codeHash: string | null;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

const emailSessionId = (email: string) =>
  `email:${String(email || '').trim().toLowerCase()}`;

const phoneSessionId = (countryCode: string, mobileNumber: string) =>
  `phone:${String(countryCode || '').replace(/\D/g, '')}:${String(
    mobileNumber || '',
  ).replace(/\D/g, '')}`;

class OtpRepository {
  async findActiveBySession(sessionId: string): Promise<OtpChallenge | null> {
    const key = String(sessionId || '').trim();
    if (!key) {
      return null;
    }
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        mobile_country_code AS mobileCountryCode,
        mobile_number AS mobileNumber,
        session_id AS sessionId,
        code_hash AS codeHash,
        expires_at AS expiresAt,
        attempts,
        created_at AS createdAt
      FROM otp_challenges
      WHERE session_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [key],
    );

    return rows[0] ?? null;
  }

  async findActiveByEmail(email: string): Promise<OtpChallenge | null> {
    return this.findActiveBySession(emailSessionId(email));
  }

  async findActiveByPhone(
    mobileCountryCode: string,
    mobileNumber: string,
  ): Promise<OtpChallenge | null> {
    return this.findActiveBySession(
      phoneSessionId(mobileCountryCode, mobileNumber),
    );
  }

  /** @deprecated Prefer findActiveByEmail / findActiveByPhone. */
  async findActive(
    mobileCountryCode: string,
    mobileNumber: string,
  ): Promise<OtpChallenge | null> {
    return this.findActiveByPhone(mobileCountryCode, mobileNumber);
  }

  async save(data: {
    mobileCountryCode: string;
    mobileNumber: string;
    email?: string;
    channel?: 'email' | 'phone';
    codeHash?: string | null;
    expiresAt: number;
  }): Promise<void> {
    const channel =
      data.channel === 'phone' ||
      (!data.email && data.mobileNumber)
        ? 'phone'
        : 'email';
    const sessionId =
      channel === 'phone'
        ? phoneSessionId(data.mobileCountryCode, data.mobileNumber)
        : emailSessionId(String(data.email || ''));

    await mysql.query(
      `
      DELETE FROM otp_challenges
      WHERE session_id = ?
      `,
      [sessionId],
    );

    await mysql.query(
      `
      INSERT INTO otp_challenges
      (
        mobile_country_code,
        mobile_number,
        session_id,
        code_hash,
        expires_at,
        attempts,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, 0, ?)
      `,
      [
        data.mobileCountryCode,
        data.mobileNumber,
        sessionId,
        data.codeHash ?? null,
        data.expiresAt,
        Date.now(),
      ],
    );
  }

  async incrementAttempts(id: number): Promise<void> {
    await mysql.query(
      `
      UPDATE otp_challenges
      SET attempts = attempts + 1
      WHERE id = ?
      `,
      [id],
    );
  }

  async deleteByEmail(email: string): Promise<void> {
    await mysql.query(
      `
      DELETE FROM otp_challenges
      WHERE session_id = ?
      `,
      [emailSessionId(email)],
    );
  }

  async deleteByPhone(
    mobileCountryCode: string,
    mobileNumber: string,
  ): Promise<void> {
    await mysql.query(
      `
      DELETE FROM otp_challenges
      WHERE session_id = ?
      `,
      [phoneSessionId(mobileCountryCode, mobileNumber)],
    );
  }

  async delete(
    mobileCountryCode: string,
    mobileNumber: string,
  ): Promise<void> {
    await this.deleteByPhone(mobileCountryCode, mobileNumber);
  }
}

export default new OtpRepository();
