import {Router, Request, Response} from 'express';

import apiResponse from '../../utils/apiResponse';
import {
  amountAllowed,
  createRazorpayOrder,
  razorpayPublicConfig,
  razorpayReady,
  rupeesToPaise,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from './razorpay.service';

const router = Router();

router.get('/config', (_req: Request, res: Response) => {
  const config = razorpayPublicConfig();
  return apiResponse.success(res, 'Razorpay', {
    enabled: config.enabled,
    keyId: config.enabled ? config.keyId : '',
    mode: config.mode,
  });
});

router.post('/order', async (req: Request, res: Response) => {
  try {
    if (!razorpayReady()) {
      return apiResponse.error(res, 'Online payment is not set up yet.', 503);
    }
    const rupees = Number(req.body?.amountRupees);
    const paise = rupeesToPaise(rupees);
    if (!amountAllowed(paise)) {
      return apiResponse.error(
        res,
        'Enter an amount from ₹1 to ₹5,00,000.',
        400,
      );
    }
    const name = String(req.body?.name || '').trim().slice(0, 80);
    const phone = String(req.body?.phone || '').replace(/\D/g, '').slice(0, 15);
    const note = String(req.body?.note || 'Seva offering').trim().slice(0, 80);
    const source = String(req.body?.source || 'website').trim().slice(0, 40);
    const order = await createRazorpayOrder({
      amountPaise: paise,
      receipt: `js${Date.now()}`,
      notes: {
        name,
        phone,
        note,
        source,
      },
    });
    return apiResponse.success(res, 'Payment started', order);
  } catch (error: any) {
    return apiResponse.error(
      res,
      error?.message || 'Could not start the payment.',
      502,
    );
  }
});

router.post('/verify', (req: Request, res: Response) => {
  if (!razorpayReady()) {
    return apiResponse.error(res, 'Online payment is not set up yet.', 503);
  }
  const orderId = String(req.body?.razorpay_order_id || '').trim();
  const paymentId = String(req.body?.razorpay_payment_id || '').trim();
  const signature = String(req.body?.razorpay_signature || '').trim();
  if (!orderId || !paymentId || !signature) {
    return apiResponse.error(res, 'Payment details are missing.', 400);
  }
  const valid = verifyPaymentSignature(orderId, paymentId, signature);
  if (!valid) {
    return apiResponse.error(res, 'Payment could not be confirmed.', 400);
  }
  return apiResponse.success(res, 'Payment successful', {
    orderId,
    paymentId,
  });
});

router.post('/webhook', (req: Request, res: Response) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const signature = String(req.header('x-razorpay-signature') || '');
  if (!verifyWebhookSignature(raw, signature)) {
    return apiResponse.error(res, 'Invalid webhook signature.', 400);
  }
  return apiResponse.success(res, 'Webhook received');
});

export default router;
