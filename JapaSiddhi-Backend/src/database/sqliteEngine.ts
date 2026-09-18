import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';

const RENDER_DISK_DB = '/var/data/japa_siddhi.sqlite';
const LOCAL_DEFAULT_DB = path.join(process.cwd(), 'data', 'japa_siddhi.sqlite');

const countSqliteRows = (filePath: string, table: string): number => {
  try {
    if (!fs.existsSync(filePath)) {
      return -1;
    }
    // Lightweight: file size as proxy if we cannot open yet; refined after init.
    return fs.statSync(filePath).size;
  } catch {
    return -1;
  }
};

/**
 * Prefer an explicit SQLITE_PATH. On Render, always use the persistent disk
 * even if the dashboard env var was never set — otherwise every deploy wipes users.
 */
export const resolveSqlitePath = (): string => {
  const fromEnv = String(process.env.SQLITE_PATH || '').trim();
  if (fromEnv) {
    return fromEnv;
  }

  const onRender = Boolean(
    process.env.RENDER ||
      process.env.RENDER_SERVICE_ID ||
      process.env.RENDER_EXTERNAL_URL,
  );
  const diskMounted = fs.existsSync('/var/data');

  if (onRender || diskMounted || process.env.NODE_ENV === 'production') {
    try {
      fs.mkdirSync('/var/data', {recursive: true});

      const diskSize = countSqliteRows(RENDER_DISK_DB, 'users');
      const localSize = countSqliteRows(LOCAL_DEFAULT_DB, 'users');

      // Prefer whichever file has more data so we don't abandon history.
      if (diskSize < 0 && localSize > 0) {
        fs.copyFileSync(LOCAL_DEFAULT_DB, RENDER_DISK_DB);
        console.log(
          `Migrated SQLite from ephemeral ${LOCAL_DEFAULT_DB} → ${RENDER_DISK_DB}`,
        );
      } else if (diskSize >= 0 && localSize > diskSize) {
        const backup = `${RENDER_DISK_DB}.bak-${Date.now()}`;
        try {
          fs.copyFileSync(RENDER_DISK_DB, backup);
        } catch {
          // ignore backup failure
        }
        fs.copyFileSync(LOCAL_DEFAULT_DB, RENDER_DISK_DB);
        console.log(
          `Replaced smaller disk DB with larger ephemeral copy (${localSize} > ${diskSize} bytes). Backup: ${backup}`,
        );
      }

      return RENDER_DISK_DB;
    } catch (error) {
      console.warn(
        'Could not use /var/data for SQLite; falling back to local path.',
        error,
      );
    }
  }

  return LOCAL_DEFAULT_DB;
};

const DB_PATH = resolveSqlitePath();
const SCHEMA_PATH = path.join(__dirname, 'schema.sqlite.sql');

export const getSqlitePath = () => DB_PATH;

type ExecTable = {columns: string[]; values: unknown[][]};

const isSingleQuery = (sql: string): boolean => {
  const body = sql.trim().replace(/;\s*$/, '');
  return /^(select|pragma|with)\b/i.test(body) && !body.includes(';');
};

/**
 * better-sqlite3 only binds numbers, strings, bigints, buffers and null.
 * Repositories pass undefined for optional columns and booleans for flags,
 * which sql.js used to coerce for us.
 */
const bindable = (params: unknown[]): unknown[] =>
  params.map(value => {
    if (value === undefined) {
      return null;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 19).replace('T', ' ');
    }
    return value;
  });

/**
 * Presents the sql.js surface the migrations and seeds in this file were
 * written against, so only the storage underneath changes.
 */
class CompatDatabase {
  private rowsModified = 0;

  constructor(readonly raw: BetterSqlite3.Database) {}

  exec(sql: string): ExecTable[] {
    if (isSingleQuery(sql)) {
      const rows = this.raw
        .prepare(sql.trim().replace(/;\s*$/, ''))
        .all() as Record<string, unknown>[];
      if (!rows.length) {
        return [];
      }
      const columns = Object.keys(rows[0]);
      return [{columns, values: rows.map(row => columns.map(c => row[c]))}];
    }
    this.raw.exec(sql);
    return [];
  }

  run(sql: string, params: unknown[] = []): void {
    const info = this.raw.prepare(sql).run(...(bindable(params) as any[]));
    this.rowsModified = info.changes;
  }

