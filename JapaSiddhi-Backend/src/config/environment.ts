import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: path.join(__dirname, '../../.env'),
});
dotenv.config();

const environment = {
  PORT: process.env.PORT || 5000,

  NODE_ENV:
    process.env.NODE_ENV || 'development',

  JWT_SECRET:
    process.env.JWT_SECRET || '',

  DB_HOST:
    process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',

  DB_PORT: Number(
    process.env.DB_PORT || process.env.MYSQL_PORT || 3306,
  ),

  DB_NAME:
    process.env.DB_NAME || process.env.MYSQL_DATABASE || 'japa_siddhi',

  DB_USER:
    process.env.DB_USER || process.env.MYSQL_USER || 'root',

  DB_PASSWORD:
    process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',

  DB_ENGINE:
    process.env.DB_ENGINE || '',

  DATABASE_URL:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    [
      'postgresql://japasiddhi_database_user:',
      '8FBnzCgO8zLxC66riAkgljsGYEmB8WJ8',
      '@dpg-dbea8n9srm7s73bfn8cg-a.ohio-postgres.render.com/japasiddhi_database',
    ].join(''),

  FIREBASE_PROJECT_ID:
    process.env.FIREBASE_PROJECT_ID || '',

  FIREBASE_CLIENT_EMAIL:
    process.env.FIREBASE_CLIENT_EMAIL || '',

  FIREBASE_PRIVATE_KEY:
    process.env.FIREBASE_PRIVATE_KEY || '',

  // Paste the full Firebase service-account JSON as one line on Render so FCM
  // push works without shipping firebase-service-account.json in the repo.
  // Prefer this OR the three split vars above. Also accepts BASE64 of the JSON.
  FIREBASE_SERVICE_ACCOUNT_JSON:
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',

  FIREBASE_SERVICE_ACCOUNT_BASE64:
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '',

  SMTP_HOST:
    process.env.SMTP_HOST || 'smtp.gmail.com',

  SMTP_PORT: Number(process.env.SMTP_PORT || 587),

  // Sending mailbox (From). Must be bilvapatratrust Gmail + App Password.
  SMTP_USER:
    process.env.SMTP_USER || 'bilvapatratrust@gmail.com',
  // Gmail App Password is read from SMTP_PASS in .env

  SMTP_PASS:
    process.env.SMTP_PASS || '',

  /** Admin alerts inbox (To) for orders / requests / feedback. */
  NOTIFY_EMAIL: String(
    process.env.NOTIFY_EMAIL || 'bilvapatratrust@gmail.com',
  )
    .trim()
    .toLowerCase(),

  OTP_EXPIRES_SECONDS: Number(process.env.OTP_EXPIRES_SECONDS || 300),

  OTP_RESEND_SECONDS: Number(process.env.OTP_RESEND_SECONDS || 45),

  OTP_MAX_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS || 5),

  /** Newest app release. Devotees on an older install are asked to update. */
  LATEST_APP_VERSION: String(process.env.LATEST_APP_VERSION || '1.1.3').trim(),

  RAZORPAY_KEY_ID: String(process.env.RAZORPAY_KEY_ID || '').trim(),

  RAZORPAY_KEY_SECRET: String(process.env.RAZORPAY_KEY_SECRET || '').trim(),

  RAZORPAY_WEBHOOK_SECRET: String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim(),

  // Phone OTP is sent by Firebase Auth on the app (not Twilio).
  // Backend only verifies the Firebase ID token after the user confirms SMS.

  UPLOAD_PATH:
    process.env.UPLOAD_PATH || 'uploads',

  VEDICORBIT_API_KEY:
    process.env.VEDICORBIT_API_KEY || '',

  VEDICORBIT_API_BASE_URL:
    process.env.VEDICORBIT_API_BASE_URL ||
    'https://vedicorbit-website.vercel.app/api/panchangam',

  VEDICORBIT_LAT: Number(process.env.VEDICORBIT_LAT || 17.385),

  VEDICORBIT_LON: Number(process.env.VEDICORBIT_LON || 78.4867),

  VEDICORBIT_TIMEZONE:
    process.env.VEDICORBIT_TIMEZONE || 'Asia/Kolkata',

  VEDICORBIT_LANG: process.env.VEDICORBIT_LANG || 'en',

  DEV_LOGIN_EMAIL:
    process.env.DEV_LOGIN_EMAIL || 'test@japasiddhi.local',

  DEV_LOGIN_PASSWORD:
    process.env.DEV_LOGIN_PASSWORD || 'test1234',
};

export default environment;