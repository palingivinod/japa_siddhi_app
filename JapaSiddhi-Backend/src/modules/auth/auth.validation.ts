

import { body } from 'express-validator';

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
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address.'),
];

export const otpVerifyValidation = [
  ...otpSendValidation,
  body('otp')
    .trim()
    .isLength({min: 4, max: 4})
    .withMessage('Enter the 4-digit OTP.'),
];

export const registerValidation = [
  ...phoneAuthValidation,
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