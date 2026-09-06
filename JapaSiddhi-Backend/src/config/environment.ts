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

  FIREBASE_PROJECT_ID:
    process.env.FIREBASE_PROJECT_ID || '',

  SMTP_HOST:
    process.env.SMTP_HOST || 'smtp.gmail.com',

  SMTP_PORT: Number(process.env.SMTP_PORT || 587),

  SMTP_USER:
    process.env.SMTP_USER || '',
  // Gmail App Password is read from SMTP_PASS in .env

  SMTP_PASS:
    process.env.SMTP_PASS || '',

  OTP_EXPIRES_SECONDS: Number(process.env.OTP_EXPIRES_SECONDS || 300),

  OTP_RESEND_SECONDS: Number(process.env.OTP_RESEND_SECONDS || 45),

  OTP_MAX_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS || 5),

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