/**
 * Ops: count app versions + dry-run japa inflate repair against live API
 * or DATABASE_URL if set.
 */
require('dotenv').config();

const API = process.env.API_URL || 'https://japasiddhi.onrender.com/api/v1';

async function viaApi() {
  const res = await fetch(`${API}/admin/japa/repair-inflate`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({dryRun: true}),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = {raw: text.slice(0, 500)};
  }
  return {status: res.status, json};
}

async function viaDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  const {Client} = require('pg');
  const c = new Client({
    connectionString: url,
    ssl: url.includes('localhost') ? false : {rejectUnauthorized: false},
  });
  await c.connect();
  const versions = await c.query(
    `SELECT COALESCE(NULLIF(TRIM(app_version), ''), '(none)') AS version,
            COUNT(*)::int AS users
     FROM users
     WHERE deleted_at IS NULL
     GROUP BY 1
     ORDER BY users DESC`,
  );
  const v130 = await c.query(
    `SELECT COUNT(*)::int AS users
     FROM users
     WHERE deleted_at IS NULL
       AND TRIM(app_version) LIKE '1.3.0%'`,
  );
  const inflate = await c.query(
    `SELECT COUNT(*)::int AS row_count,
            COUNT(DISTINCT user_id)::int AS user_count,
            COALESCE(SUM(session_count),0)::bigint AS japa_sum,
            COALESCE(MAX(session_count),0)::int AS max_row
     FROM japa_sessions
     WHERE session_count >= 501
       AND created_at >= '2026-11-16'`,
  );
  const sample = await c.query(
    `SELECT id, user_id, session_count, created_at
     FROM japa_sessions
     WHERE session_count >= 501
       AND created_at >= '2026-11-16'
     ORDER BY session_count DESC
     LIMIT 20`,
  );
  await c.end();
  return {
    versions: versions.rows,
    on130: v130.rows[0]?.users || 0,
    inflate: inflate.rows[0],
    sample: sample.rows,
  };
}

(async () => {
  console.log('API_BASE', API);
  try {
    const api = await viaApi();
    console.log('API_STATUS', api.status);
    console.log('API_BODY', JSON.stringify(api.json, null, 2));
  } catch (e) {
    console.log('API_ERR', e.message);
  }
  try {
    const db = await viaDb();
    if (!db) {
      console.log('DB', 'no DATABASE_URL in env');
    } else {
      console.log('ON_1_3_0', db.on130);
      console.log('VERSIONS', JSON.stringify(db.versions, null, 2));
      console.log('INFLATE', JSON.stringify(db.inflate, null, 2));
      console.log('SAMPLE', JSON.stringify(db.sample, null, 2));
    }
  } catch (e) {
    console.log('DB_ERR', e.message);
  }
})();
