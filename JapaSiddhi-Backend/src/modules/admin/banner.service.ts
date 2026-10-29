import {ResultSetHeader} from 'mysql2';

import mysql from '../../database/mysql';

export type BannerStatus = 'Active' | 'Scheduled' | 'Blocked';

let tableReady = false;

const parseJsonSafely = (val: any) => {
  if (!val) {
    return {};
  }
  if (typeof val === 'object') {
    return val;
  }
  try {
    const res = JSON.parse(String(val));
    return typeof res === 'object' && res !== null ? res : {};
  } catch {
    return {};
  }
};

const ensureBannersTable = async () => {
  if (tableReady) {
    return;
  }
  const engine = mysql.getEngineName() || 'sqlite';
  if (engine === 'mysql') {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS app_banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(500) NULL,
        module_name VARCHAR(80) NOT NULL DEFAULT 'Home',
        image_url TEXT NULL,
        button_text VARCHAR(120) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Active',
        sort_order INT NOT NULL DEFAULT 0,
        translations TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    try {
      await mysql.query(
        `ALTER TABLE app_banners ADD COLUMN translations TEXT NULL`,
      );
    } catch {
      // column already exists
    }
    try {
      await mysql.query(
        `ALTER TABLE app_banners ADD COLUMN starts_at VARCHAR(40) NULL`,
      );
    } catch {
      // column already exists
    }
    try {
      await mysql.query(
        `ALTER TABLE app_banners ADD COLUMN expires_at VARCHAR(40) NULL`,
      );
    } catch {
      // column already exists
    }
  } else {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS app_banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subtitle TEXT,
        module_name TEXT NOT NULL DEFAULT 'Home',
        image_url TEXT,
        button_text TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        sort_order INTEGER NOT NULL DEFAULT 0,
        translations TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await mysql.query(
        `ALTER TABLE app_banners ADD COLUMN translations TEXT`,
      );
    } catch {
      // column already exists
    }
    try {
      await mysql.query(
        `ALTER TABLE app_banners ADD COLUMN starts_at TEXT`,
      );
    } catch {
      // column already exists
    }
    try {
      await mysql.query(
        `ALTER TABLE app_banners ADD COLUMN expires_at TEXT`,
      );
    } catch {
      // column already exists
    }
  }

  // One-time seed only. If admin deletes all banners, do not recreate demos.
  if (engine === 'mysql') {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS app_seed_meta (
        seed_key VARCHAR(64) PRIMARY KEY,
        seeded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS app_seed_meta (
        seed_key TEXT PRIMARY KEY,
        seeded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  const markBannerSeeded = async () => {
    if (engine === 'mysql') {
      await mysql.query(
        `INSERT IGNORE INTO app_seed_meta (seed_key) VALUES (?)`,
        ['banners_v1'],
      );
    } else {
      await mysql.query(
        `INSERT OR IGNORE INTO app_seed_meta (seed_key) VALUES (?)`,
        ['banners_v1'],
      );
    }
  };
  const countRows = await mysql.query<any[]>(
    `SELECT COUNT(*) AS total FROM app_banners`,
  );
  const total = Number(countRows?.[0]?.total || 0);
  const seededRows = await mysql.query<any[]>(
    `SELECT 1 AS ok FROM app_seed_meta WHERE seed_key = ? LIMIT 1`,
    ['banners_v1'],
  );
  const alreadySeeded = Boolean(seededRows?.length);
  // Never re-insert demo banners after admin deletes them (or on redeploy).
  // Mark seed complete so empty tables stay empty.
  if (!alreadySeeded) {
    await markBannerSeeded();
  }
  // Keep `total` referenced so older callers/logs stay clear if needed.
  void total;

  tableReady = true;
};

/** Naive datetimes are treated as India Standard Time (UTC+05:30). */
const parseIstMillis = (value: unknown): number | null => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }
  const withOffset = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
    ? raw
    : `${raw.includes('T') ? raw : raw.replace(' ', 'T')}+05:30`;
  const ms = Date.parse(withOffset);
  return Number.isNaN(ms) ? null : ms;
};

const isLiveForUsers = (row: any) => {
  const status = String(row.status || 'Active');
  if (status === 'Blocked') {
    return false;
  }
  const now = Date.now();
  const expires = parseIstMillis(row.expiresAt || row.expires_at);
  if (expires != null && now >= expires) {
    return false;
  }
  const starts = parseIstMillis(row.startsAt || row.starts_at);
  if (starts == null) {
    return status === 'Active';
  }
  return now >= starts;
};

const localizeBanner = (row: any, lang?: string) => {
  const statusRaw = String(row.status || 'Active');
  const status: BannerStatus =
    statusRaw === 'Scheduled' || statusRaw === 'Blocked'
      ? statusRaw
      : 'Active';
  const translations = parseJsonSafely(
    row.translations ?? row.Translations ?? null,
  );
  const code = String(lang || 'en').toLowerCase().slice(0, 2);
  const pack = translations[code] || translations.en || {};
  return {
    id: String(row.id),
    title: String(pack.title || row.title || ''),
    subtitle: String(pack.subtitle || row.subtitle || ''),
    module: row.moduleName || row.module_name || 'Home',
    imageUrl: row.imageUrl || row.image_url || '',
    buttonText: row.buttonText || row.button_text || 'Explore',
    status,
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    startsAt: String(row.startsAt || row.starts_at || ''),
    expiresAt: String(row.expiresAt || row.expires_at || ''),
    translations,
  };
};

