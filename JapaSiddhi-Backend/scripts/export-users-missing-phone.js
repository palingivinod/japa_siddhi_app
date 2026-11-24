/**
 * One-off: export users with no usable phone number on profile.
 * Usage: node scripts/export-users-missing-phone.js
 */
require('dotenv').config({path: require('path').join(__dirname, '..', '.env')});

const path = require('path');
const fs = require('fs');
const {Pool} = require('pg');
const ExcelJS = require('exceljs');

async function main() {
  // Same fallback as src/config/environment.ts (production Render Postgres).
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

  const sql = `
    SELECT
      u.id,
      u.user_code AS "userCode",
      u.full_name AS "fullName",
      u.email,
      u.auth_provider AS "authProvider",
      u.mobile_country_code AS "mobileCountryCode",
      u.mobile_number AS "mobileNumber",
      u.account_status AS "accountStatus",
      u.login_type AS "loginType",
      u.created_at AS "createdAt",
      u.last_login_at AS "lastLoginAt"
    FROM users u
    WHERE
      u.mobile_number IS NULL
      OR TRIM(u.mobile_number) = ''
      OR LENGTH(REGEXP_REPLACE(COALESCE(u.mobile_number, ''), '[^0-9]', '', 'g')) < 10
    ORDER BY u.id ASC
  `;

  const {rows} = await pool.query(sql);
  await pool.end();

  const outDir = path.join(__dirname, '..', '..', 'exports');
  fs.mkdirSync(outDir, {recursive: true});
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath = path.join(outDir, `users_missing_phone_${stamp}.xlsx`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Japa Siddhi';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Missing Phone');
  sheet.columns = [
    {header: 'User ID', key: 'id', width: 10},
    {header: 'User Code', key: 'userCode', width: 14},
    {header: 'Full Name', key: 'fullName', width: 28},
    {header: 'Email', key: 'email', width: 36},
    {header: 'Auth Provider', key: 'authProvider', width: 14},
    {header: 'Country Code', key: 'mobileCountryCode', width: 12},
    {header: 'Mobile Number', key: 'mobileNumber', width: 16},
    {header: 'Account Status', key: 'accountStatus', width: 14},
    {header: 'Login Type (DB default)', key: 'loginType', width: 20},
    {header: 'Created At', key: 'createdAt', width: 22},
    {header: 'Last Login At', key: 'lastLoginAt', width: 22},
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
      mobileCountryCode: row.mobileCountryCode || '',
      mobileNumber: row.mobileNumber || '',
      accountStatus: row.accountStatus || '',
      loginType: row.loginType || '',
      createdAt: row.createdAt || '',
      lastLoginAt: row.lastLoginAt || '',
    });
    added.font = {name: 'Arial', size: 10};
  }

  const note = workbook.addWorksheet('Notes');
  note.getCell('A1').value = 'Notes';
  note.getCell('A2').value =
    'Missing phone = mobile_number is null/blank, or has fewer than 10 digits after stripping non-digits.';
  note.getCell('A3').value =
    'login_type is a DB default of PHONE for ALL users — it does NOT mean they logged in with a phone. Use Auth Provider (google) instead.';
  note.getCell('A4').value =
    'These rows are Google-sign-in users who never saved a phone on profile (email is present).';
  note.getCell('A5').value = `Generated: ${new Date().toISOString()}`;
  note.getCell('A6').value = `Row count: ${rows.length}`;
  note.getCell('A1').font = {name: 'Arial', bold: true};
  ['A2', 'A3', 'A4', 'A5', 'A6'].forEach(c => {
    note.getCell(c).font = {name: 'Arial', size: 10};
  });
  note.getColumn(1).width = 110;

  await workbook.xlsx.writeFile(filePath);
  console.log(JSON.stringify({count: rows.length, filePath}, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
