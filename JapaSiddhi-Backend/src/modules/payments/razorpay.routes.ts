import {Router, Request, Response} from 'express';

import apiResponse from '../../utils/apiResponse';
import {
  amountAllowed,
  createRazorpayOrder,
  razorpayPublicConfig,
  razorpayReady,
  recordRazorpayPayment,
  recordRazorpayPaymentById,
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
    const preferDate = String(req.body?.preferDate || '').trim().slice(0, 10);
    const occasion = String(req.body?.occasion || '').trim().slice(0, 40);
    const forWhom = String(req.body?.forWhom || '').trim().slice(0, 20);
    const personName = String(req.body?.personName || '').trim().slice(0, 80);
    const comments = String(req.body?.comments || '').trim().slice(0, 1000);
    const order = await createRazorpayOrder({
      amountPaise: paise,
      receipt: `js${Date.now()}`,
      notes: {
        name,
        phone,
        note,
        source,
        preferDate,
        occasion,
        forWhom,
        personName,
        comments,
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

const clip = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);

const escapeAttr = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

const appReturnPage = (target: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Returning to Japa Siddhi</title>
<meta http-equiv="refresh" content="0;url=${escapeAttr(target)}">
</head>
<body style="font-family:sans-serif;padding:24px">
<p>Returning to the Japa Siddhi app…</p>
<p><a href="${escapeAttr(target)}">Open the app</a></p>
</body>
</html>`;

const sendAppReturn = (req: Request, res: Response) => {
  const orderId = clip(req.body?.razorpay_order_id || req.query.razorpay_order_id, 40);
  const paymentId = clip(req.body?.razorpay_payment_id || req.query.razorpay_payment_id, 40);
  const signature = clip(req.body?.razorpay_signature || req.query.razorpay_signature, 128);
  const paid =
    Boolean(orderId && paymentId && signature) &&
    verifyPaymentSignature(orderId, paymentId, signature);
  const query = new URLSearchParams();
  const purpose = clip(req.query.purpose, 80);
  const seva = clip(req.query.seva, 40);
  const amount = clip(req.query.amount, 7).replace(/\D/g, '');
  const name = clip(req.query.name, 60);
  const phone = clip(req.query.phone, 15).replace(/\D/g, '').slice(-10);
  if (purpose) query.set('purpose', purpose);
  if (seva) query.set('seva', seva);
  if (amount) query.set('amount', amount);
  if (name) query.set('name', name);
  if (phone.length === 10) query.set('phone', phone);
  if (paid) {
    query.set('payment_id', paymentId);
    query.set('order_id', orderId);
    void recordRazorpayPaymentById(paymentId).catch((error: any) => {
      console.error('Could not save the Razorpay donation:', error?.message || error);
    });
  }
  const target = `japasiddhi://payment/${paid ? 'success' : 'failure'}?${query.toString()}`;
  res.status(200).type('html').send(appReturnPage(target));
};

router.get('/app-return', sendAppReturn);
router.post('/app-return', sendAppReturn);

router.post('/verify', async (req: Request, res: Response) => {
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
  try {
    await recordRazorpayPaymentById(paymentId);
  } catch (error: any) {
    console.error('Could not save the Razorpay donation:', error?.message || error);
  }
  return apiResponse.success(res, 'Payment successful', {
    orderId,
    paymentId,
  });
});

router.post('/webhook', async (req: Request, res: Response) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const signature = String(req.header('x-razorpay-signature') || '');
  if (!verifyWebhookSignature(raw, signature)) {
    return apiResponse.error(res, 'Invalid webhook signature.', 400);
  }
  try {
    const event = JSON.parse(raw.toString('utf8')) as {
      event?: string;
      payload?: {payment?: {entity?: Record<string, unknown>}};
    };
    const payment = event.payload?.payment?.entity;
    if (payment && String(event.event || '').startsWith('payment.')) {
      await recordRazorpayPayment(payment as any);
    }
  } catch (error: any) {
    console.error('Could not save the Razorpay webhook:', error?.message || error);
  }
  return apiResponse.success(res, 'Webhook received');
});

export default router;