  getRowsModified(): number {
    return this.rowsModified;
  }

  close(): void {
    this.raw.close();
  }
}

/**
 * sql.js kept the database in memory and rewrote the whole file, so it never
 * produced a -wal. Any log sitting next to the file on the first boot of this
 * driver therefore predates the switch — it belongs to a `sqlite3` shell
 * session and would replay stale pages (including deletes run by hand) over
 * newer data. Move it aside once, with a backup, instead of opening onto it.
 */
const retireSqlJsArtifacts = (dbFile: string): void => {
  const marker = `${dbFile}.better-sqlite3`;
  if (fs.existsSync(marker) || !fs.existsSync(dbFile)) {
    return;
  }
  try {
    const stamp = Date.now();
    fs.copyFileSync(dbFile, `${dbFile}.bak-${stamp}`);
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${dbFile}${suffix}`;
      if (fs.existsSync(sidecar)) {
        fs.renameSync(sidecar, `${sidecar}.stale-${stamp}`);
        console.log(`Set aside stale ${sidecar} left by a sqlite3 shell.`);
      }
    }
    fs.writeFileSync(marker, new Date().toISOString());
  } catch (error) {
    console.warn('Could not retire sql.js artifacts.', error);
  }
};

class SqliteEngine {
  private db: CompatDatabase | null = null;
  private ready: Promise<void> | null = null;

  async init(): Promise<void> {
    if (!this.ready) {
      this.ready = this.open();
    }
    await this.ready;
  }

  private async open(): Promise<void> {
    fs.mkdirSync(path.dirname(DB_PATH), {recursive: true});

    const existed = fs.existsSync(DB_PATH);
    if (existed) {
      retireSqlJsArtifacts(DB_PATH);
    }

    const raw = new BetterSqlite3(DB_PATH);
    // Reads and writes now go through the file itself, so a `sqlite3` shell
    // sees live data. WAL keeps that shell from blocking the API.
    raw.pragma('journal_mode = WAL');
    raw.pragma('synchronous = NORMAL');
    raw.pragma('busy_timeout = 5000');
    // better-sqlite3 turns foreign keys on by default and sql.js did not.
    // Existing rows and delete order rely on them being off; enforcing them
    // now would start rejecting writes that have always been accepted.
    raw.pragma('foreign_keys = OFF');
    this.db = new CompatDatabase(raw);

    if (!existed) {
      this.db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    }

    this.migrateUsers();
    this.migrateJapaSessions();
    this.ensureFeatureTables();
    this.clearPlaceholderDonationSettings();

    console.log(
      existed
        ? `SQLite database opened (persistent): ${DB_PATH}`
        : `SQLite database created at ${DB_PATH}`,
    );
  }

  private tableColumns(table: string): Set<string> {
    const info = this.db?.exec(`PRAGMA table_info(${table})`);
    return new Set((info?.[0]?.values || []).map(row => String(row[1])));
  }

  private migrateUsers(): void {
    if (!this.db) {
      return;
    }

    const names = this.tableColumns('users');
    const columns: Array<[string, string]> = [
      ['address', 'TEXT'],
      ['marital_status', "TEXT DEFAULT 'Bachelor'"],
      ['spouse_name', 'TEXT'],
      ['spouse_dob', 'TEXT'],
      ['anniversary_date', 'TEXT'],
      ['gothram', 'TEXT'],
      ['nakshatram', 'TEXT'],
      ['password_hash', 'TEXT'],
      ['fcm_token', 'TEXT'],
    ];

    columns.forEach(([name, definition]) => {
      if (!names.has(name)) {
        this.db?.run(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
      }
    });
    this.persist();
  }

  /** Keep chant history readable even if the users row is later missing. */
  private migrateJapaSessions(): void {
    if (!this.db) {
      return;
    }
    const names = this.tableColumns('japa_sessions');
    const columns: Array<[string, string]> = [
      ['user_name', 'TEXT'],
      ['user_email', 'TEXT'],
      ['user_mobile', 'TEXT'],
    ];
    columns.forEach(([name, definition]) => {
      if (!names.has(name)) {
        this.db?.run(
          `ALTER TABLE japa_sessions ADD COLUMN ${name} ${definition}`,
        );
      }
    });
    this.persist();
  }

  private clearPlaceholderDonationSettings(): void {
    if (!this.db) {
      return;
    }

    this.db.run(
      `
      UPDATE app_settings
      SET setting_value = ''
      WHERE setting_key IN ('account_number', 'ifsc_code')
      AND setting_value IN ('123456789012', 'SBIN0001234')
      `,
    );
    this.db.run(
      `
      UPDATE app_settings
      SET setting_value = 'kailaasavaasi@gmail.com'
      WHERE setting_key = 'support_email'
      `,
    );
    this.db.run(
      `
      UPDATE app_settings
      SET setting_value = '+916281585599'
      WHERE setting_key IN ('support_phone', 'support_whatsapp')
      AND (
        IFNULL(setting_value, '') = ''
        OR REPLACE(REPLACE(setting_value, '+', ''), ' ', '') IN (
          '9999999999',
          '7349483937',
          '917349483937'
        )
      )
      `,
    );
    this.db.run(
      `
      UPDATE app_settings
      SET setting_value = 'q007640149@ybl'
      WHERE setting_key = 'upi_id'
      `,
    );
    this.persist();
  }

  private ensureFeatureTables(): void {
    if (!this.db) {
      return;
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bana_lingam (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_id INTEGER,
        full_name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT,
        address TEXT NOT NULL,
        city_id INTEGER,
        state_id INTEGER,
        country_id INTEGER,
        postal_code TEXT,
        gothram TEXT,
        nakshatram TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        request_status TEXT NOT NULL DEFAULT 'PENDING',
        remarks TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_number TEXT NOT NULL UNIQUE,
        order_type TEXT NOT NULL,
        order_source TEXT NOT NULL DEFAULT 'PURCHASE',
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        payment_id INTEGER,
        payment_status TEXT NOT NULL DEFAULT 'PENDING',
        order_status TEXT NOT NULL DEFAULT 'PENDING',
        remarks TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customer_care (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        screenshot_url TEXT,
        admin_reply TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        video_url TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS otp_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mobile_country_code TEXT NOT NULL,
        mobile_number TEXT NOT NULL,
        session_id TEXT NOT NULL,
        code_hash TEXT,
        expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        notification_type TEXT NOT NULL DEFAULT 'GENERAL',
        action_type TEXT,
        action_id INTEGER,
        extra_data TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        challenge_type TEXT NOT NULL DEFAULT 'JAPA_COUNT',
        target_value INTEGER NOT NULL DEFAULT 0,
        reward_type TEXT NOT NULL DEFAULT 'CERTIFICATE',
        reward_name TEXT NOT NULL DEFAULT 'Certificate',
        reward_quantity INTEGER NOT NULL DEFAULT 1,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS challenge_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        current_value INTEGER NOT NULL DEFAULT 0,
        is_completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        reward_given INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY,
        language_code TEXT NOT NULL DEFAULT 'en',
        notifications_on INTEGER NOT NULL DEFAULT 1,
        auto_lock_on INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS japa_references (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        mantra_id INTEGER,
        duration_ms INTEGER NOT NULL DEFAULT 2500,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS challenge_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        feedback TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS user_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        address TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS challenge_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS challenge_reward_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        reward_id INTEGER NOT NULL,
        reward_name TEXT NOT NULL,
        full_name TEXT,
        mobile TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pin_code TEXT,
        order_id INTEGER,
        order_number TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(challenge_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS spiritual_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        mobile_country_code TEXT NOT NULL DEFAULT '91',
        mobile_number TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    this.ensureAdminAccountColumns();
    this.ensureRewardClaimColumns();
    this.ensureFeedbackSupportColumns();
    this.ensurePersonalMantraColumns();
    this.seedChallenges();
    this.seedFaqs();
    this.seedRewards();
    this.seedProducts();
    this.seedAdminAccounts();
    this.persist();
  }

  private seedAdminAccounts(): void {
    if (!this.db) {
      return;
    }
    const rows = this.db.exec('SELECT COUNT(*) AS total FROM admin_accounts');
    const total = Number(rows[0]?.values?.[0]?.[0] ?? 0);
    if (total > 0) {
      return;
    }
    // Placeholder hash replaced on first API boot by adminAccount.service
    this.db.run(
      `
      INSERT INTO admin_accounts (email, password_hash, full_name, is_active)
      VALUES ('kailaasavaasi@gmail.com', 'PENDING_SEED', 'Primary Admin', 1)
      `,
    );
  }

  private seedProducts(): void {
    if (!this.db) {
      return;
    }
    const rows = this.db.exec('SELECT COUNT(*) AS total FROM spiritual_products');
    const total = Number(rows[0]?.values?.[0]?.[0] ?? 0);
    if (total > 0) {
      return;
    }
    this.db.run(
      `
      INSERT INTO spiritual_products (name, stock, is_active, display_order) VALUES
        ('Rudraksha', 12, 1, 1),
        ('Spatik mala', 5, 1, 2),
        ('Pasupu kommuka maala', 0, 1, 3),
        ('Tulasi mala', 0, 1, 4)
      `,
    );
  }

  private ensureAdminAccountColumns(): void {
    if (!this.db) {
      return;
    }
    const info = this.db.exec('PRAGMA table_info(admin_accounts)');
    const names = new Set(
      (info[0]?.values || []).map((row: any[]) => String(row[1] || '')),
    );
    const columns: Array<[string, string]> = [
      ['mobile_country_code', "TEXT NOT NULL DEFAULT '91'"],
      ['mobile_number', 'TEXT'],
    ];
    columns.forEach(([name, definition]) => {
      if (!names.has(name)) {
        this.db?.run(
          `ALTER TABLE admin_accounts ADD COLUMN ${name} ${definition}`,
        );
      }
    });
  }

  private ensureFeedbackSupportColumns(): void {
    if (!this.db) {
      return;
    }
    const addColumn = (table: string, name: string, definition: string) => {
      const info = this.db?.exec(`PRAGMA table_info(${table})`);
      const names = new Set(
        (info?.[0]?.values || []).map((row: any[]) => String(row[1] || '')),
      );
      if (!names.has(name)) {
        this.db?.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
      }
    };
    addColumn('feedback', 'video_url', 'TEXT');
    addColumn('customer_care', 'screenshot_url', 'TEXT');
  }

  /** Older databases created the table with only name/sanskrit columns. */
  private ensurePersonalMantraColumns(): void {
    if (!this.db) {
      return;
    }
    const names = this.tableColumns('user_personal_mantras');
    const columns: Array<[string, string]> = [
      ['deity_name', 'TEXT'],
      ['mantra_text', 'TEXT'],
      ['sanskrit_text', 'TEXT'],
      ['transliteration', 'TEXT'],
      ['preferred_japa_count', 'INTEGER NOT NULL DEFAULT 108'],
      ['image_url', 'TEXT'],
      ['audio_url', 'TEXT'],
      ['is_favorite', 'INTEGER NOT NULL DEFAULT 0'],
      ['updated_at', 'TEXT'],
    ];
    columns.forEach(([name, definition]) => {
      if (!names.has(name)) {
        this.db?.run(
          `ALTER TABLE user_personal_mantras ADD COLUMN ${name} ${definition}`,
        );
      }
    });
  }

  private ensureRewardClaimColumns(): void {
    if (!this.db) {
      return;
    }
    const info = this.db.exec('PRAGMA table_info(challenge_reward_claims)');
    const names = new Set(
      (info[0]?.values || []).map((row: any[]) => String(row[1] || '')),
    );
    const columns: Array<[string, string]> = [
      ['full_name', 'TEXT'],
      ['mobile', 'TEXT'],
      ['address', 'TEXT'],
      ['city', 'TEXT'],
      ['state', 'TEXT'],
      ['pin_code', 'TEXT'],
      ['order_id', 'INTEGER'],
      ['order_number', 'TEXT'],
    ];
    columns.forEach(([name, definition]) => {
      if (!names.has(name)) {
        this.db?.run(
          `ALTER TABLE challenge_reward_claims ADD COLUMN ${name} ${definition}`,
        );
      }
    });
  }

  private seedChallenges(): void {
    if (!this.db) {
      return;
    }
    const rows = this.db.exec('SELECT COUNT(*) AS total FROM challenges');
    const total = Number(rows[0]?.values?.[0]?.[0] ?? 0);
    if (total > 0) {
      return;
    }
    this.db.run(
      `
      INSERT INTO challenges
        (title, description, challenge_type, target_value, reward_type, reward_name, reward_quantity, start_date, end_date, is_active)
      VALUES
        ('108 Japa Daily', '7 day challenge', 'JAPA_COUNT', 756, 'CERTIFICATE', 'Daily Discipline Certificate', 1, '2026-01-01', '2027-12-31', 1),
        ('10,000 Japa', '30 day challenge', 'JAPA_COUNT', 10000, 'CERTIFICATE', '10,000 Japa Certificate', 1, '2026-01-01', '2027-12-31', 1),
        ('Mahashivaratri Japa', 'Festival challenge', 'SPECIAL', 25000, 'RUDRAKSHA', 'Shivaratri Rudraksha', 1, '2026-01-01', '2027-12-31', 1)
      `,
    );
  }

  private seedFaqs(): void {
    if (!this.db) {
      return;
    }
    const rows = this.db.exec('SELECT COUNT(*) AS total FROM support_faqs');
    const total = Number(rows[0]?.values?.[0]?.[0] ?? 0);
    if (total > 0) {
      return;
    }
    this.db.run(
      `
      INSERT INTO support_faqs (question, answer, display_order) VALUES
        ('How does Smart Japa work?', 'Smart Japa counts each valid tap or voice chant against your selected mantra and daily goal.', 1),
        ('How are Japa counts protected?', 'Each session is saved to your account with a timestamp so your progress stays with you across devices.', 2),
        ('How do I donate Annadanam?', 'Open Seva, choose Annadanam, pick Japa or General offering, then complete payment.', 3),
        ('How do I track my order?', 'Open Orders, tap VIEW on an order, then use Track Order to see delivery status.', 4),
        ('How do I change language?', 'Go to Profile > Settings > Language and choose your preferred language.', 5)
      `,
    );
  }

  private seedRewards(): void {
    if (!this.db) {
      return;
    }
    const rows = this.db.exec('SELECT COUNT(*) AS total FROM challenge_rewards');
    const total = Number(rows[0]?.values?.[0]?.[0] ?? 0);
    if (total > 0) {
      return;
    }
    this.db.run(
      `
      INSERT INTO challenge_rewards (name, stock, is_active, display_order) VALUES
        ('Rudraksha', 12, 1, 1),
        ('Spatik mala', 5, 1, 2),
        ('Pasupu kommuka maa', 0, 1, 3),
        ('Green agate', 8, 1, 4),
        ('Yellow agate', 3, 1, 5),
        ('Tulasi mala', 7, 1, 6)
      `,
    );
  }

  /**
   * Every statement is already committed to the file. Folding the log back in
   * keeps the .sqlite self-contained for anyone copying or inspecting it.
   */
  private persist(): void {
    if (!this.db) {
      return;
    }
    try {
      this.db.raw.pragma('wal_checkpoint(PASSIVE)');
    } catch {
      // A concurrent reader can hold the checkpoint off; the data is safe.
    }
  }

  private translate(sql: string): string {
    return sql
      .replace(/MONTH\s*\(\s*CURDATE\s*\(\s*\)\s*\)/gi, "strftime('%m', 'now')")
      .replace(/YEAR\s*\(\s*CURDATE\s*\(\s*\)\s*\)/gi, "strftime('%Y', 'now')")
      .replace(/MONTH\s*\(\s*([^)]+)\s*\)/gi, "strftime('%m', $1)")
      .replace(/YEAR\s*\(\s*([^)]+)\s*\)/gi, "strftime('%Y', $1)")
      .replace(/CURDATE\s*\(\s*\)/gi, "date('now')")
      .replace(/\bNOW\s*\(\s*\)/gi, "datetime('now')")
      .replace(/DATE\s*\(\s*([^)]+)\s*\)/gi, 'date($1)');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T> {
    await this.init();
    if (!this.db) {
      throw new Error('SQLite database is not initialized');
    }

    const translated = this.translate(sql);
    const isRead = /^\s*(select|pragma|with)\b/i.test(translated);
    const stmt = this.db.raw.prepare(translated);
    const values = bindable(params) as any[];

    if (isRead) {
      return stmt.all(...values) as T;
    }

    const info = stmt.run(...values);
    return {
      insertId: Number(info.lastInsertRowid),
      affectedRows: info.changes,
    } as T;
  }
}

export default new SqliteEngine();
