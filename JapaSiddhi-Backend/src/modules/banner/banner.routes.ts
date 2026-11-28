import {Router, Request, Response} from 'express';

import {getLiveBannerById, listBanners} from '../admin/banner.service';

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

/** Full banner (description, image, video, audio, link) for the detail screen. */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res
        .status(400)
        .json({success: false, message: 'Invalid banner id.'});
    }
    const lang = String(req.query.lang || '')
      .trim()
      .toLowerCase()
      .slice(0, 2);
    const data = await getLiveBannerById(id, lang || 'en');
    if (!data) {
      return res
        .status(404)
        .json({success: false, message: 'This banner is no longer available.'});
    }
    return res.json({success: true, data});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load banner.',
    });
  }
});

export default router;
