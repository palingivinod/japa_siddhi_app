import {
  Router,
} from 'express';

import challengeController from './challenge.controller';

import authenticate from '../../middleware/auth.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  challengeController.create,
);

router.get(
  '/',
  authenticate,
  challengeController.getActiveChallenges,
);

router.get(
  '/:id',
  authenticate,
  challengeController.getById,
);

router.post(
  '/:id/join',
  authenticate,
  challengeController.join,
);

router.put(
  '/:id/progress',
  authenticate,
  challengeController.updateProgress,
);

router.get(
  '/:id/leaderboard',
  authenticate,
  challengeController.leaderboard,
);

router.get(
  '/:id/progress',
  authenticate,
  challengeController.getProgress,
);

router.post(
  '/:id/rate',
  authenticate,
  challengeController.rate,
);

router.get(
  '/:id/rewards',
  authenticate,
  challengeController.listRewards,
);

router.post(
  '/:id/rewards/claim',
  authenticate,
  challengeController.claimReward,
);

router.post(
  '/:id/rewards/delivery',
  authenticate,
  challengeController.submitRewardDelivery,
);

export default router;