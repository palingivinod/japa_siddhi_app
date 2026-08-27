import { Router } from 'express';

import donationController from './donation.controller';

import authenticate from '../../middleware/auth.middleware';


const router = Router();


router.post(
  '/',
  authenticate,
  donationController.create,
);


router.get(
  '/history',
  authenticate,
  donationController.history,
);


router.get(
  '/monthly-status',
  authenticate,
  donationController.monthlyStatus,
);


router.get(
  '/payment-details',
  authenticate,
  donationController.paymentDetails,
);

router.get(
  '/catalog',
  authenticate,
  donationController.catalog,
);

router.post(
  '/checkout',
  authenticate,
  donationController.checkout,
);


export default router;