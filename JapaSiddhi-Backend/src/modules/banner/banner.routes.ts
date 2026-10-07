import {Router, Request, Response} from 'express';

import {listBanners} from '../admin/banner.service';

const router = Router();

router.get('/active', async (req: Request, res: Response) => {
  try {
    const moduleName = String(req.query.module || '').trim() || undefined;
    const lang = String(req.query.lang || '')
      .trim()
      .toLowerCase()
      .slice(0, 2);
    const data = await listBanners(true, moduleName, lang || 'en');
    return res.json({success: true, data});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load banners.',
    });
  }
});

export default router;
