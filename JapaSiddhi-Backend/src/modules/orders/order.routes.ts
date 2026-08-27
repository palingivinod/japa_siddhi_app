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