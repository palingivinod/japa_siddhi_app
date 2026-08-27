import { Router } from 'express';

import japaController from './japa.controller';

import authenticate from '../../middleware/auth.middleware';


const router = Router();


router.post(
  '/session',
  authenticate,
  japaController.createSession,
);


router.post(
  '/validate/tap',
  authenticate,
  japaController.validateTap,
);


router.post(
  '/validate/voice',
  authenticate,
  japaController.validateVoice,
);


router.get(
  '/summary',
  authenticate,
  japaController.getSummary,
);

router.get(
  '/community',
  authenticate,
  japaController.getCommunity,
);

router.post(
  '/community/join',
  authenticate,
  japaController.joinCommunity,
);

router.get(
  '/progress',
  authenticate,
  japaController.getProgress,
);

router.get(
  '/analytics',
  authenticate,
  japaController.getAnalytics,
);

router.get(
  '/milestones',
  authenticate,
  japaController.getMilestones,
);

router.post(
  '/reference',
  authenticate,
  japaController.saveReference,
);

router.get(
  '/reference',
  authenticate,
  japaController.getReference,
);


export default router;