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

router.get(
  '/homam-status',
  authenticate,
  donationController.homamStatus,
);

router.post(
  '/checkout',
  authenticate,
  donationController.checkout,
);

router.post('/autopay/request', async (req: any, res: any) => {
  try {
    const {createAutopayRequest} = await import('./autopay.service');
    const data = await createAutopayRequest({
      userId: req.user?.id || req.body?.userId || null,
      fullName: req.body?.fullName || req.body?.name || '',
      mobile: req.body?.mobile || req.body?.phone || '',
      amount: req.body?.amount,
      notes: req.body?.notes,
    });
    return res.json({success: true, message: 'Autopay request submitted', data});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Could not submit autopay request',
    });
  }
});

export default router;