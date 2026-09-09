import {Router, Request, Response} from 'express';

import {getAnnadanamVisibility} from '../admin/annadanamFeatures.service';

const router = Router();

router.get('/visibility', async (_req: Request, res: Response) => {
  try {
    const data = await getAnnadanamVisibility();
    return res.json({success: true, data});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load Annadanam visibility.',
    });
  }
});

export default router;
