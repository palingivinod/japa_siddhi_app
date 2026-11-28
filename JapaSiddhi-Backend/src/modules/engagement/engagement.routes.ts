import {Router, Request, Response} from 'express';

import authenticate from '../../middleware/auth.middleware';
import {logEngagement} from '../admin/engagementAnalytics.service';

const router = Router();

/**
 * The app reports a tap (banner, Top 10 list, Homam updates) for admin
 * analytics. Fire-and-forget on the app side; it never blocks the user.
 */
router.post('/event', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return res
        .status(401)
        .json({success: false, message: 'User not authenticated'});
    }
    await logEngagement({
      userId,
      type: String(req.body?.type || ''),
      refId: req.body?.refId,
      source: req.body?.source,
    });
    return res.json({success: true});
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Could not record.',
    });
  }
});

export default router;
