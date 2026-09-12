import {NextFunction, Request, Response, Router} from 'express';
import rateLimit from 'express-rate-limit';

import authController from './auth.controller';

import {
  loginValidation,
  phoneAuthValidation,
  registerValidation,
  completeProfileValidation,
  otpSendValidation,
  otpVerifyValidation,
  passwordLoginValidation,
} from './auth.validation';

import validateRequest from '../../middleware/validateRequest';

import authMiddleware from '../../middleware/auth.middleware';


const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again later.',
  },
});

const router = Router();

// Email + password login (also kept on /password-login for older clients).
const emailPasswordLogin = [
  passwordLoginValidation,
  validateRequest,
  authController.passwordLogin,
];

router.post('/password-login', ...emailPasswordLogin);

// /login: email+password when no Firebase token; otherwise Firebase login.
router.post(
  '/login',
  (req: Request, res: Response, next: NextFunction) => {
    const body = req.body || {};
    if (body.email && body.password && !body.firebaseToken) {
      return authController.passwordLogin(req, res, next);
    }
    return next();
  },
  loginValidation,
  validateRequest,
  authController.login,
);

router.post(
  '/register',
  registerValidation,
  validateRequest,
  authController.register,
);

router.post(
  '/signin',
  phoneAuthValidation,
  validateRequest,
  authController.signIn,
);

router.post(
  '/phone',
  phoneAuthValidation,
  validateRequest,
  authController.phoneLogin,
);

router.post(
  '/dev-login',
  authController.devLogin,
);

router.post(
  '/social',
  authController.social,
);

router.post(
  '/otp/send',
  otpSendLimiter,
  otpSendValidation,
  validateRequest,
  authController.sendOtp,
);

router.post(
  '/otp/verify',
  otpVerifyValidation,
  validateRequest,
  authController.verifyOtp,
);


// Complete Profile
router.put(
  '/complete-profile',
  authMiddleware,
  completeProfileValidation,
  validateRequest,
  authController.completeProfile,
);

router.post(
  '/complete-profile',
  authMiddleware,
  completeProfileValidation,
  validateRequest,
  authController.completeProfile,
);


// Get Current User Profile
router.get(
  '/profile',
  authMiddleware,
  authController.getProfile,
);

router.delete(
  '/account',
  authMiddleware,
  authController.deleteAccount,
);


export default router;