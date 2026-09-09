PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);

CREATE TABLE IF NOT EXISTS languages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL,
  iso_code TEXT,
  name TEXT NOT NULL,
  native_name TEXT,
  state_code TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id)
);

CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL,
  state_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  native_name TEXT,
  postal_code TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id),
  FOREIGN KEY (state_id) REFERENCES states(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  firebase_uid TEXT UNIQUE,
  mobile_country_code TEXT NOT NULL DEFAULT '91',
  mobile_number TEXT NOT NULL,
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
  preferred_language_id INTEGER,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  device_type TEXT NOT NULL DEFAULT 'ANDROID',
  device_model TEXT,
  device_os TEXT,
  app_version TEXT,
  firebase_token TEXT,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY,
  language_code TEXT NOT NULL DEFAULT 'en',
  notifications_on INTEGER NOT NULL DEFAULT 1,
  auto_lock_on INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mantras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mantra_name TEXT NOT NULL,
  deity_name TEXT NOT NULL,
  sanskrit_text TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  default_japa_count INTEGER NOT NULL DEFAULT 108,
  image_url TEXT,
  audio_url TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_personal_mantras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mantra_name TEXT NOT NULL,
  sanskrit_text TEXT,
  transliteration TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS japa_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS japa_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  japa_goal_id INTEGER,
  mantra_type TEXT NOT NULL DEFAULT 'DEFAULT',
  mantra_id INTEGER,
  personal_mantra_id INTEGER,
  chant_mode TEXT NOT NULL DEFAULT 'TAP',
  session_count INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS global_japa_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_japa_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS festivals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  festival_name TEXT NOT NULL,
  description TEXT,
  festival_date TEXT NOT NULL,
  festival_type TEXT NOT NULL DEFAULT 'HINDU',
  is_public_holiday INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  donation_type TEXT NOT NULL DEFAULT 'GENERAL',
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT,
  transaction_id TEXT,
  payment_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'SUCCESS',
  donation_status TEXT NOT NULL DEFAULT 'SUCCESS',
  donated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
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

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT NOT NULL DEFAULT 'TEXT',
  category TEXT NOT NULL DEFAULT 'OTHER',
  description TEXT,
  is_editable INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  family_name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  user_id INTEGER,
  member_name TEXT NOT NULL,
  relation TEXT,
  mobile_number TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES family_groups(id)
);

