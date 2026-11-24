require('dotenv').config({path: require('path').join(__dirname, '..', '.env')});
const {Pool} = require('pg');
const cs =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  [
    'postgresql://japasiddhi_database_user:',
    '8FBnzCgO8zLxC66riAkgljsGYEmB8WJ8',
    '@dpg-dbea8n9srm7s73bfn8cg-a.ohio-postgres.render.com/japasiddhi_database',
  ].join('');
const pool = new Pool({connectionString: cs, ssl: {rejectUnauthorized: false}});

(async () => {
  const {rows} = await pool.query(
    `
    SELECT
      id, user_code, full_name, email, auth_provider,
      mobile_country_code, mobile_number,
      LENGTH(REGEXP_REPLACE(COALESCE(mobile_number,''),'[^0-9]','','g')) AS digit_len,
      account_status, login_type, created_at, last_login_at,
      firebase_uid
    FROM users
    WHERE id = 97 OR user_code = 'BPJS97' OR user_code ILIKE '%97'
      OR email = 'vaddadinarasimharamakrishna@gmail.com'
    ORDER BY id
    LIMIT 10
    `,
  );
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
