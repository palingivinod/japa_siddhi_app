import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import authController from './auth.controller';

import {
  loginValidation,
  phoneAuthValidation,
  registerValidation,
  completeProfileValidation,
  otpSendValidation,
  otpVerifyValidation,
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


// Firebase Login
router.post(
  '/login',
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