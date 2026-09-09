import {ResultSetHeader} from 'mysql2';

import mysql from '../../database/mysql';

export type BannerStatus = 'Active' | 'Scheduled' | 'Blocked';

let tableReady = false;

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
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
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
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  const countRows = await mysql.query<any[]>(
    `SELECT COUNT(*) AS total FROM app_banners`,
  );
  const total = Number(countRows?.[0]?.total || 0);
  if (total === 0) {
    const seeds = [
      ['Kartika Masam', 'Season of devotion', 'Home', 'Active', 1],
      ['Japa Rewards', 'Join challenges and earn', 'Challenges', 'Scheduled', 2],
      ['Annadanam', 'Feed with love', 'Annadanam', 'Blocked', 3],
    ];
    for (const [title, subtitle, moduleName, status, sortOrder] of seeds) {
      await mysql.query(
        `
        INSERT INTO app_banners (
          title, subtitle, module_name, status, sort_order, button_text
        ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [title, subtitle, moduleName, status, sortOrder, 'Explore'],
      );
    }
  }

  tableReady = true;
};

const mapBanner = (row: any) => {
  const statusRaw = String(row.status || 'Active');
  const status: BannerStatus =
    statusRaw === 'Scheduled' || statusRaw === 'Blocked'
      ? statusRaw
      : 'Active';
  return {
    id: String(row.id),
    title: row.title || '',
    subtitle: row.subtitle || '',
    module: row.moduleName || row.module_name || 'Home',
    imageUrl: row.imageUrl || row.image_url || '',
    buttonText: row.buttonText || row.button_text || 'Explore',
    status,
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
  };
};

export const listBanners = async (onlyActive = false, moduleName?: string) => {
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
      sort_order AS sortOrder
    FROM app_banners
    WHERE 1 = 1
  `;
  if (onlyActive) {
    sql += ` AND status = 'Active'`;
  }
  if (moduleName) {
    sql += ` AND LOWER(module_name) = LOWER(?)`;
    params.push(moduleName);
  }
  sql += ` ORDER BY sort_order ASC, id DESC`;
  const rows = await mysql.query<any[]>(sql, params);
  return (rows || []).map(mapBanner);
};

export const createBanner = async (input: {
  title: string;
  subtitle?: string;
  module?: string;
  imageUrl?: string;
  buttonText?: string;
  status?: string;
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

  const result = await mysql.query<ResultSetHeader>(
    `
    INSERT INTO app_banners (
      title, subtitle, module_name, image_url, button_text, status, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, 0)
    `,
    [
      title,
      String(input.subtitle || '').trim() || null,
      moduleName,
      String(input.imageUrl || '').trim() || null,
      String(input.buttonText || 'Explore').trim() || 'Explore',
      status,
    ],
  );

  const rows = await mysql.query<any[]>(
    `
    SELECT
      id, title, subtitle, module_name AS moduleName,
      image_url AS imageUrl, button_text AS buttonText, status,
      sort_order AS sortOrder
    FROM app_banners
    WHERE id = ?
    LIMIT 1
    `,
    [result.insertId],
  );
  return mapBanner(rows[0]);
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

  const statusRaw = input.status !== undefined
    ? String(input.status)
    : String(existing[0].status);
  const status: BannerStatus =
    statusRaw === 'Scheduled' || statusRaw === 'Blocked'
      ? statusRaw
      : 'Active';

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
      id,
    ],
  );

  const rows = await mysql.query<any[]>(
    `
    SELECT
      id, title, subtitle, module_name AS moduleName,
      image_url AS imageUrl, button_text AS buttonText, status,
      sort_order AS sortOrder
    FROM app_banners
    WHERE id = ?
    LIMIT 1
    `,
    [id],
  );
  return mapBanner(rows[0]);
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
