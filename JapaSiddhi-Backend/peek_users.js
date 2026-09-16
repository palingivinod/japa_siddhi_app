/**
 * Inspect the japa database without a sqlite3 shell.
 *
 *   node peek_users.js                                 # local dev database
 *   node peek_users.js /var/data/japa_siddhi.sqlite     # Render production
 *
 * Opens read-only, so it is safe to run while the API is serving traffic.
 */
const path = require('path');
const Database = require('better-sqlite3');

const dbPath =
  process.argv[2] || path.join(__dirname, 'data', 'japa_siddhi.sqlite');

const db = new Database(dbPath, {readonly: true, fileMustExist: true});

const show = (label, sql) => {
  try {
    const rows = db.prepare(sql).all();
    if (!rows.length) {
      console.log(`\n${label}: (no rows)`);
      return;
    }
    const columns = Object.keys(rows[0]);
    console.log(`\n${label}:`);
    console.log(columns.join(' | '));
    rows.forEach(row =>
      console.log(
        columns.map(c => (row[c] === null ? 'NULL' : String(row[c]))).join(' | '),
      ),
    );
  } catch (error) {
    console.log(`\n${label}: ERROR ${error.message}`);
  }
};

console.log('DB file:', dbPath);
console.log('journal:', db.pragma('journal_mode', {simple: true}));

show(
  'users',
  'SELECT id, full_name, email, mobile_number, created_at FROM users ORDER BY id',
);
show(
  'japa per user',
  `SELECT u.id, u.full_name, COUNT(js.id) AS sessions, COALESCE(SUM(js.session_count), 0) AS total_chanted
   FROM users u LEFT JOIN japa_sessions js ON js.user_id = u.id
   GROUP BY u.id ORDER BY u.id`,
);
show(
  'personal mantras per user',
  `SELECT user_id, COUNT(*) AS mantras, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active
   FROM user_personal_mantras GROUP BY user_id ORDER BY user_id`,
);
show(
  'goals per user',
  'SELECT user_id, COUNT(*) AS goals FROM japa_goals GROUP BY user_id ORDER BY user_id',
);

db.close();
