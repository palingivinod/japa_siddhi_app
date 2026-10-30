

import { body } from 'express-validator';

/** Mobile is mandatory on signup and must be exactly this many digits. */
export const MOBILE_DIGITS = 10;

const hasMobileDigits = (value: unknown) =>
  new RegExp(`^[0-9]{${MOBILE_DIGITS}}$`).test(
    String(value || '').replace(/\D/g, ''),
  );

/**
 * Signup only. Login keeps the looser rule so devotees who registered with a
 * shorter number before this check are not locked out of their accounts.
 */
const strictMobileNumber = body('mobileNumber')
  .custom(value => hasMobileDigits(value))
  .withMessage(`Enter your ${MOBILE_DIGITS}-digit mobile number.`);

export const loginValidation = [
  body('firebaseToken')
    .trim()
    .notEmpty()
    .withMessage('Firebase token is required.'),
];

export const phoneAuthValidation = [
  body('mobileCountryCode')
    .trim()
    .notEmpty()
    .withMessage('Country code is required.'),
  body('mobileNumber')
    .trim()
    .notEmpty()
    .isLength({min: 6, max: 15})
    .withMessage('Enter a valid mobile number.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Enter a valid email address.'),
];

export const otpSendValidation = [
  body('mode')
    .optional()
    .isIn(['register', 'login'])
    .withMessage('Invalid OTP mode.'),
  body('channel')
    .optional()
    .isIn(['email', 'phone'])
    .withMessage('OTP channel must be email or phone.'),
  body('email')
    .optional({nullable: true})
    .trim(),
  body('mobileCountryCode')
    .optional({nullable: true})
    .trim(),
  body('mobileNumber')
    .optional({nullable: true})
    .trim(),
  body().custom((_, {req}) => {
    const mode = req.body?.mode === 'login' ? 'login' : 'register';
    const channel =
      req.body?.channel === 'phone'
        ? 'phone'
        : req.body?.channel === 'email'
          ? 'email'
          : 'email';
    const email = String(req.body?.email || '').trim().toLowerCase();
    const country = String(req.body?.mobileCountryCode || '').trim();
    const mobile = String(req.body?.mobileNumber || '').replace(/\D/g, '');

    if (mode === 'register') {
      if (!email || !email.includes('@')) {
        throw new Error('Enter a valid email address.');
      }
      if (!country) {
        throw new Error('Country code is required.');
      }
      if (!hasMobileDigits(mobile)) {
        throw new Error(
          `Enter your ${MOBILE_DIGITS}-digit mobile number.`,
        );
      }
      return true;
    }

    // login: email channel OR phone channel
    if (channel === 'phone') {
      if (!country) {
        throw new Error('Country code is required.');
      }
      if (mobile.length < 6 || mobile.length > 15) {
        throw new Error('Enter a valid mobile number.');
      }
      return true;
    }

    if (!email || !email.includes('@')) {
      throw new Error('Enter a valid email address.');
    }
    return true;
  }),
];

export const otpVerifyValidation = [
  ...otpSendValidation,
  body('firebaseToken').optional({nullable: true}).trim(),
  body('otp').optional({nullable: true}).trim(),
  body().custom((_, {req}) => {
    const channel =
      req.body?.channel === 'phone' || req.body?.firebaseToken
        ? 'phone'
        : 'email';
    if (channel === 'phone') {
      if (!String(req.body?.firebaseToken || '').trim()) {
        throw new Error(
          'Firebase token is required after verifying the phone OTP.',
        );
      }
      return true;
    }
    const otp = String(req.body?.otp || '').trim();
    if (!/^\d{4}$/.test(otp)) {
      throw new Error('Enter the 4-digit OTP.');
    }
    return true;
  }),
];

export const passwordLoginValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({min: 6})
    .withMessage('Password must be at least 6 characters.'),
  body('identifier')
    .optional({nullable: true})
    .trim(),
  body('email')
    .optional({nullable: true})
    .trim(),
  body('mobileNumber')
    .optional({nullable: true})
    .trim(),
  body('mobileCountryCode')
    .optional({nullable: true})
    .trim(),
  body().custom((_, {req}) => {
    const id = String(
      req.body?.identifier || req.body?.email || req.body?.mobileNumber || '',
    ).trim();
    if (!id) {
      throw new Error('Enter your email or mobile number.');
    }
    return true;
  }),
];

