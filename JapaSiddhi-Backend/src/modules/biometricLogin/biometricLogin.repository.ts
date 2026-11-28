import mysql from '../../database/mysql';

/**
 * Fingerprint / face login credentials, one per phone install (device_id).
 * Only a SHA-256 hash of the credential is stored. The table is created on
 * first use, the same way as calendar_tasks, so no other schema is touched.
 */

export type BiometricLoginRow = {
  id: number;
  userId: number;
  deviceId: string;
  tokenHash: string;
  expiresAtMs: number;
};

let tableReady: Promise<void> | null = null;

const ddl = (engine: string) => {
  if (engine === 'postgres') {
    return `
      CREATE TABLE IF NOT EXISTS biometric_logins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        device_id VARCHAR(64) NOT NULL UNIQUE,
        token_hash VARCHAR(64) NOT NULL,
        created_at_ms BIGINT NOT NULL,
        expires_at_ms BIGINT NOT NULL,
        last_used_at_ms BIGINT NOT NULL DEFAULT 0
      )
    `;
  }
  if (engine === 'mysql') {
    return `
      CREATE TABLE IF NOT EXISTS biometric_logins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        device_id VARCHAR(64) NOT NULL UNIQUE,
        token_hash VARCHAR(64) NOT NULL,
        created_at_ms BIGINT NOT NULL,
        expires_at_ms BIGINT NOT NULL,
        last_used_at_ms BIGINT NOT NULL DEFAULT 0
      )
    `;
  }
  return `
    CREATE TABLE IF NOT EXISTS biometric_logins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      device_id TEXT NOT NULL UNIQUE,
      token_hash TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL,
      expires_at_ms INTEGER NOT NULL,
      last_used_at_ms INTEGER NOT NULL DEFAULT 0
    )
  `;
};

export const ensureBiometricLoginTable = async (): Promise<void> => {
  if (!tableReady) {
    tableReady = (async () => {
      await mysql.query('SELECT 1');
      const engine = mysql.getEngineName() || 'sqlite';
      await mysql.query(ddl(engine));
      try {
        await mysql.query(
          'CREATE INDEX IF NOT EXISTS idx_biometric_logins_user ON biometric_logins(user_id)',
        );
      } catch {
        // MySQL has no IF NOT EXISTS for indexes; a duplicate is harmless.
      }
    })().catch(error => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
};

export const findByDevice = async (
  deviceId: string,
): Promise<BiometricLoginRow | null> => {
  await ensureBiometricLoginTable();
  const rows = await mysql.query<any[]>(
    `
    SELECT
      id,
      user_id AS userId,
      device_id AS deviceId,
      token_hash AS tokenHash,
      expires_at_ms AS expiresAtMs
    FROM biometric_logins
    WHERE device_id = ?
    LIMIT 1
    `,
    [deviceId],
  );
  const raw = rows?.[0];
  if (!raw) {
    return null;
  }
  return {
    id: Number(raw.id),
    userId: Number(raw.userId),
    deviceId: String(raw.deviceId),
    tokenHash: String(raw.tokenHash),
    expiresAtMs: Number(raw.expiresAtMs),
  };
};

/** Replaces whatever credential this phone had (any user) with a new one. */
export const replaceForDevice = async (data: {
  userId: number;
  deviceId: string;
  tokenHash: string;
  createdAtMs: number;
  expiresAtMs: number;
}): Promise<void> => {
  await ensureBiometricLoginTable();
  await mysql.query('DELETE FROM biometric_logins WHERE device_id = ?', [
    data.deviceId,
  ]);
  await mysql.query(
    `
    INSERT INTO biometric_logins
      (user_id, device_id, token_hash, created_at_ms, expires_at_ms, last_used_at_ms)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      data.userId,
      data.deviceId,
      data.tokenHash,
      data.createdAtMs,
      data.expiresAtMs,
      data.createdAtMs,
    ],
  );
};

export const touchLastUsed = async (id: number, nowMs: number) => {
  await mysql.query(
    'UPDATE biometric_logins SET last_used_at_ms = ? WHERE id = ?',
    [nowMs, id],
  );
};

export const deleteForDevice = async (userId: number, deviceId: string) => {
  await ensureBiometricLoginTable();
  await mysql.query(
    'DELETE FROM biometric_logins WHERE user_id = ? AND device_id = ?',
    [userId, deviceId],
  );
};

/** Used on password change, account deletion and password reset. */
export const deleteAllForUser = async (userId: number) => {
  await ensureBiometricLoginTable();
  await mysql.query('DELETE FROM biometric_logins WHERE user_id = ?', [userId]);
};

export default {
  findByDevice,
  replaceForDevice,
  touchLastUsed,
  deleteForDevice,
  deleteAllForUser,
};
