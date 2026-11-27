import {randomBytes} from 'crypto';

import mysql from '../../database/mysql';

/**
 * Shareable admin notification links.
 * Each admin send stores its content under a random public ID, so the link
 * https://…/n/<id> can open that exact notification in the app.
 * Stores content only (no user data). Links never expire.
 */

let sharedTableReady = false;

const ensureSharedTable = async () => {
  if (sharedTableReady) {
    return;
  }
  const engine = mysql.getEngineName() || 'sqlite';
  if (engine === 'mysql') {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS admin_shared_notification (
        slug VARCHAR(32) PRIMARY KEY,
        queue_id INT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        translations TEXT NULL,
        image_url TEXT NULL,
        video_url TEXT NULL,
        link_url TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS admin_shared_notification (
        slug TEXT PRIMARY KEY,
        queue_id INTEGER NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        translations TEXT,
        image_url TEXT,
        video_url TEXT,
        link_url TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  sharedTableReady = true;
};

/** Base URL for share links. Set NOTIFY_SHARE_BASE_URL when japasiddhi.com routes /n to the backend. */
export const sharedNotificationBaseUrl = () =>
  String(
    process.env.NOTIFY_SHARE_BASE_URL || 'https://japasiddhi.onrender.com',
  ).replace(/\/+$/, '');

export const sharedNotificationUrl = (slug: string) =>
  `${sharedNotificationBaseUrl()}/n/${slug}`;

const newSlug = () => randomBytes(9).toString('base64url');

export type CreateSharedNotificationInput = {
  queueId?: number | null;
  title: string;
  message: string;
  translations?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  linkUrl?: string | null;
};

/**
 * Save a notification's content and return its share link.
 * Never throws: a failure here must not block the admin send itself.
 */
export const createSharedNotification = async (
  input: CreateSharedNotificationInput,
): Promise<{slug: string; url: string} | null> => {
  try {
    await ensureSharedTable();
  } catch (err) {
    console.warn('[shared-notify] table ensure failed:', (err as any)?.message || err);
    return null;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = newSlug();
    try {
      await mysql.query(
        `
        INSERT INTO admin_shared_notification (
          slug, queue_id, title, message, translations, image_url, video_url, link_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          slug,
          input.queueId && input.queueId > 0 ? input.queueId : null,
          String(input.title || '').slice(0, 255),
          String(input.message || ''),
          input.translations || null,
          input.imageUrl || null,
          input.videoUrl || null,
          input.linkUrl || null,
        ],
      );
      return {slug, url: sharedNotificationUrl(slug)};
    } catch (err) {
      console.warn('[shared-notify] insert attempt failed:', (err as any)?.message || err);
    }
  }
  return null;
};

export type PublicSharedNotification = {
  slug: string;
  title: string;
  message: string;
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
  translations: Record<string, {title: string; message: string}>;
  createdAt: string;
};

const parseTranslations = (raw: unknown) => {
  if (!raw) {
    return {};
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/** Public read by slug. Returns null when the ID does not exist. */
export const getSharedNotification = async (
  slugInput: string,
): Promise<PublicSharedNotification | null> => {
  const slug = String(slugInput || '').trim();
  if (!slug || slug.length > 32 || !/^[A-Za-z0-9_-]+$/.test(slug)) {
    return null;
  }
  await ensureSharedTable();
  const rows = await mysql.query<any[]>(
    `
    SELECT slug, title, message, translations, image_url AS imageUrl,
           video_url AS videoUrl, link_url AS linkUrl, created_at AS createdAt
    FROM admin_shared_notification
    WHERE slug = ?
    LIMIT 1
    `,
    [slug],
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    return null;
  }
  return {
    slug: String(row.slug),
    title: String(row.title || ''),
    message: String(row.message || ''),
    imageUrl: row.imageUrl || null,
    videoUrl: row.videoUrl || null,
    linkUrl: row.linkUrl || null,
    translations: parseTranslations(row.translations),
    createdAt: String(row.createdAt || ''),
  };
};
