require('dotenv').config({path: require('path').join(__dirname, '..', '.env')});
const {Pool} = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  [
    'postgresql://japasiddhi_database_user:',
    '8FBnzCgO8zLxC66riAkgljsGYEmB8WJ8',
    '@dpg-dbea8n9srm7s73bfn8cg-a.ohio-postgres.render.com/japasiddhi_database',
  ].join('');

const pool = new Pool({connectionString, ssl: {rejectUnauthorized: false}});

async function q(sql, params = []) {
  return (await pool.query(sql, params)).rows;
}

(async () => {
  // Normalize names for matching
  const stats = await q(`
    WITH base AS (
      SELECT
        id,
        user_code,
        full_name,
        LOWER(TRIM(REGEXP_REPLACE(COALESCE(full_name, ''), '\\s+', ' ', 'g'))) AS name_key,
        email,
        auth_provider,
        mobile_number,
        LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) AS digit_len,
        created_at,
        last_login_at,
        CASE
          WHEN last_login_at IS NULL OR TRIM(last_login_at) = '' THEN NULL
          ELSE last_login_at::timestamptz
        END AS last_login_ts,
        CASE
          WHEN created_at IS NULL OR TRIM(created_at) = '' THEN NULL
          ELSE created_at::timestamptz
        END AS created_ts
      FROM users
    ),
    missing AS (
      SELECT * FROM base
      WHERE mobile_number IS NULL
         OR TRIM(mobile_number) = ''
         OR digit_len < 10
    ),
    name_counts AS (
      SELECT name_key, COUNT(*)::int AS total_with_name
      FROM base
      WHERE name_key <> '' AND name_key <> 'devotee'
      GROUP BY name_key
    ),
    missing_name_counts AS (
      SELECT name_key, COUNT(*)::int AS missing_with_name
      FROM missing
      WHERE name_key <> '' AND name_key <> 'devotee'
      GROUP BY name_key
    )
    SELECT
      (SELECT COUNT(*)::int FROM missing) AS missing_total,
      (SELECT COUNT(*)::int FROM missing m
        LEFT JOIN name_counts nc ON nc.name_key = m.name_key
        WHERE m.name_key = '' OR m.name_key = 'devotee' OR COALESCE(nc.total_with_name,1) = 1
      ) AS missing_unique_name,
      (SELECT COUNT(*)::int FROM missing m
        JOIN name_counts nc ON nc.name_key = m.name_key
        WHERE nc.total_with_name > 1
      ) AS missing_dup_name_rows,
      (SELECT COUNT(*)::int FROM missing_name_counts WHERE missing_with_name > 1) AS names_dup_within_missing,
      (SELECT COUNT(*)::int FROM missing m
        JOIN name_counts nc ON nc.name_key = m.name_key
        WHERE nc.total_with_name > 1
          AND EXISTS (
            SELECT 1 FROM base b
            WHERE b.name_key = m.name_key
              AND b.id <> m.id
              AND b.digit_len >= 10
          )
      ) AS missing_who_have_sibling_with_phone
  `);

  const recentCutoffs = await q(`
    WITH missing AS (
      SELECT
        id,
        LOWER(TRIM(REGEXP_REPLACE(COALESCE(full_name, ''), '\\s+', ' ', 'g'))) AS name_key,
        CASE
          WHEN last_login_at IS NULL OR TRIM(last_login_at) = '' THEN NULL
          ELSE last_login_at::timestamptz
        END AS last_login_ts,
        CASE
          WHEN created_at IS NULL OR TRIM(created_at) = '' THEN NULL
          ELSE created_at::timestamptz
        END AS created_ts
      FROM users
      WHERE mobile_number IS NULL
         OR TRIM(mobile_number) = ''
         OR LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) < 10
    )
    SELECT
      COUNT(*) FILTER (WHERE last_login_ts >= NOW() - INTERVAL '30 days')::int AS login_30d,
      COUNT(*) FILTER (WHERE last_login_ts >= NOW() - INTERVAL '90 days')::int AS login_90d,
      COUNT(*) FILTER (WHERE last_login_ts >= NOW() - INTERVAL '180 days')::int AS login_180d,
      COUNT(*) FILTER (WHERE created_ts >= NOW() - INTERVAL '30 days')::int AS created_30d,
      COUNT(*) FILTER (WHERE created_ts >= NOW() - INTERVAL '90 days')::int AS created_90d,
      COUNT(*) FILTER (WHERE last_login_ts IS NULL)::int AS never_login_or_bad
    FROM missing
  `);

  const samples = await q(`
    WITH base AS (
      SELECT
        id,
        user_code,
        full_name,
        LOWER(TRIM(REGEXP_REPLACE(COALESCE(full_name, ''), '\\s+', ' ', 'g'))) AS name_key,
        email,
        auth_provider,
        mobile_number,
        LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) AS digit_len,
        created_at,
        last_login_at
      FROM users
    ),
    dup_names AS (
      SELECT name_key
      FROM base
      WHERE name_key <> '' AND name_key <> 'devotee'
      GROUP BY name_key
      HAVING COUNT(*) > 1
    )
    SELECT
      m.id,
      m.user_code,
      m.full_name,
      m.email,
      m.auth_provider,
      m.mobile_number,
      m.created_at,
      m.last_login_at,
      (SELECT COUNT(*)::int FROM base b WHERE b.name_key = m.name_key) AS same_name_count,
      (SELECT COUNT(*)::int FROM base b WHERE b.name_key = m.name_key AND b.digit_len >= 10) AS same_name_with_phone,
      (
        SELECT json_agg(json_build_object(
          'id', b.id,
          'user_code', b.user_code,
          'digits', b.digit_len,
          'mobile', b.mobile_number,
          'last_login', b.last_login_at,
          'created', b.created_at,
          'email', b.email
        ) ORDER BY b.last_login_at DESC NULLS LAST)
        FROM base b
        WHERE b.name_key = m.name_key
      ) AS siblings
    FROM base m
    JOIN dup_names d ON d.name_key = m.name_key
    WHERE m.mobile_number IS NULL
       OR TRIM(m.mobile_number) = ''
       OR m.digit_len < 10
    ORDER BY m.last_login_at DESC NULLS LAST
    LIMIT 12
  `);

  console.log(JSON.stringify({stats: stats[0], recentCutoffs: recentCutoffs[0], samples}, null, 2));
  await pool.end();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
