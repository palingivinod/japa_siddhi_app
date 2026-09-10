import { body } from 'express-validator';

export const updateProfileValidation = [
  body('fullName')
    .optional({nullable: true})
    .trim()
    .isLength({
      min: 3,
      max: 150,
    })
    .withMessage('Full Name must be between 3 and 150 characters'),

  body('email')
    .optional({
      nullable: true,
    })
    .isEmail()
    .withMessage('Invalid email address'),

  body('mobileNumber')
    .optional({nullable: true})
    .trim()
    .isLength({min: 8, max: 20})
    .withMessage('Invalid mobile number'),

  body('gender')
    .optional({
      nullable: true,
    })
    .isIn(['Male', 'Female', 'Other', 'Prefer Not To Say'])
    .withMessage('Invalid gender'),

  body('dateOfBirth')
    .optional({
      nullable: true,
    })
    .isISO8601()
    .withMessage('Date of Birth must be in YYYY-MM-DD format'),

  body('countryId')
    .optional({
      nullable: true,
    })
    .isInt({
      min: 1,
    })
    .withMessage('Invalid country'),

  body('stateId')
    .optional({
      nullable: true,
    })
    .isInt({
      min: 1,
    })
    .withMessage('Invalid state'),

  body('cityId')
    .optional({
      nullable: true,
    })
    .isInt({
      min: 1,
    })
    .withMessage('Invalid city'),

  body('preferredLanguageId')
    .optional({
      nullable: true,
    })
    .isInt({
      min: 1,
    })
    .withMessage('Invalid preferred language'),

  body('address').optional({nullable: true}).isString(),

  body('maritalStatus')
    .optional({nullable: true})
    .isIn(['Bachelor', 'Married'])
    .withMessage('Invalid marital status'),

  body('spouseName').optional({nullable: true}).isString(),

  body('spouseDob')
    .optional({nullable: true})
    .isISO8601()
    .withMessage('Spouse DOB must be YYYY-MM-DD'),

  body('anniversaryDate')
    .optional({nullable: true})
    .isISO8601()
    .withMessage('Anniversary must be YYYY-MM-DD'),

  body('gothram').optional({nullable: true}).isString(),

  body('nakshatram').optional({nullable: true}).isString(),

  body('profilePhoto')
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage('Invalid profile photo'),
];
