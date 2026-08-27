import {
  Router,
} from 'express';

import customerCareController from './customerCare.controller';

import authenticate from '../../middleware/auth.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  customerCareController.create,
);

router.get(
  '/',
  authenticate,
  customerCareController.getMyTickets,
);

router.get(
  '/config',
  authenticate,
  customerCareController.getConfig,
);

router.get(
  '/faq',
  authenticate,
  customerCareController.getFaqs,
);

router.get(
  '/:id',
  authenticate,
  customerCareController.getById,
);

router.put(
  '/:id/reply',
  authenticate,
  customerCareController.reply,
);

export default router;