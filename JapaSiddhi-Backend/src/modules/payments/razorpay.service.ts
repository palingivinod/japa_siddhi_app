import crypto from 'crypto';

import environment from '../../config/environment';

const MIN_PAISE = 100;
const MAX_PAISE = 50000000;

export const razorpayReady = () =>
  Boolean(environment.RAZORPAY_KEY_ID && environment.RAZORPAY_KEY_SECRET);

export const razorpayPublicConfig = () => ({
  enabled: razorpayReady(),
  keyId: environment.RAZORPAY_KEY_ID,
  mode: environment.RAZORPAY_KEY_ID.startsWith('rzp_test_') ? 'test' : 'live',
});

const authHeader = () =>
  `Basic ${Buffer.from(
    `${environment.RAZORPAY_KEY_ID}:${environment.RAZORPAY_KEY_SECRET}`,
  ).toString('base64')}`;

const safeEqual = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
};

export const rupeesToPaise = (rupees: number) => {
  if (!Number.isFinite(rupees)) {
    return 0;
  }
  return Math.round(rupees * 100);
};

export const amountAllowed = (paise: number) =>
  Number.isInteger(paise) && paise >= MIN_PAISE && paise <= MAX_PAISE;

export const createRazorpayOrder = async (input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}) => {
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: {description?: string};
  };
  if (!response.ok || !body.id) {
    throw new Error(body.error?.description || 'Could not start the payment.');
  }
  return {
    orderId: body.id,
    amount: Number(body.amount || input.amountPaise),
    currency: body.currency || 'INR',
    keyId: environment.RAZORPAY_KEY_ID,
  };
};

export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string,
) => {
  const expected = crypto
    .createHmac('sha256', environment.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqual(expected, signature);
};

export const verifyWebhookSignature = (rawBody: Buffer, signature: string) => {
  const secret = environment.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return safeEqual(expected, signature);
};
