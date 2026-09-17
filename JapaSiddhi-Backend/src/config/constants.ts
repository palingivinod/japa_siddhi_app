const Constants = {
  API_VERSION: 'v1',

  // Sessions end when the devotee taps Logout, so tokens are long lived and
  // the app refreshes them silently through /auth/refresh.
  TOKEN_EXPIRES_IN: '365d',

  // A lapsed token can still be exchanged for a new one within this window.
  TOKEN_REFRESH_GRACE_DAYS: 365,

  DEFAULT_LANGUAGE: 'en',

  DEFAULT_COUNTRY: 'IN',

  MAX_PROFILE_IMAGE_SIZE: 5 * 1024 * 1024,

  OTP_EXPIRY_MINUTES: 5,
};

export default Constants;