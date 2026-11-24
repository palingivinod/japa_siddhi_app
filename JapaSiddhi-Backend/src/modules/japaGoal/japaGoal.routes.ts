import { Router } from 'express';

import japaGoalController from './japaGoal.controller';

import authenticate from '../../middleware/auth.middleware';


const router = Router();


router.post(
  '/',
  authenticate,
  japaGoalController.createGoal,
);


router.get(
  '/',
  authenticate,
  japaGoalController.getGoals,
);


router.get(
  '/:id',
  authenticate,
  japaGoalController.getGoal,
);


router.put(
  '/:id/status',
  authenticate,
  japaGoalController.updateStatus,
);

router.put(
  '/:id/extend',
  authenticate,
  japaGoalController.extendGoal,
);

router.put(
  '/:id/deadline',
  authenticate,
  japaGoalController.changeDeadline,
);


router.delete(
  '/:id',
  authenticate,
  japaGoalController.cancelGoal,
);


export default router;