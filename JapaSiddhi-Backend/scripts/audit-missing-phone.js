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

const pool = new Pool({
  connectionString,
  ssl: {rejectUnauthorized: false},
});

async function q(sql, params = []) {
  return (await pool.query(sql, params)).rows;
}

(async () => {
  const total = (await q('SELECT COUNT(*)::int AS c FROM users'))[0].c;

  const byLogin = await q(`
    SELECT COALESCE(login_type, '(null)') AS login_type, COUNT(*)::int AS c
    FROM users
    GROUP BY 1
    ORDER BY c DESC
  `);

  const phoneBuckets = await q(`
    SELECT
      COUNT(*)::int AS total_users,
      COUNT(*) FILTER (WHERE mobile_number IS NULL)::int AS null_mobile,
      COUNT(*) FILTER (WHERE mobile_number IS NOT NULL AND TRIM(mobile_number) = '')::int AS blank_mobile,
      COUNT(*) FILTER (
        WHERE LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) BETWEEN 1 AND 9
      )::int AS short_digits,
      COUNT(*) FILTER (
        WHERE LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) >= 10
      )::int AS has_10plus_digits,
      COUNT(*) FILTER (
        WHERE mobile_number IS NULL
           OR TRIM(mobile_number) = ''
           OR LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) < 10
      )::int AS missing_by_export_rule
    FROM users
  `);

  const missingByLogin = await q(`
    SELECT COALESCE(login_type, '(null)') AS login_type, COUNT(*)::int AS c
    FROM users
    WHERE mobile_number IS NULL
       OR TRIM(mobile_number) = ''
       OR LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) < 10
    GROUP BY 1
    ORDER BY c DESC
  `);

  const byAuth = await q(`
    SELECT COALESCE(auth_provider, '(null)') AS auth_provider, COUNT(*)::int AS c
    FROM users
    WHERE mobile_number IS NULL
       OR TRIM(mobile_number) = ''
       OR LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) < 10
    GROUP BY 1
    ORDER BY c DESC
  `);

  const samples = await q(`
    SELECT
      id,
      user_code,
      full_name,
      login_type,
      auth_provider,
      mobile_country_code,
      mobile_number,
      LENGTH(COALESCE(mobile_number, '')) AS raw_len,
      LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) AS digit_len,
      (firebase_uid IS NOT NULL AND TRIM(firebase_uid) <> '') AS has_firebase,
      email
    FROM users
    WHERE mobile_number IS NULL
       OR TRIM(mobile_number) = ''
       OR LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) < 10
    ORDER BY id DESC
    LIMIT 20
  `);

  const weirdFilled = await q(`
    SELECT id, login_type, mobile_number, auth_provider
    FROM users
    WHERE mobile_number IS NOT NULL
      AND TRIM(mobile_number) <> ''
      AND LENGTH(REGEXP_REPLACE(mobile_number, '[^0-9]', '', 'g')) < 10
    LIMIT 20
  `);

  const withEmailNoPhone = await q(`
    SELECT COUNT(*)::int AS c
    FROM users
    WHERE (mobile_number IS NULL OR TRIM(mobile_number) = ''
           OR LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) < 10)
      AND email IS NOT NULL AND TRIM(email) <> ''
  `);

  console.log(
    JSON.stringify(
      {
        total,
        phoneBuckets: phoneBuckets[0],
        byLogin,
        missingByLogin,
        byAuth,
        withEmailNoPhone: withEmailNoPhone[0].c,
        samples,
        weirdFilled,
      },
      null,
      2,
    ),
  );
  await pool.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
