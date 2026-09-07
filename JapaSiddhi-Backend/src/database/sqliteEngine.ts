import fs from 'fs';
import path from 'path';
import initSqlJs, {Database} from 'sql.js';

const DB_PATH =
  process.env.SQLITE_PATH ||
  path.join(process.cwd(), 'data', 'japa_siddhi.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sqlite.sql');

class SqliteEngine {
  private db: Database | null = null;
  private ready: Promise<void> | null = null;

  async init(): Promise<void> {
    if (!this.ready) {
      this.ready = this.open();
    }
    await this.ready;
  }

  private async open(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file: string) =>
        path.join(process.cwd(), 'node_modules/sql.js/dist', file),
    });

    fs.mkdirSync(path.dirname(DB_PATH), {recursive: true});

    if (fs.existsSync(DB_PATH)) {
      this.db = new SQL.Database(fs.readFileSync(DB_PATH));
      this.migrateUsers();
      this.ensureFeatureTables();
      this.clearPlaceholderDonationSettings();
      return;
    }

    this.db = new SQL.Database();
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    this.db.exec(schema);
    this.clearPlaceholderDonationSettings();
    this.persist();
    console.log(`SQLite database created at ${DB_PATH}`);
  }

  private migrateUsers(): void {
    if (!this.db) {
      return;
    }

    const info = this.db.exec('PRAGMA table_info(users)');
    const names = new Set(
      (info[0]?.values || []).map(row => String(row[1])),
    );
    const columns: Array<[string, string]> = [
      ['address', 'TEXT'],
      ['marital_status', "TEXT DEFAULT 'Bachelor'"],
      ['spouse_name', 'TEXT'],
      ['spouse_dob', 'TEXT'],
      ['anniversary_date', 'TEXT'],
      ['gothram', 'TEXT'],
      ['nakshatram', 'TEXT'],
    ];

    columns.forEach(([name, definition]) => {
      if (!names.has(name)) {
        this.db?.run(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
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
    `);
    this.seedChallenges();
    this.seedFaqs();
    this.persist();
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

  private persist(): void {
    if (!this.db) {
      return;
    }
    fs.writeFileSync(DB_PATH, Buffer.from(this.db.export()));
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

    if (isRead) {
      const stmt = this.db.prepare(translated);
      if (params.length) {
        stmt.bind(params);
      }
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows as T;
    }

    this.db.run(translated, params);
    const insertResult = this.db.exec('SELECT last_insert_rowid() AS id');
    const insertId = Number(insertResult[0]?.values?.[0]?.[0] ?? 0);
    const affectedRows = this.db.getRowsModified();
    this.persist();
    return {insertId, affectedRows} as T;
  }
}

export default new SqliteEngine();
