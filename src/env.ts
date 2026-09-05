const IS_PRODUCTION = !__DEV__;

// Debug/USB: local backend (adb reverse). Release: Render.
const DEV_API_URL = 'http://127.0.0.1:5000/api/v1';
const PROD_API_URL = 'https://japasiddhi.onrender.com/api/v1';

const ENV = {
  APP_NAME: 'Japa Siddhi',

  VERSION: '1.0.0',

  IS_PRODUCTION,

  API_URL: IS_PRODUCTION ? PROD_API_URL : DEV_API_URL,

  TIMEOUT: 120000,

  GOOGLE_MAP_KEY: '',

  RAZORPAY_KEY: '',

  APPLE_PAY_KEY: '',

  PLAYSTORE_URL: 'https://play.google.com/store/apps/details?id=com.japasiddhi',

  APPSTORE_URL: '',

  SUPPORT_EMAIL: 'kailaasavaasi@gmail.com',

  SUPPORT_PHONE: '',

  WEBSITE: 'https://japasiddhi.com',

  PRIVACY_POLICY_URL:
    'https://cdn.jsdelivr.net/gh/sriurjith/JapaSiddhi@main/docs/privacy.html',

  DEFAULT_LANGUAGE: 'en',

  DEFAULT_COUNTRY: 'IN',
};

export default ENV;
