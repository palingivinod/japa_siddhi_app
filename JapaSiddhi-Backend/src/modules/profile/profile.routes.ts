import { Router } from 'express';

import profileController from './profile.controller';

import authenticate from '../../middleware/auth.middleware';
import {handleProfilePhotoUpload} from '../../middleware/upload.middleware';

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

router.post(
  '/photo',
  authenticate,
  handleProfilePhotoUpload,
  profileController.uploadPhoto,
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

router.get(
  '/addresses',
  authenticate,
  profileController.listAddresses,
);

router.post(
  '/addresses',
  authenticate,
  profileController.saveAddress,
);

export default router;