import {Router, Request, Response} from 'express';
import HomeController from './home.controller';
import authenticate from '../../middleware/auth.middleware';
import appSettingsService from '../admin/appSettings.service';

const router = Router();

router.get('/', authenticate, HomeController.getHome);

router.get('/meeting', async (_req: Request, res: Response) => {
  try {
    // After 8:30 PM IST the class card auto-toggles off for app + website users.
    const meeting = await appSettingsService.getPublicMeetingConfig();
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

router.get('/seva-offerings-stock', async (_req: Request, res: Response) => {
  try {
    const stock = await appSettingsService.getSevaOfferingsStock();
    return res.json({
      success: true,
      data: stock,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to fetch seva offering stock.',
    });
  }
});

export default router;