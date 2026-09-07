import { Router } from 'express';

import notificationController from './notification.controller';

import authenticate from '../../middleware/auth.middleware';


const router = Router();


router.get(
  '/',
  authenticate,
  notificationController.getAll,
);


router.get(
  '/unread-count',
  authenticate,
  notificationController.unreadCount,
);


router.put(
  '/milestones/read',
  authenticate,
  notificationController.markMilestonesRead,
);


router.put(
  '/:id/read',
  authenticate,
  notificationController.markAsRead,
);


router.post(
  '/',
  authenticate,
  notificationController.create,
);


export default router;