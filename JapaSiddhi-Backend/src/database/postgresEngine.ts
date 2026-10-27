import {Pool, PoolClient} from 'pg';
import fs from 'fs';
import path from 'path';
import environment from '../config/environment';
import sqliteEngine, {getSqlitePath} from './sqliteEngine';

const PG_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

INSERT INTO schema_version (version) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS languages (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'LTR',
  flag_emoji TEXT,
  google_translate_code TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  iso2 TEXT NOT NULL UNIQUE,
  iso3 TEXT NOT NULL UNIQUE,
  numeric_code INTEGER,
  phone_code TEXT NOT NULL,
  currency_code TEXT,
  currency_name TEXT,
  currency_symbol TEXT,
  name TEXT NOT NULL UNIQUE,
  native_name TEXT,
  nationality TEXT,
  emoji TEXT,
  capital TEXT,
  continent TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS states (
  id SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL,
  iso_code TEXT,
  name TEXT NOT NULL,
  native_name TEXT,
  state_code TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL,
  state_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  native_name TEXT,
  postal_code TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  user_code TEXT UNIQUE,
  firebase_uid TEXT UNIQUE,
  mobile_country_code TEXT NOT NULL DEFAULT '91',
  mobile_number TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT 'Devotee',
  email TEXT,
  gender TEXT DEFAULT 'Prefer Not To Say',
  date_of_birth TEXT,
  profile_photo TEXT,
  profile_image TEXT,
  country_id INTEGER,
  state_id INTEGER,
  city_id INTEGER,
  address TEXT,
  marital_status TEXT NOT NULL DEFAULT 'Bachelor',
  spouse_name TEXT,
  spouse_dob TEXT,
  anniversary_date TEXT,
  gothram TEXT,
  nakshatram TEXT,
  region TEXT,
  preferred_language_id INTEGER,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  password_hash TEXT,
  auth_provider TEXT,
  device_type TEXT NOT NULL DEFAULT 'ANDROID',
  device_model TEXT,
  device_os TEXT,
  app_version TEXT,
  firebase_token TEXT,
  fcm_token TEXT,
  last_login_at TEXT,
  last_logout_at TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  mobile_verified INTEGER NOT NULL DEFAULT 1,
  profile_completed INTEGER NOT NULL DEFAULT 0,
  notification_enabled INTEGER NOT NULL DEFAULT 1,
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  vibration_enabled INTEGER NOT NULL DEFAULT 1,
  dark_mode_enabled INTEGER NOT NULL DEFAULT 0,
  account_status TEXT NOT NULL DEFAULT 'ACTIVE',
  login_type TEXT NOT NULL DEFAULT 'PHONE',
  role TEXT NOT NULL DEFAULT 'USER',
  terms_accepted INTEGER NOT NULL DEFAULT 0,
  privacy_policy_accepted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY,
  language_code TEXT NOT NULL DEFAULT 'en',
  notifications_on INTEGER NOT NULL DEFAULT 1,
  auto_lock_on INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS mantras (
  id SERIAL PRIMARY KEY,
  mantra_name TEXT NOT NULL,
  deity_name TEXT NOT NULL,
  sanskrit_text TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  default_japa_count INTEGER NOT NULL DEFAULT 108,
  image_url TEXT,
  audio_url TEXT,
  translations TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  japa_list TEXT NOT NULL DEFAULT 'SAMUHIKA',
  category_code TEXT,
  copied_from_id BIGINT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS mantra_categories (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS mantra_category_seed (
  id INTEGER PRIMARY KEY,
  seeded INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_personal_mantras (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  mantra_name TEXT NOT NULL,
  deity_name TEXT,
  mantra_text TEXT,
  sanskrit_text TEXT,
  transliteration TEXT,
  preferred_japa_count INTEGER NOT NULL DEFAULT 108,
  image_url TEXT,
  audio_url TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS japa_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  mantra_type TEXT NOT NULL DEFAULT 'DEFAULT',
  mantra_id INTEGER,
  personal_mantra_id INTEGER,
  goal_name TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  remaining_count INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  daily_target INTEGER NOT NULL,
  daily_plan_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS japa_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  japa_goal_id INTEGER,
  mantra_type TEXT NOT NULL DEFAULT 'DEFAULT',
  mantra_id INTEGER,
  personal_mantra_id INTEGER,
  chant_mode TEXT NOT NULL DEFAULT 'TAP',
  session_count INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  remarks TEXT,
  user_name TEXT,
  user_email TEXT,
  user_mobile TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS japa_references (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  mantra_id INTEGER,
  duration_ms INTEGER NOT NULL DEFAULT 2500,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS global_japa_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_japa_count BIGINT NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS festivals (
  id SERIAL PRIMARY KEY,
  festival_name TEXT NOT NULL,
  description TEXT,
  festival_date TEXT NOT NULL,
  festival_type TEXT NOT NULL DEFAULT 'HINDU',
  is_public_holiday INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  donation_type TEXT NOT NULL DEFAULT 'GENERAL',
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT,
  transaction_id TEXT,
  payment_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'SUCCESS',
  donation_status TEXT NOT NULL DEFAULT 'SUCCESS',
  donated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id SERIAL PRIMARY KEY,
  mobile_country_code TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  session_id TEXT NOT NULL,
  code_hash TEXT,
  expires_at BIGINT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT NOT NULL DEFAULT 'TEXT',
  category TEXT NOT NULL DEFAULT 'OTHER',
  description TEXT,
  is_editable INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS app_seed_meta (
  seed_key TEXT PRIMARY KEY,
  seeded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS app_banners (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  module_name TEXT NOT NULL DEFAULT 'Home',
  image_url TEXT,
  button_text TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  translations TEXT,
  starts_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS annadanam_features (
  feature_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS family_groups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  family_name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS family_members (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL,
  user_id INTEGER,
  member_name TEXT NOT NULL,
  relation TEXT,
  mobile_number TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS family_invitations (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL,
  invited_by_user_id INTEGER,
  invited_user_id INTEGER,
  mobile_number TEXT,
  invited_mobile_number TEXT,
  sent_via TEXT,
  invite_code TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS bana_lingam (
  id SERIAL PRIMARY KEY,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
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
  cancel_reason TEXT,
  cancelled_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
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
  translations TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  reward_given INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS challenge_ratings (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  feedback TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS challenge_rewards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS challenge_reward_claims (
  id SERIAL PRIMARY KEY,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS milestone_reward_claims (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  milestone_target INTEGER NOT NULL,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  UNIQUE(user_id, milestone_target)
);

CREATE TABLE IF NOT EXISTS spiritual_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS support_faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customer_care (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshot_url TEXT,
  admin_reply TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  video_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'GENERAL',
  action_type TEXT,
  action_id INTEGER,
  extra_data TEXT,
  translations TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  read_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS admin_accounts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  mobile_country_code TEXT NOT NULL DEFAULT '91',
  mobile_number TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
);

CREATE TABLE IF NOT EXISTS admin_notification_queue (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  translations TEXT,
  target_group TEXT NOT NULL,
  send_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_japa_sessions_user_id ON japa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_japa_sessions_created_at ON japa_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_japa_sessions_mantra_id ON japa_sessions(mantra_id);
CREATE INDEX IF NOT EXISTS idx_japa_goals_user_id ON japa_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile_number);

CREATE OR REPLACE FUNCTION ifnull(anyelement, anyelement)
RETURNS anyelement LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE($1, $2);
$$;

CREATE OR REPLACE FUNCTION ifnull(text, text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE($1, $2);
$$;

CREATE OR REPLACE FUNCTION ifnull(bigint, integer)
RETURNS bigint LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE($1, $2::bigint);
$$;

CREATE OR REPLACE FUNCTION ifnull(numeric, integer)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE($1, $2::numeric);
$$;

CREATE OR REPLACE FUNCTION ifnull(double precision, integer)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE($1, $2::double precision);
$$;

CREATE OR REPLACE FUNCTION json_extract(data text, path text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  key_name text;
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  key_name := regexp_replace(path, '^\\$\\.?', '');
  RETURN (data::jsonb)->>key_name;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;
`;

const TABLES_WITHOUT_ID_SERIAL = new Set([
  'schema_version',
  'user_settings',
  'global_japa_counter',
  'app_seed_meta',
  'annadanam_features',
  'mantra_category_seed',
]);

const ALL_TABLES_IN_COPY_ORDER = [
  'schema_version',
  'languages',
  'countries',
  'states',
  'cities',
  'users',
  'user_addresses',
  'user_settings',
  'mantras',
  'mantra_categories',
  'mantra_category_seed',
  'user_personal_mantras',
  'japa_goals',
  'japa_sessions',
  'japa_references',
  'global_japa_counter',
  'festivals',
  'donations',
  'otp_challenges',
  'app_settings',
  'app_seed_meta',
  'app_banners',
  'annadanam_features',
  'family_groups',
  'family_members',
  'family_invitations',
  'bana_lingam',
  'orders',
  'challenges',
  'challenge_participants',
  'challenge_ratings',
  'challenge_rewards',
  'challenge_reward_claims',
  'milestone_reward_claims',
  'spiritual_products',
  'support_faqs',
  'customer_care',
  'feedback',
  'notifications',
  'admin_accounts',
  'admin_notification_queue',
];

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
 * Translate SQLite / MySQL SQL dialects used across repositories into valid PostgreSQL SQL.
 */
export const translateToPg = (rawSql: string): {sql: string; isInsertWithId: boolean} => {
  let sql = rawSql.trim().replace(/;\s*$/, '');

  // Handle PRAGMA table_info(tableName)
  const pragmaMatch = sql.match(/^PRAGMA\s+table_info\s*\(\s*([a-zA-Z0-9_]+)\s*\)/i);
  if (pragmaMatch) {
    const tableName = pragmaMatch[1];
    return {
      sql: `SELECT ordinal_position AS cid, column_name AS name, data_type AS type, 0 AS notnull, column_default AS dflt_value, 0 AS pk FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName.toLowerCase()}'`,
      isInsertWithId: false,
    };
  }

  // Handle AUTOINCREMENT -> SERIAL in dynamic CREATE TABLE statements
  if (/^\s*CREATE\s+TABLE/i.test(sql)) {
    sql = sql.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    sql = sql.replace(/INT(?:EGER)?\s+(?:NOT\s+NULL\s+)?AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'SERIAL PRIMARY KEY');
  }

  // Handle INSERT OR IGNORE INTO -> INSERT INTO ... ON CONFLICT DO NOTHING
  const isInsertOrIgnore = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql) || /^\s*INSERT\s+IGNORE\s+INTO\b/i.test(sql);
  if (isInsertOrIgnore) {
    sql = sql.replace(/^\s*INSERT\s+(?:OR\s+)?IGNORE\s+INTO\b/i, 'INSERT INTO');
    if (!/\bON\s+CONFLICT\b/i.test(sql)) {
      sql = `${sql} ON CONFLICT DO NOTHING`;
    }
  }

  // Handle SQLite date/datetime/strftime functions
  // 1. strftime('%Y-%m', col, '+5 hours', '30 minutes') — allow nested parens in col
  sql = sql.replace(
    /strftime\s*\(\s*'([^']+)'\s*,\s*'now'\s*,\s*'\+5 hours'\s*,\s*'30 minutes'\s*\)/gi,
    (_m, fmt) => {
      const pgFmt = fmt.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD');
      return `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '330 minutes', '${pgFmt}')`;
    },
  );
  sql = sql.replace(
    /strftime\s*\(\s*'([^']+)'\s*,\s*([\s\S]+?)\s*,\s*'\+5 hours'\s*,\s*'30 minutes'\s*\)/gi,
    (_m, fmt, col) => {
      const pgFmt = fmt.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD');
      return `to_char(((${col})::timestamp) + INTERVAL '330 minutes', '${pgFmt}')`;
    },
  );
  sql = sql.replace(
    /strftime\s*\(\s*'([^']+)'\s*,\s*'now'\s*\)/gi,
    (_m, fmt) => {
      const pgFmt = fmt.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD');
      return `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), '${pgFmt}')`;
    },
  );
  sql = sql.replace(
    /strftime\s*\(\s*'([^']+)'\s*,\s*([^()]+(?:\([^()]*\)[^()]*)*)\s*\)/gi,
    (_m, fmt, col) => {
      const pgFmt = fmt.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD');
      return `to_char(((${col})::timestamp), '${pgFmt}')`;
    },
  );

  // 2. date('now', '+5 hours', '30 minutes', '...')
  sql = sql.replace(
    /date\s*\(\s*'now'\s*,\s*'\+5 hours'\s*,\s*'30 minutes'\s*,\s*'([+-]?\d+)\s*days?'\s*\)/gi,
    (_m, shift) => `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '330 minutes' + INTERVAL '${shift} days', 'YYYY-MM-DD')`,
  );
  sql = sql.replace(
    /date\s*\(\s*'now'\s*,\s*'\+5 hours'\s*,\s*'30 minutes'\s*\)/gi,
    `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '330 minutes', 'YYYY-MM-DD')`,
  );
  sql = sql.replace(
    /date\s*\(\s*'now'\s*,\s*'([+-]?\d+)\s*days?'\s*\)/gi,
    (_m, shift) => `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '${shift} days', 'YYYY-MM-DD')`,
  );
  sql = sql.replace(
    /date\s*\(\s*'now'\s*\)/gi,
    `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
  );

  // 3. date(col, '+5 hours', '30 minutes', '-1 day') — allow nested expressions in col
  sql = sql.replace(
    /date\s*\(\s*([\s\S]+?)\s*,\s*'\+5 hours'\s*,\s*'30 minutes'\s*,\s*'([+-]?\d+)\s*days?'\s*\)/gi,
    (_m, col, shift) => `to_char(((${col})::timestamp) + INTERVAL '330 minutes' + INTERVAL '${shift} days', 'YYYY-MM-DD')`,
  );
  sql = sql.replace(
    /date\s*\(\s*([\s\S]+?)\s*,\s*'\+5 hours'\s*,\s*'30 minutes'\s*\)/gi,
    (_m, col) => `to_char(((${col})::timestamp) + INTERVAL '330 minutes', 'YYYY-MM-DD')`,
  );
  sql = sql.replace(
    /date\s*\(\s*([^,)]+)\s*,\s*'([+-]?\d+)\s*days?'\s*\)/gi,
    (_m, col, shift) => `to_char(((${col})::date) + INTERVAL '${shift} days', 'YYYY-MM-DD')`,
  );
  // Protect column identifier `d.date` or `.date` before replacing function calls `date(...)`
  sql = sql.replace(/\.date\b/gi, '__DOT_DATE__');

  // 4. datetime('now', 'localtime', ...) and datetime('now')
  sql = sql.replace(
    /datetime\s*\(\s*'now'\s*,\s*'localtime'\s*,\s*'([+-]?\d+)\s*days?'\s*\)/gi,
    (_m, shift) => `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '330 minutes' + INTERVAL '${shift} days', 'YYYY-MM-DD HH24:MI:SS')`,
  );
  sql = sql.replace(
    /datetime\s*\(\s*'now'\s*,\s*'localtime'\s*\)/gi,
    `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '330 minutes', 'YYYY-MM-DD HH24:MI:SS')`,
  );
  sql = sql.replace(
    /datetime\s*\(\s*'now'\s*\)/gi,
    `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')`,
  );

  // 5. MySQL functions: MONTH(CURDATE()), YEAR(CURDATE()), CURDATE(), NOW(), DATE_SUB(CURDATE(), INTERVAL X DAY)
  sql = sql.replace(
    /DATE_SUB\s*\(\s*CURDATE\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
    (_m, d) => `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '${d} days', 'YYYY-MM-DD')`,
  );
  sql = sql.replace(
    /DATE_ADD\s*\(\s*CURDATE\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
    (_m, d) => `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '${d} days', 'YYYY-MM-DD')`,
  );
  sql = sql.replace(/MONTH\s*\(\s*CURDATE\s*\(\s*\)\s*\)/gi, `EXTRACT(MONTH FROM (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))`);
  sql = sql.replace(/YEAR\s*\(\s*CURDATE\s*\(\s*\)\s*\)/gi, `EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))`);
  sql = sql.replace(/MONTH\s*\(\s*([^)]+)\s*\)/gi, `EXTRACT(MONTH FROM ($1)::timestamp)`);
  sql = sql.replace(/YEAR\s*\(\s*([^)]+)\s*\)/gi, `EXTRACT(YEAR FROM ($1)::timestamp)`);
  sql = sql.replace(/CURDATE\s*\(\s*\)/gi, `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`);
  sql = sql.replace(/\bNOW\s*\(\s*\)/gi, `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')`);

  // 6. Simple date(col) -> substr(col::text, 1, 10) so text comparison works cleanly (handle up to 5 levels of nested parens)
  for (let pass = 0; pass < 5; pass++) {
    const next = sql.replace(
      /\bdate\s*\(\s*((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*)\s*\)/gi,
      (_m, inner) => `substr((${inner})::text, 1, 10)`,
    );
    if (next === sql) break;
    sql = next;
  }
  sql = sql.replace(/__DOT_DATE__/g, '.date');

  // 7. Replace IFNULL with COALESCE
  sql = sql.replace(/\bIFNULL\s*\(/gi, 'COALESCE(');

  // 7b. Quote mixed-case column aliases (AS myAlias -> AS "myAlias"), unless referenced in ORDER BY / GROUP BY / HAVING
  sql = sql.replace(
    /\bAS\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi,
    (match, alias) => {
      const upper = alias.toUpperCase();
      const types = new Set([
        'INTEGER', 'INT', 'BIGINT', 'TEXT', 'VARCHAR', 'CHAR', 'DATE',
        'TIMESTAMP', 'NUMERIC', 'DECIMAL', 'REAL', 'FLOAT', 'DOUBLE',
        'BOOLEAN', 'JSON', 'JSONB',
      ]);
      if (types.has(upper)) {
        return match;
      }
      if (/[A-Z]/.test(alias)) {
        // Also quote any standalone reference to this alias in ORDER BY / GROUP BY / HAVING / WHERE
        return `AS "${alias}"`;
      }
      return match;
    },
  );
  // Quote known ORDER BY / GROUP BY mixed-case alias references
  for (const alias of [
    'japaDate',
    'userName',
    'japaName',
    'totalJapa',
    'progressPct',
    'japaCount',
    'mantraId',
    'displayOrder',
    'fullName',
    'userId',
    'countryCode',
    'mobileCountryCode',
    'mobileNumber',
    'dateOfBirth',
    'preferDate',
    'forWhom',
    'personName',
    'donorName',
    'donorPhone',
    'claimPhone',
    'rewardName',
    'createdAt',
  ]) {
    const re = new RegExp(`(?<!")\\b${alias}\\b(?!")`, 'g');
    sql = sql.replace(re, `"${alias}"`);
  }

  // 8. Replace ? placeholders with $1, $2, ... outside of single-quoted string literals
  let paramIdx = 0;
  let out = '';
  let inSingle = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      out += ch;
      if (inSingle && sql[i + 1] === "'") {
        out += "'";
        i++;
      } else {
        inSingle = !inSingle;
      }
    } else if (ch === '?' && !inSingle) {
      paramIdx++;
      const rest = sql.slice(i + 1);
      const notNull = rest.match(/^\s+IS\s+NOT\s+NULL/i);
      const isNull = rest.match(/^\s+IS\s+NULL/i);
      const numericCompare = rest.match(/^\s*(<=|>=|<>)/);
      if (notNull) {
        // A bare "? IS NOT NULL" has no column type. PostgreSQL rejects a
        // null parameter there: "could not determine data type of parameter".
        out += `CAST($${paramIdx} AS TEXT) IS NOT NULL`;
        i += notNull[0].length;
      } else if (isNull) {
        out += `CAST($${paramIdx} AS TEXT) IS NULL`;
        i += isNull[0].length;
      } else if (numericCompare) {
        out += `CAST($${paramIdx} AS INTEGER) ${numericCompare[1]}`;
        i += numericCompare[0].length;
      } else {
        out += `$${paramIdx}`;
      }
    } else {
      out += ch;
    }
  }
  sql = out;

  // 9. Append RETURNING id to INSERT statements into tables that have an id column
  let isInsertWithId = false;
  const insertMatch = sql.match(/^\s*INSERT\s+INTO\s+"?([a-zA-Z0-9_]+)"?/i);
  if (insertMatch && !/\bRETURNING\b/i.test(sql)) {
    const tableName = insertMatch[1].toLowerCase();
    if (!TABLES_WITHOUT_ID_SERIAL.has(tableName)) {
      sql = `${sql} RETURNING id`;
      isInsertWithId = true;
    }
  }

  return {sql, isInsertWithId};
};

class PostgresEngine {
  private pool: Pool | null = null;
  private ready: Promise<void> | null = null;

  getPool(): Pool | null {
    return this.pool;
  }

  async init(): Promise<void> {
    if (!this.ready) {
      this.ready = this.open();
    }
    await this.ready;
  }

  private async open(): Promise<void> {
    const connectionString = environment.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured for PostgreSQL');
    }

    const useSsl =
      connectionString.includes('render.com') ||
      connectionString.includes('sslmode=require') ||
      process.env.PGSSLMODE === 'require' ||
      environment.NODE_ENV === 'production';

    this.pool = new Pool({
      connectionString,
      ssl: useSsl ? {rejectUnauthorized: false} : false,
      max: Number(process.env.PG_POOL_MAX || 12),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
    });

    await this.pool.query('SELECT 1');
    await this.pool.query(PG_SCHEMA_SQL);
    await this.autoMigrateFromLocalSqliteIfNeeded();
    console.log('✅ PostgreSQL Connected & Schema Verified');
  }

  /**
   * Before copying data to PostgreSQL on Render (or locally), take a timestamped
   * backup copy of the existing SQLite database, then copy all rows if PG is empty
   * or has fewer users than the local SQLite disk database.
   */
  private async autoMigrateFromLocalSqliteIfNeeded(): Promise<void> {
    if (!this.pool) {
      return;
    }
    try {
      const sqlitePath = getSqlitePath();
      if (!fs.existsSync(sqlitePath)) {
        return;
      }

      const pgUserCountRes = await this.pool.query('SELECT COUNT(*) AS c FROM users');
      const pgUserCount = Number(pgUserCountRes.rows[0]?.c || 0);
      const pgPwCountRes = await this.pool.query(
        'SELECT COUNT(*) AS c FROM users WHERE password_hash IS NOT NULL AND password_hash <> \'\'',
      );
      const pgPwCount = Number(pgPwCountRes.rows[0]?.c || 0);

      await sqliteEngine.init();
      const sqliteUsers = await sqliteEngine.query<any[]>('SELECT COUNT(*) AS c FROM users');
      const sqliteUserCount = Number(sqliteUsers?.[0]?.c || 0);

      // Run one-time full sync from Render's /var/data/japa_siddhi.sqlite if PG has fewer users
      // OR if PG has not yet imported user password hashes from the live disk DB.
      if (sqliteUserCount <= pgUserCount && pgUserCount > 0 && pgPwCount > 10) {
        return;
      }

      // 1. Take a backup copy of the SQLite database before copying to PostgreSQL
      const backupDir = path.join(path.dirname(sqlitePath), 'backups');
      fs.mkdirSync(backupDir, {recursive: true});
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupSqliteFile = path.join(backupDir, `pre-postgres-migration-${stamp}.sqlite`);
      fs.copyFileSync(sqlitePath, backupSqliteFile);
      console.log(`📦 Backed up SQLite database before PostgreSQL copy → ${backupSqliteFile}`);

      // 2. Copy all tables from SQLite into PostgreSQL (upserting users so password_hash/fcm_token carry over)
      await this.copyFromSqliteEngine(backupDir, stamp);
    } catch (error) {
      console.warn('Auto-migration from SQLite to PostgreSQL skipped or encountered an issue:', error);
    }
  }

  async copyFromSqliteEngine(backupDir?: string, stamp?: string): Promise<void> {
    if (!this.pool) {
      return;
    }
    const fullExport: Record<string, any[]> = {};

    for (const table of ALL_TABLES_IN_COPY_ORDER) {
      try {
        const rows = await sqliteEngine.query<any[]>(`SELECT * FROM "${table}"`);
        fullExport[table] = rows || [];
        if (!rows || rows.length === 0) {
          continue;
        }

        // Get valid PG columns for this table
        const colRes = await this.pool.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
          [table],
        );
        const validCols = new Set(colRes.rows.map(r => String(r.column_name)));
        const sampleCols = Object.keys(rows[0]).filter(c => validCols.has(c));
        if (!sampleCols.length) {
          continue;
        }

        const colList = sampleCols.map(c => `"${c}"`).join(', ');
        const conflictAction =
          table === 'users' && validCols.has('id')
            ? `ON CONFLICT (id) DO UPDATE SET ${sampleCols
                .filter(c => c !== 'id')
                .map(c => `"${c}" = COALESCE(EXCLUDED."${c}", "${table}"."${c}")`)
                .join(', ')}`
            : 'ON CONFLICT DO NOTHING';

        for (const row of rows) {
          const vals = sampleCols.map(c => (row[c] === undefined ? null : row[c]));
          const placeholders = sampleCols.map((_, idx) => `$${idx + 1}`).join(', ');
          try {
            await this.pool.query(
              `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ${conflictAction}`,
              vals,
            );
          } catch {
            // Ignore individual duplicate constraint conflict
          }
        }

        if (!TABLES_WITHOUT_ID_SERIAL.has(table) && validCols.has('id')) {
          await this.pool.query(
            `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)`,
          );
        }
        console.log(`Copied ${rows.length} rows into PostgreSQL table "${table}"`);
      } catch {
        // Table may not exist in older SQLite
      }
    }

    if (backupDir && stamp) {
      try {
        const jsonPath = path.join(backupDir, `pre-postgres-migration-${stamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(fullExport, null, 2), 'utf8');
        console.log(`📦 Saved JSON snapshot of SQLite data → ${jsonPath}`);
      } catch {
        // Ignore JSON write failure
      }
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T> {
    await this.init();
    if (!this.pool) {
      throw new Error('PostgreSQL pool is not initialized');
    }
    return this.executeOn(this.pool, sql, params);
  }

  private async executeOn<T = any>(
    runner: Pool | PoolClient,
    sql: string,
    params: any[] = [],
  ): Promise<T> {
    const {sql: pgSql, isInsertWithId} = translateToPg(sql);
    const values = bindable(params);
    const isRead = /^\s*(select|pragma|with)\b/i.test(sql.trim());

    const result = await runner.query(pgSql, values);

    if (isRead) {
      // Convert numeric strings from COUNT/SUM/AVG (int8/numeric) into numbers if safe
      const normalizedRows = (result.rows || []).map(row => {
        const copy: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          if (
            typeof v === 'string' &&
            /^-?\d+$/.test(v) &&
            /^(count|total|sum|unread|participants|completed|bucket|id|user_id|mantra_id|order_id|challenge_id|reward_id|stock|quantity|attempts|expires_at|created_at)$/i.test(k) &&
            !k.toLowerCase().includes('mobile') &&
            !k.toLowerCase().includes('phone') &&
            !k.toLowerCase().includes('code') &&
            !k.toLowerCase().includes('pin')
          ) {
            const numVal = Number(v);
            copy[k] = Number.isSafeInteger(numVal) ? numVal : v;
          } else {
            copy[k] = v;
          }
        }
        return copy;
      });
      return normalizedRows as unknown as T;
    }

    const insertId = isInsertWithId && result.rows?.[0]?.id
      ? Number(result.rows[0].id)
      : 0;

    return {
      insertId,
      affectedRows: result.rowCount ?? 0,
    } as unknown as T;
  }

  async transaction<T = any>(callback: (conn: {query: (sql: string, params?: any[]) => Promise<any>; execute: (sql: string, params?: any[]) => Promise<any>}) => Promise<T>): Promise<T> {
    await this.init();
    if (!this.pool) {
      throw new Error('PostgreSQL pool is not initialized');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const wrapper = {
        query: (sql: string, params: any[] = []) => this.executeOn(client, sql, params),
        execute: async (sql: string, params: any[] = []) => {
          const res = await this.executeOn(client, sql, params);
          return [res, null];
        },
      };
      const out = await callback(wrapper);
      await client.query('COMMIT');
      return out;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new PostgresEngine();