export const listBanners = async (
  onlyActive = false,
  moduleName?: string,
  lang?: string,
) => {
  await ensureBannersTable();
  const params: any[] = [];
  let sql = `
    SELECT
      id,
      title,
      subtitle,
      module_name AS moduleName,
      image_url AS imageUrl,
      button_text AS buttonText,
      status,
      sort_order AS sortOrder,
      starts_at AS startsAt,
      expires_at AS expiresAt,
      translations
    FROM app_banners
    WHERE 1 = 1
  `;
  if (onlyActive) {
    sql += ` AND status != 'Blocked'`;
  }
  if (moduleName) {
    sql += ` AND LOWER(module_name) = LOWER(?)`;
    params.push(moduleName);
  }
  sql += ` ORDER BY sort_order ASC, id DESC`;
  const rows = await mysql.query<any[]>(sql, params);
  const mapped = (rows || []).map(row => localizeBanner(row, lang));
  if (!onlyActive) {
    return mapped;
  }
  return mapped.filter(row =>
    isLiveForUsers({
      status: row.status,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
    }),
  );
};

export const createBanner = async (input: {
  title: string;
  subtitle?: string;
  module?: string;
  imageUrl?: string;
  buttonText?: string;
  status?: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  translations?: Record<string, any> | string | null;
}) => {
  await ensureBannersTable();
  const title = String(input.title || '').trim();
  if (!title) {
    const error: any = new Error('Banner title is required.');
    error.statusCode = 400;
    throw error;
  }
  const statusRaw = String(input.status || 'Active');
  const status: BannerStatus =
    statusRaw === 'Scheduled' || statusRaw === 'Blocked'
      ? statusRaw
      : 'Active';
  const moduleName = String(input.module || 'Home').trim() || 'Home';
  const translations =
    typeof input.translations === 'object' && input.translations
      ? JSON.stringify(input.translations)
      : input.translations
        ? String(input.translations)
        : null;

  const result = await mysql.query<ResultSetHeader>(
    `
    INSERT INTO app_banners (
      title, subtitle, module_name, image_url, button_text, status, sort_order, translations, starts_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `,
    [
      title,
      String(input.subtitle || '').trim() || null,
      moduleName,
      String(input.imageUrl || '').trim() || null,
      String(input.buttonText || 'Explore').trim() || 'Explore',
      status,
      translations,
      String(input.startsAt || '').trim() || null,
      String(input.expiresAt || '').trim() || null,
    ],
  );

  const rows = await mysql.query<any[]>(
    `
    SELECT
      id, title, subtitle, module_name AS moduleName,
      image_url AS imageUrl, button_text AS buttonText, status,
      sort_order AS sortOrder, starts_at AS startsAt, expires_at AS expiresAt, translations
    FROM app_banners
    WHERE id = ?
    LIMIT 1
    `,
    [result.insertId],
  );
  return localizeBanner(rows[0]);
};

export const updateBanner = async (
  id: number,
  input: {
    title?: string;
    subtitle?: string;
    module?: string;
    imageUrl?: string;
    buttonText?: string;
    status?: string;
    startsAt?: string | null;
    expiresAt?: string | null;
    translations?: Record<string, any> | string | null;
  },
) => {
  await ensureBannersTable();
  const existing = await mysql.query<any[]>(
    `SELECT id, status FROM app_banners WHERE id = ? LIMIT 1`,
    [id],
  );
  if (!existing?.length) {
    const error: any = new Error('Banner not found.');
    error.statusCode = 404;
    throw error;
  }

  const statusRaw =
    input.status !== undefined
      ? String(input.status)
      : String(existing[0].status);
  const status: BannerStatus =
    statusRaw === 'Scheduled' || statusRaw === 'Blocked'
      ? statusRaw
      : 'Active';

  const translations =
    input.translations === undefined
      ? undefined
      : typeof input.translations === 'object' && input.translations
        ? JSON.stringify(input.translations)
        : input.translations
          ? String(input.translations)
          : null;

  await mysql.query(
    `
    UPDATE app_banners
    SET
      title = COALESCE(?, title),
      subtitle = COALESCE(?, subtitle),
      module_name = COALESCE(?, module_name),
      image_url = COALESCE(?, image_url),
      button_text = COALESCE(?, button_text),
      status = ?,
      translations = COALESCE(?, translations),
      starts_at = CASE WHEN ? = 1 THEN ? ELSE starts_at END,
      expires_at = CASE WHEN ? = 1 THEN ? ELSE expires_at END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [
      input.title !== undefined ? String(input.title).trim() : null,
      input.subtitle !== undefined ? String(input.subtitle).trim() : null,
      input.module !== undefined ? String(input.module).trim() : null,
      input.imageUrl !== undefined ? String(input.imageUrl).trim() : null,
      input.buttonText !== undefined ? String(input.buttonText).trim() : null,
      status,
      translations === undefined ? null : translations,
      input.startsAt !== undefined ? 1 : 0,
      input.startsAt !== undefined
        ? String(input.startsAt || '').trim() || null
        : null,
      input.expiresAt !== undefined ? 1 : 0,
      input.expiresAt !== undefined
        ? String(input.expiresAt || '').trim() || null
        : null,
      id,
    ],
  );

  const rows = await mysql.query<any[]>(
    `
    SELECT
      id, title, subtitle, module_name AS moduleName,
      image_url AS imageUrl, button_text AS buttonText, status,
      sort_order AS sortOrder, starts_at AS startsAt, expires_at AS expiresAt, translations
    FROM app_banners
    WHERE id = ?
    LIMIT 1
    `,
    [id],
  );
  return localizeBanner(rows[0]);
};

export const deleteBanner = async (id: number) => {
  await ensureBannersTable();
  await mysql.query(`DELETE FROM app_banners WHERE id = ?`, [id]);
};

export default {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
