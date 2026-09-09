import mysql from '../../database/mysql';

export type AnnadanamFeatureKey = 'japa' | 'general' | 'campaigns';

export type AnnadanamFeature = {
  id: string;
  key: AnnadanamFeatureKey;
  title: string;
  subtitle: string;
  active: boolean;
};

const FEATURES: Array<{
  id: string;
  key: AnnadanamFeatureKey;
  title: string;
  subtitle: string;
}> = [
  {
    id: '1',
    key: 'japa',
    title: 'Japa Annadanam',
    subtitle: 'Milestone participation',
  },
  {
    id: '2',
    key: 'general',
    title: 'General Annadanam',
    subtitle: 'Donations',
  },
  {
    id: '3',
    key: 'campaigns',
    title: 'Campaigns',
    subtitle: 'Festival campaigns',
  },
];

let tableReady = false;

const ensureTable = async () => {
  if (tableReady) {
    return;
  }
  const engine = mysql.getEngineName() || 'sqlite';
  if (engine === 'mysql') {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS annadanam_features (
        feature_key VARCHAR(40) PRIMARY KEY,
        title VARCHAR(120) NOT NULL,
        subtitle VARCHAR(255) NULL,
        is_active TINYINT NOT NULL DEFAULT 1,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } else {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS annadanam_features (
        feature_key TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  for (const feature of FEATURES) {
    const existing = await mysql.query<any[]>(
      `SELECT feature_key FROM annadanam_features WHERE feature_key = ? LIMIT 1`,
      [feature.key],
    );
    if (!existing?.length) {
      await mysql.query(
        `
        INSERT INTO annadanam_features (feature_key, title, subtitle, is_active)
        VALUES (?, ?, ?, 1)
        `,
        [feature.key, feature.title, feature.subtitle],
      );
    }
  }
  tableReady = true;
};

export const listAnnadanamFeatures = async (): Promise<AnnadanamFeature[]> => {
  await ensureTable();
  const rows = await mysql.query<any[]>(`
    SELECT feature_key AS featureKey, title, subtitle, is_active AS isActive
    FROM annadanam_features
  `);
  const byKey = new Map(
    (rows || []).map(row => [String(row.featureKey), row]),
  );

  return FEATURES.map(feature => {
    const row = byKey.get(feature.key);
    return {
      id: feature.id,
      key: feature.key,
      title: row?.title || feature.title,
      subtitle: row?.subtitle || feature.subtitle,
      active: row ? Number(row.isActive) === 1 : true,
    };
  });
};

export const setAnnadanamFeatureActive = async (
  idOrKey: string,
  active: boolean,
) => {
  await ensureTable();
  const feature =
    FEATURES.find(item => item.id === String(idOrKey)) ||
    FEATURES.find(item => item.key === String(idOrKey));
  if (!feature) {
    const error: any = new Error('Annadanam feature not found.');
    error.statusCode = 404;
    throw error;
  }

  await mysql.query(
    `
    UPDATE annadanam_features
    SET is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE feature_key = ?
    `,
    [active ? 1 : 0, feature.key],
  );

  const list = await listAnnadanamFeatures();
  return list.find(item => item.key === feature.key)!;
};

export const getAnnadanamVisibility = async () => {
  const list = await listAnnadanamFeatures();
  const map = Object.fromEntries(list.map(item => [item.key, item.active]));
  return {
    japa: Boolean(map.japa),
    general: Boolean(map.general),
    campaigns: Boolean(map.campaigns),
    any: Boolean(map.japa || map.general || map.campaigns),
  };
};

export default {
  listAnnadanamFeatures,
  setAnnadanamFeatureActive,
  getAnnadanamVisibility,
};
