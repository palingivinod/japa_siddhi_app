import { Router } from 'express';

import notificationController from './notification.controller';

import authenticate from '../../middleware/auth.middleware';


const router = Router();

// Public: content of one shared admin notification (no login; no user data).
router.get('/shared/:slug', async (req, res) => {
  try {
    const {getSharedNotification} = await import(
      '../admin/sharedNotification.service'
    );
    const row = await getSharedNotification(String(req.params.slug || ''));
    if (!row) {
      return res
        .status(404)
        .json({success: false, message: 'Notification not found.'});
    }
    return res.status(200).json({success: true, data: row});
  } catch (error) {
    console.error('[shared-notify] load failed:', error);
    return res
      .status(500)
      .json({success: false, message: 'Unable to load notification.'});
  }
});


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
  '/read-all',
  authenticate,
  notificationController.markAllAsRead,
);

router.put(
  '/action/read',
  authenticate,
  notificationController.markActionAsRead,
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

router.delete(
  '/clear',
  authenticate,
  notificationController.clearAll,
);

router.delete(
  '/:id',
  authenticate,
  notificationController.deleteById,
);

router.delete(
  '/',
  authenticate,
  notificationController.clearAll,
);

export default router;