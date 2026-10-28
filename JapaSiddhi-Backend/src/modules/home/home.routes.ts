import {Router, Request, Response} from 'express';
import HomeController from './home.controller';
import authenticate from '../../middleware/auth.middleware';
import appSettingsService from '../admin/appSettings.service';

const router = Router();

router.get('/', authenticate, HomeController.getHome);

router.get('/meeting', async (_req: Request, res: Response) => {
  try {
    const meeting = await appSettingsService.getMeetingConfig();
    return res.json({
      success: true,
      data: meeting,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to fetch meeting.',
    });
  }
});

export default router;