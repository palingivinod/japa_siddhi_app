import {NextFunction, Request, Response, Router} from 'express';
import rateLimit from 'express-rate-limit';

import authenticate from '../../middleware/auth.middleware';
import apiResponse from '../../utils/apiResponse';
import biometricLoginService from './biometricLogin.service';

const router = Router();

const exchangeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
  },
});

// Signed-in user: create the credential for this phone (after OTP/password login).
router.post(
  '/enroll',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await biometricLoginService.enroll(
        userId,
        req.body?.deviceId,
      );
      return apiResponse.success(res, 'Fingerprint login enabled', result);
    } catch (error) {
      next(error);
    }
  },
);

// Signed-in user: turn it off on this phone.
router.post(
  '/revoke',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await biometricLoginService.revoke(
        userId,
        req.body?.deviceId,
      );
      return apiResponse.success(res, 'Fingerprint login disabled', result);
    } catch (error) {
      next(error);
    }
  },
);

// Public: the login screen trades the saved credential for a session.
router.post(
  '/exchange',
  exchangeLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await biometricLoginService.exchange(
        req.body?.deviceId,
        req.body?.credential,
      );
      return apiResponse.success(res, 'Logged in', result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
