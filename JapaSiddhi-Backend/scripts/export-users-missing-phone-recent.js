/**
 * Missing-phone users, excluding old/name-duplicates.
 * Keep:
 *  - unique-name users with no phone, OR
 *  - among same-name groups, only the most recent login (fallback: created)
 * Drop:
 *  - anyone whose same name already has a valid phone account
 *  - deleted_* placeholder accounts
 */
require('dotenv').config({path: require('path').join(__dirname, '..', '.env')});

const path = require('path');
const fs = require('fs');
const {Pool} = require('pg');
const ExcelJS = require('exceljs');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  [
    'postgresql://japasiddhi_database_user:',
    '8FBnzCgO8zLxC66riAkgljsGYEmB8WJ8',
    '@dpg-dbea8n9srm7s73bfn8cg-a.ohio-postgres.render.com/japasiddhi_database',
  ].join('');

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: {rejectUnauthorized: false},
  });

  const sql = `
    WITH base AS (
      SELECT
        u.id,
        u.user_code,
        u.full_name,
        LOWER(TRIM(REGEXP_REPLACE(COALESCE(u.full_name, ''), '\\s+', ' ', 'g'))) AS name_key,
        u.email,
        u.auth_provider,
        u.mobile_country_code,
        u.mobile_number,
        LENGTH(REGEXP_REPLACE(COALESCE(u.mobile_number, ''), '[^0-9]', '', 'g')) AS digit_len,
        u.account_status,
        u.login_type,
        u.created_at,
        u.last_login_at,
        CASE
          WHEN u.last_login_at IS NULL OR TRIM(u.last_login_at) = '' THEN NULL
          ELSE u.last_login_at::timestamptz
        END AS last_login_ts,
        CASE
          WHEN u.created_at IS NULL OR TRIM(u.created_at) = '' THEN NULL
          ELSE u.created_at::timestamptz
        END AS created_ts
      FROM users u
    ),
    missing AS (
      SELECT *
      FROM base
      WHERE (mobile_number IS NULL OR TRIM(mobile_number) = '' OR digit_len < 10)
        AND COALESCE(email, '') NOT ILIKE 'deleted_%'
        AND COALESCE(mobile_number, '') NOT ILIKE 'deleted_%'
        AND COALESCE(email, '') NOT ILIKE '%@cloudtestlabaccounts.com'
    ),
    name_stats AS (
      SELECT
        name_key,
        COUNT(*)::int AS same_name_total,
        COUNT(*) FILTER (WHERE digit_len >= 10)::int AS same_name_with_phone
      FROM base
      WHERE name_key <> '' AND name_key <> 'devotee'
      GROUP BY name_key
    ),
    candidates AS (
      SELECT
        m.*,
        COALESCE(ns.same_name_total, 1) AS same_name_total,
        COALESCE(ns.same_name_with_phone, 0) AS same_name_with_phone
      FROM missing m
      LEFT JOIN name_stats ns ON ns.name_key = m.name_key
      WHERE
        -- Generic placeholder name: treat as unique by id (keep)
        m.name_key = '' OR m.name_key = 'devotee'
        -- Real name: drop if another account with same name already has phone
        OR COALESCE(ns.same_name_with_phone, 0) = 0
    ),
    ranked AS (
      SELECT
        c.*,
        ROW_NUMBER() OVER (
          PARTITION BY
            CASE
              WHEN c.name_key = '' OR c.name_key = 'devotee' THEN 'id:' || c.id::text
              ELSE c.name_key
            END
          ORDER BY
            c.last_login_ts DESC NULLS LAST,
            c.created_ts DESC NULLS LAST,
            c.id DESC
        ) AS name_rank
      FROM candidates c
    )
    SELECT
      id,
      user_code AS "userCode",
      full_name AS "fullName",
      email,
      auth_provider AS "authProvider",
      mobile_country_code AS "mobileCountryCode",
      mobile_number AS "mobileNumber",
      account_status AS "accountStatus",
      login_type AS "loginType",
      created_at AS "createdAt",
      last_login_at AS "lastLoginAt",
      same_name_total AS "sameNameTotal",
      same_name_with_phone AS "sameNameWithPhone",
      CASE
        WHEN name_key = '' OR name_key = 'devotee' THEN 'unique/generic name'
        WHEN same_name_total = 1 THEN 'unique name'
        ELSE 'most recent among same-name (no sibling with phone)'
      END AS "keepReason"
    FROM ranked
    WHERE name_rank = 1
    ORDER BY last_login_ts DESC NULLS LAST, created_ts DESC NULLS LAST, id DESC
  `;

  const {rows} = await pool.query(sql);

  const summary = (
    await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (
          SELECT COUNT(*)::int FROM users
          WHERE mobile_number IS NULL OR TRIM(mobile_number) = ''
             OR LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) < 10
        ) AS missing_raw,
        ${rows.length}::int AS kept_after_filters
    `)
  ).rows[0];

  await pool.end();

  const outDir = path.join(__dirname, '..', '..', 'exports');
  fs.mkdirSync(outDir, {recursive: true});
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath = path.join(
    outDir,
    `users_missing_phone_recent_unique_${stamp}.xlsx`,
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Japa Siddhi';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Missing Phone (Filtered)');
  sheet.columns = [
    {header: 'User ID', key: 'id', width: 10},
    {header: 'User Code', key: 'userCode', width: 14},
    {header: 'Full Name', key: 'fullName', width: 28},
    {header: 'Email', key: 'email', width: 36},
    {header: 'Auth Provider', key: 'authProvider', width: 14},
    {header: 'Mobile Number', key: 'mobileNumber', width: 16},
    {header: 'Last Login At', key: 'lastLoginAt', width: 22},
    {header: 'Created At', key: 'createdAt', width: 22},
    {header: 'Same Name Total', key: 'sameNameTotal', width: 16},
    {header: 'Keep Reason', key: 'keepReason', width: 44},
    {header: 'Account Status', key: 'accountStatus', width: 14},
  ];

  const header = sheet.getRow(1);
  header.font = {name: 'Arial', bold: true, size: 11};
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {argb: 'FFE8E0D0'},
  };

  for (const row of rows) {
    const added = sheet.addRow({
      id: row.id,
      userCode: row.userCode || '',
      fullName: row.fullName || '',
      email: row.email || '',
      authProvider: row.authProvider || '',
      mobileNumber: row.mobileNumber || '',
      lastLoginAt: row.lastLoginAt || '',
      createdAt: row.createdAt || '',
      sameNameTotal: row.sameNameTotal || 1,
      keepReason: row.keepReason || '',
      accountStatus: row.accountStatus || '',
    });
    added.font = {name: 'Arial', size: 10};
  }

  const note = workbook.addWorksheet('Notes');
  const notes = [
    ['Filter rules'],
    ['1. Start from users with no usable phone (blank / <10 digits).'],
    ['2. Exclude deleted_* emails/mobiles and cloud test-lab accounts.'],
    ['3. If same normalized name already has another account WITH a valid phone → drop the no-phone row (duplicate of an existing phone user).'],
    ['4. If multiple no-phone accounts share the same name → keep only the most recent last_login (fallback: newest created_at).'],
    ['5. Unique-name no-phone users are kept.'],
    [''],
    [`Raw missing phone: ${summary.missing_raw}`],
    [`Kept after filters: ${summary.kept_after_filters}`],
    [`Total users: ${summary.total_users}`],
    [`Generated: ${new Date().toISOString()}`],
  ];
  notes.forEach((line, i) => {
    note.getCell(`A${i + 1}`).value = line[0];
    note.getCell(`A${i + 1}`).font = {
      name: 'Arial',
      size: 10,
      bold: i === 0,
    };
  });
  note.getColumn(1).width = 120;

  await workbook.xlsx.writeFile(filePath);
  console.log(
    JSON.stringify(
      {
        rawMissing: summary.missing_raw,
        kept: rows.length,
        filePath,
      },
      null,
      2,
    ),
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
