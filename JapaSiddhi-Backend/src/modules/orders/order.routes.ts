import { Router } from 'express';

import orderController from './order.controller';

import authenticate from '../../middleware/auth.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  orderController.create,
);

router.get(
  '/',
  authenticate,
  orderController.getMyOrders,
);

router.put(
  '/:id/cancel',
  authenticate,
  orderController.cancel,
);

router.put(
  '/:id/received',
  authenticate,
  orderController.markReceived,
);

router.get(
  '/:id/tracking',
  authenticate,
  orderController.getTracking,
);

router.get(
  '/:id',
  authenticate,
  orderController.getById,
);

router.put(
  '/:id/order-status',
  authenticate,
  orderController.updateOrderStatus,
);

router.put(
  '/:id/payment-status',
  authenticate,
  orderController.updatePaymentStatus,
);

export default router;