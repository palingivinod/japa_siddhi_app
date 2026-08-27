import { Router } from 'express';

import profileController from './profile.controller';

import authenticate from '../../middleware/auth.middleware';

import validateRequest from '../../middleware/validateRequest';

import {
  updateProfileValidation,
} from './profile.validation';

const router = Router();

router.get(
  '/',
  authenticate,
  profileController.getProfile,
);

router.put(
  '/',
  authenticate,
  updateProfileValidation,
  validateRequest,
  profileController.updateProfile,
);

router.get(
  '/settings',
  authenticate,
  profileController.getSettings,
);

router.put(
  '/settings',
  authenticate,
  profileController.updateSettings,
);

export default router;