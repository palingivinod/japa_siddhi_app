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
  forgotPasswordSendValidation,
  forgotPasswordResetValidation,
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

type ExpressHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => unknown;

const runPasswordLogin: ExpressHandler = (req, res, next) =>
  authController.passwordLogin(req, res, next);

// Express 5: spread validator arrays so each item is a real middleware function.
router.post(
  '/password-login',
  ...passwordLoginValidation,
  validateRequest,
  runPasswordLogin,
);

// /login: email/phone+password when no Firebase token; otherwise Firebase login.
router.post(
  '/login',
  (req: Request, res: Response, next: NextFunction) => {
    const body = req.body || {};
    const hasPassword = Boolean(body.password);
    const hasIdentifier = Boolean(
      body.identifier || body.email || body.mobileNumber,
    );
    if (hasPassword && hasIdentifier && !body.firebaseToken) {
      return runPasswordLogin(req, res, next);
    }
    return next();
  },
  ...loginValidation,
  validateRequest,
  ((req, res, next) => authController.login(req, res, next)) as ExpressHandler,
);

router.post(
  '/forgot/send-otp',
  otpSendLimiter,
  ...forgotPasswordSendValidation,
  validateRequest,
  ((req, res, next) =>
    authController.sendForgotPasswordOtp(req, res, next)) as ExpressHandler,
);

router.post(
  '/forgot/reset',
  ...forgotPasswordResetValidation,
  validateRequest,
  ((req, res, next) =>
    authController.resetForgotPassword(req, res, next)) as ExpressHandler,
);

router.post(
  '/register',
  ...registerValidation,
  validateRequest,
  ((req, res, next) =>
    authController.register(req, res, next)) as ExpressHandler,
);

router.post(
  '/signin',
  ...phoneAuthValidation,
  validateRequest,
  ((req, res, next) =>
    authController.signIn(req, res, next)) as ExpressHandler,
);

router.post(
  '/phone',
  ...phoneAuthValidation,
  validateRequest,
  ((req, res, next) =>
    authController.phoneLogin(req, res, next)) as ExpressHandler,
);

if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/dev-login',
    ((req, res, next) =>
      authController.devLogin(req, res, next)) as ExpressHandler,
  );
}

router.post(
  '/social',
  ((req, res, next) =>
    authController.social(req, res, next)) as ExpressHandler,
);

router.post(
  '/otp/send',
  otpSendLimiter,
  ...otpSendValidation,
  validateRequest,
  ((req, res, next) =>
    authController.sendOtp(req, res, next)) as ExpressHandler,
);

router.post(
  '/otp/verify',
  ...otpVerifyValidation,
  validateRequest,
  ((req, res, next) =>
    authController.verifyOtp(req, res, next)) as ExpressHandler,
);

router.put(
  '/complete-profile',
  authMiddleware,
  ...completeProfileValidation,
  validateRequest,
  ((req, res, next) =>
    authController.completeProfile(req, res, next)) as ExpressHandler,
);

router.post(
  '/complete-profile',
  authMiddleware,
  ...completeProfileValidation,
  validateRequest,
  ((req, res, next) =>
    authController.completeProfile(req, res, next)) as ExpressHandler,
);

// Public on purpose: a lapsed token must be exchangeable without a new login.
router.post(
  '/refresh',
  ((req, res, next) =>
    authController.refresh(req, res, next)) as ExpressHandler,
);

router.get(
  '/profile',
  authMiddleware,
  ((req, res, next) =>
    authController.getProfile(req, res, next)) as ExpressHandler,
);

router.delete(
  '/account',
  authMiddleware,
  ((req, res, next) =>
    authController.deleteAccount(req, res, next)) as ExpressHandler,
);

export default router;