export const forgotPasswordSendValidation = [
  body('identifier')
    .optional({nullable: true})
    .trim(),
  body('email')
    .optional({nullable: true})
    .trim(),
  body('mobileCountryCode')
    .optional({nullable: true})
    .trim(),
  body().custom((_, {req}) => {
    const id = String(req.body?.identifier || req.body?.email || '').trim();
    if (!id) {
      throw new Error('Enter your email or mobile number.');
    }
    return true;
  }),
];

export const forgotPasswordResetValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Enter a valid email address.'),
  body('otp')
    .trim()
    .isLength({min: 4, max: 4})
    .withMessage('Enter the 4-digit OTP.'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required.')
    .isLength({min: 6})
    .withMessage('Password must be at least 6 characters.'),
];

export const registerValidation = [
  ...phoneAuthValidation,
  strictMobileNumber,
  body('password')
    .custom((value, {req}) => {
      const isSocial = Boolean(
        req.body?.firebaseToken ||
        req.body?.firebaseUid ||
        req.body?.authProvider === 'google' ||
        req.body?.authProvider === 'facebook' ||
        req.body?.provider === 'google' ||
        req.body?.provider === 'facebook',
      );
      if (isSocial && !value) {
        return true;
      }
      if (!value || String(value).length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      return true;
    }),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({min: 3, max: 100})
    .withMessage('Full name must be between 3 and 100 characters.'),
  body('gender')
    .notEmpty()
    .withMessage('Gender is required.')
    .isIn(['Male', 'Female', 'Other', 'Prefer Not To Say'])
    .withMessage('Invalid gender.'),
  body('dateOfBirth')
    .custom((_, {req}) => Boolean(req.body.dateOfBirth || req.body.dob))
    .withMessage('Date of birth is required.'),
  body('countryId')
    .notEmpty()
    .withMessage('Country is required.')
    .isInt({min: 1})
    .withMessage('Invalid country.'),
  body('preferredLanguageId')
    .custom((_, {req}) =>
      Number(req.body.preferredLanguageId || req.body.languageId) > 0,
    )
    .withMessage('Preferred language is required.'),
  body('address').optional({nullable: true}),
  body('maritalStatus')
    .optional({nullable: true})
    .isIn(['Bachelor', 'Married'])
    .withMessage('Invalid marital status.'),
  body('gothram').optional({nullable: true}),
  body('nakshatram').optional({nullable: true}),
];

export const completeProfileValidation = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 3, max: 100 })
    .withMessage('Full name must be between 3 and 100 characters.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.'),

  body('gender')
    .notEmpty()
    .withMessage('Gender is required.')
    .isIn(['Male', 'Female', 'Other', 'Prefer Not To Say'])
    .withMessage('Invalid gender.'),

  body('dateOfBirth')
    .custom((_, {req}) => Boolean(req.body.dateOfBirth || req.body.dob))
    .withMessage('Date of birth is required.'),

  body('countryId')
    .notEmpty()
    .withMessage('Country is required.')
    .isInt({ min: 1 })
    .withMessage('Invalid country.'),

  body('stateId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Invalid state.'),

  body('cityId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Invalid city.'),

  body('preferredLanguageId')
    .custom((_, {req}) =>
      Number(req.body.preferredLanguageId || req.body.languageId) > 0,
    )
    .withMessage('Preferred language is required.'),

  body('timezone')
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage('Timezone is too long.'),

  body('deviceType')
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage('Invalid device type.'),

  body('deviceModel')
    .optional({ nullable: true })
    .isLength({ max: 150 })
    .withMessage('Invalid device model.'),

  body('deviceOS')
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage('Invalid device OS.'),

  body('appVersion')
    .optional({ nullable: true })
    .isLength({ max: 30 })
    .withMessage('Invalid app version.'),

  body('firebaseToken')
    .optional({ nullable: true })
    .isLength({ min: 10 })
    .withMessage('Invalid Firebase token.'),

  body('profilePhoto')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Profile photo must be a valid URL.'),

  body('referralCode')
    .optional({ nullable: true })
    .isLength({ max: 30 })
    .withMessage('Referral code is too long.'),
];