CREATE TABLE IF NOT EXISTS family_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  invited_by_user_id INTEGER,
  invited_user_id INTEGER,
  mobile_number TEXT,
  invited_mobile_number TEXT,
  sent_via TEXT,
  invite_code TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
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
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS customer_care (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  admin_reply TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
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
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT OR IGNORE INTO languages
(id, code, locale, name, native_name, direction, flag_emoji, google_translate_code, is_default, is_active, display_order)
VALUES
(1, 'en', 'en-US', 'English', 'English', 'LTR', '🇺🇸', 'en', 1, 1, 1),
(2, 'te', 'te-IN', 'Telugu', 'తెలుగు', 'LTR', '🇮🇳', 'te', 0, 1, 2),
(3, 'hi', 'hi-IN', 'Hindi', 'हिन्दी', 'LTR', '🇮🇳', 'hi', 0, 1, 3),
(4, 'ta', 'ta-IN', 'Tamil', 'தமிழ்', 'LTR', '🇮🇳', 'ta', 0, 1, 4),
(5, 'kn', 'kn-IN', 'Kannada', 'ಕನ್ನಡ', 'LTR', '🇮🇳', 'kn', 0, 1, 5),
(6, 'ml', 'ml-IN', 'Malayalam', 'മലയാളം', 'LTR', '🇮🇳', 'ml', 0, 1, 6),
(7, 'mr', 'mr-IN', 'Marathi', 'मराठी', 'LTR', '🇮🇳', 'mr', 0, 1, 7),
(8, 'gu', 'gu-IN', 'Gujarati', 'ગુજરાતી', 'LTR', '🇮🇳', 'gu', 0, 1, 8),
(9, 'bn', 'bn-IN', 'Bengali', 'বাংলা', 'LTR', '🇮🇳', 'bn', 0, 1, 9),
(10, 'pa', 'pa-IN', 'Punjabi', 'ਪੰਜਾਬੀ', 'LTR', '🇮🇳', 'pa', 0, 1, 10);

INSERT OR IGNORE INTO countries
(id, iso2, iso3, numeric_code, phone_code, currency_code, currency_name, currency_symbol, name, native_name, nationality, emoji, capital, continent, is_default, is_active, display_order)
VALUES
(1, 'IN', 'IND', 356, '91', 'INR', 'Indian Rupee', '₹', 'India', 'भारत', 'Indian', '🇮🇳', 'New Delhi', 'Asia', 1, 1, 1),
(2, 'US', 'USA', 840, '1', 'USD', 'US Dollar', '$', 'United States', 'United States', 'American', '🇺🇸', 'Washington, D.C.', 'North America', 0, 1, 2),
(3, 'GB', 'GBR', 826, '44', 'GBP', 'Pound Sterling', '£', 'United Kingdom', 'United Kingdom', 'British', '🇬🇧', 'London', 'Europe', 0, 1, 3),
(4, 'AE', 'ARE', 784, '971', 'AED', 'UAE Dirham', 'د.إ', 'United Arab Emirates', 'الإمارات', 'Emirati', '🇦🇪', 'Abu Dhabi', 'Asia', 0, 1, 4),
(5, 'SG', 'SGP', 702, '65', 'SGD', 'Singapore Dollar', '$', 'Singapore', 'Singapore', 'Singaporean', '🇸🇬', 'Singapore', 'Asia', 0, 1, 5),
(6, 'AU', 'AUS', 36, '61', 'AUD', 'Australian Dollar', '$', 'Australia', 'Australia', 'Australian', '🇦🇺', 'Canberra', 'Oceania', 0, 1, 6);

INSERT OR IGNORE INTO states (id, country_id, iso_code, name, native_name, state_code, is_active) VALUES
(1, 1, 'TG', 'Telangana', 'Telangana', 'TG', 1),
(2, 1, 'AP', 'Andhra Pradesh', 'Andhra Pradesh', 'AP', 1),
(3, 1, 'KA', 'Karnataka', 'Karnataka', 'KA', 1),
(4, 1, 'TN', 'Tamil Nadu', 'Tamil Nadu', 'TN', 1),
(5, 1, 'MH', 'Maharashtra', 'Maharashtra', 'MH', 1),
(6, 1, 'DL', 'Delhi', 'Delhi', 'DL', 1),
(7, 1, 'UP', 'Uttar Pradesh', 'Uttar Pradesh', 'UP', 1),
(8, 1, 'KL', 'Kerala', 'Kerala', 'KL', 1),
(9, 1, 'GJ', 'Gujarat', 'Gujarat', 'GJ', 1),
(10, 1, 'WB', 'West Bengal', 'West Bengal', 'WB', 1);

INSERT OR IGNORE INTO cities (id, country_id, state_id, name, native_name, is_active) VALUES
(1, 1, 1, 'Hyderabad', 'హైదరాబాద్', 1),
(2, 1, 1, 'Warangal', 'వరంగల్', 1),
(3, 1, 2, 'Vijayawada', 'విజయవాడ', 1),
(4, 1, 2, 'Visakhapatnam', 'విశాఖపట్నం', 1),
(5, 1, 3, 'Bengaluru', 'ಬೆಂಗಳೂರು', 1),
(6, 1, 4, 'Chennai', 'சென்னை', 1),
(7, 1, 5, 'Mumbai', 'मुंबई', 1),
(8, 1, 6, 'New Delhi', 'नई दिल्ली', 1),
(9, 1, 7, 'Lucknow', 'लखनऊ', 1),
(10, 1, 8, 'Kochi', 'കൊച്ചി', 1),
(11, 1, 9, 'Ahmedabad', 'અમદાવાદ', 1),
(12, 1, 10, 'Kolkata', 'কলকাতা', 1);

INSERT OR IGNORE INTO mantras
(id, mantra_name, deity_name, sanskrit_text, transliteration, default_japa_count, is_featured, is_active, display_order)
VALUES
(1, 'Om Namah Shivaya', 'Lord Shiva', 'ॐ नमः शिवाय', 'Om Namah Shivaya', 108, 1, 1, 1),
(2, 'Maha Mrityunjaya Mantra', 'Lord Shiva', 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् ।', 'Om Tryambakam Yajamahe Sugandhim Pushtivardhanam', 108, 1, 1, 2),
(3, 'Gayatri Mantra', 'Goddess Gayatri', 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं ।', 'Om Bhur Bhuvah Swaha Tat Savitur Varenyam', 108, 1, 1, 3),
(4, 'Om Namo Narayanaya', 'Lord Vishnu', 'ॐ नमो नारायणाय', 'Om Namo Narayanaya', 108, 1, 1, 4),
(5, 'Hare Krishna Maha Mantra', 'Lord Krishna', 'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे ।', 'Hare Krishna Hare Krishna Krishna Krishna Hare Hare', 108, 1, 1, 5),
(6, 'Sri Rama Mantra', 'Lord Rama', 'श्री राम जय राम जय जय राम', 'Sri Rama Jaya Rama Jaya Jaya Rama', 108, 1, 1, 6),
(7, 'Om Gam Ganapataye Namah', 'Lord Ganesha', 'ॐ गं गणपतये नमः', 'Om Gam Ganapataye Namah', 108, 1, 1, 7),
(8, 'Om Shreem Mahalakshmyai Namah', 'Goddess Lakshmi', 'ॐ श्रीं महालक्ष्म्यै नमः', 'Om Shreem Mahalakshmyai Namah', 108, 1, 1, 8),
(9, 'Om Aim Saraswatyai Namah', 'Goddess Saraswati', 'ॐ ऐं सरस्वत्यै नमः', 'Om Aim Saraswatyai Namah', 108, 1, 1, 9),
(10, 'Om Shri Hanumate Namah', 'Lord Hanuman', 'ॐ श्री हनुमते नमः', 'Om Shri Hanumate Namah', 108, 1, 1, 10);

INSERT OR IGNORE INTO users
(id, uuid, firebase_uid, mobile_country_code, mobile_number, full_name, email, gender, date_of_birth, country_id, state_id, city_id, preferred_language_id, profile_completed, role, terms_accepted, privacy_policy_accepted)
VALUES
(1, '11111111-1111-1111-1111-111111111111', 'dev-user-1', '91', '9999999999', 'Demo Devotee', 'devotee@japasiddhi.com', 'Male', '1995-08-16', 1, 1, 1, 1, 1, 'USER', 1, 1);

INSERT OR IGNORE INTO global_japa_counter (id, total_japa_count) VALUES (1, 0);

INSERT OR IGNORE INTO japa_goals
(id, user_id, mantra_type, mantra_id, goal_name, target_count, completed_count, remaining_count, start_date, end_date, daily_target, status, notes)
VALUES
(1, 1, 'DEFAULT', 1, 'Om Namah Shivaya Sadhana', 10800, 1080, 9720, '2026-08-01', '2026-12-31', 108, 'ACTIVE', 'Daily Shiva japa');

INSERT OR IGNORE INTO festivals
(id, festival_name, description, festival_date, festival_type, is_public_holiday, is_active, display_order)
VALUES
(1, 'Krishna Janmashtami', 'Celebrate the birth of Lord Krishna with japa and devotion.', '2026-09-04', 'HINDU', 1, 1, 1),
(2, 'Ganesh Chaturthi', 'Welcome Lord Ganesha and begin new spiritual goals.', '2026-09-14', 'HINDU', 1, 1, 2),
(3, 'Navaratri', 'Nine nights of Devi worship and mantra chanting.', '2026-10-11', 'HINDU', 1, 1, 3),
(4, 'Vijayadashami', 'Celebrate the victory of dharma with family japa.', '2026-10-20', 'HINDU', 1, 1, 4),
(5, 'Diwali', 'Festival of lights. Offer japa and donations.', '2026-11-08', 'HINDU', 1, 1, 5),
(6, 'Kartika Purnima', 'Sacred full moon for Shiva and Vishnu japa.', '2026-11-24', 'HINDU', 0, 1, 6),
(7, 'Maha Shivaratri', 'Night-long worship of Lord Shiva.', '2027-02-04', 'HINDU', 1, 1, 7);

INSERT OR IGNORE INTO donations
(id, user_id, donation_type, amount, currency, payment_method, transaction_id, payment_reference, payment_status, donation_status, remarks)
VALUES
(1, 1, 'MONTHLY', 200, 'INR', 'UPI', 'TXN-DEMO-200', 'UPI-200', 'SUCCESS', 'SUCCESS', 'Monthly seva');

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, setting_type, category, description) VALUES
('trust_name', 'Bilva Patra Trust', 'TEXT', 'TRUST', 'Trust Name'),
('support_email', 'kailaasavaasi@gmail.com', 'EMAIL', 'TRUST', 'Support Email'),
('support_phone', '9999999999', 'PHONE', 'TRUST', 'Support Phone'),
('monthly_donation_amount', '200', 'NUMBER', 'DONATION', 'Monthly Donation Amount'),
('upi_id', 'q007640149@ybl', 'TEXT', 'DONATION', 'UPI ID'),
('google_pay_number', '9999999999', 'PHONE', 'DONATION', 'Google Pay Number'),
('phonepe_number', '9999999999', 'PHONE', 'DONATION', 'PhonePe Number'),
('paytm_number', '9999999999', 'PHONE', 'DONATION', 'Paytm Number'),
('bank_name', 'State Bank of India', 'TEXT', 'DONATION', 'Bank Name'),
('account_holder_name', 'Bilva Patra Trust', 'TEXT', 'DONATION', 'Account Holder Name'),
('account_number', '', 'TEXT', 'DONATION', 'Bank Account Number'),
('ifsc_code', '', 'TEXT', 'DONATION', 'IFSC Code'),
('home_banner_image', '', 'IMAGE', 'APP', 'Home Screen Banner Image'),
('home_banner_title', 'Welcome to Japa Siddhi', 'TEXT', 'APP', 'Home Screen Banner Title'),
('home_banner_description', 'Begin your spiritual journey with daily mantra chanting and devotion.', 'TEXT', 'APP', 'Home Screen Banner Description'),
('home_banner_action', 'CHANT', 'TEXT', 'APP', 'Home Screen Banner Action');

INSERT OR IGNORE INTO family_groups (id, user_id, family_name, description)
VALUES (1, 1, 'Siddhi Family', 'Our family japa circle');

INSERT OR IGNORE INTO family_members (id, family_id, user_id, member_name, relation, mobile_number, email)
VALUES
(1, 1, 1, 'Demo Devotee', 'Self', '9999999999', 'devotee@japasiddhi.com'),
(2, 1, NULL, 'Amma', 'Mother', '9888888888', NULL),
(3, 1, NULL, 'Nanna', 'Father', '9777777777', NULL);
