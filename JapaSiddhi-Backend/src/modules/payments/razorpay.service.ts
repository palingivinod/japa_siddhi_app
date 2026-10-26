import crypto from 'crypto';

import environment from '../../config/environment';
import mysql from '../../database/mysql';
import emailOtpService from '../../services/emailOtp.service';

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

type RazorpayPayment = {
  id?: string;
  amount?: number;
  status?: string;
  order_id?: string;
  contact?: string;
  email?: string;
  created_at?: number;
  notes?: Record<string, string>;
};

const razorpayGet = async (path: string) => {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    headers: {Authorization: authHeader()},
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('Could not read the Razorpay payment.');
  }
  return body as {items?: RazorpayPayment} & RazorpayPayment;
};

const sevaType = (note: string) => {
  if (/homam/i.test(note)) {
    return 'NITHYA_HOMAM';
  }
  if (/anna|santharpana/i.test(note)) {
    return 'ANNADANAM';
  }
  return 'GENERAL';
};

const istStamp = (unixSeconds?: number) => {
  const date = new Date((Number(unixSeconds) || Math.floor(Date.now() / 1000)) * 1000);
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
};

let donationUserReady = false;

const allowGuestDonation = async () => {
  if (donationUserReady) {
    return;
  }
  await mysql.query('SELECT 1');
  if (mysql.getEngineName() === 'mysql') {
    try {
      await mysql.query(`ALTER TABLE donations DROP FOREIGN KEY fk_donation_user`);
    } catch {
      // The foreign key is already gone, or it has another name.
    }
    try {
      await mysql.query(
        `ALTER TABLE donations MODIFY COLUMN user_id BIGINT UNSIGNED NULL`,
      );
    } catch {
      // Already nullable, or this database keeps the original column.
    }
  }
  donationUserReady = true;
};

const userIdForPhone = async (phone: string) => {
  const last10 = phone.replace(/\D/g, '').slice(-10);
  if (last10.length !== 10) {
    return null;
  }
  await mysql.query('SELECT 1');
  const phoneExpr =
    mysql.getEngineName() === 'mysql'
      ? `RIGHT(REPLACE(REPLACE(IFNULL(mobile_number, ''), ' ', ''), '-', ''), 10)`
      : `substr(replace(replace(IFNULL(mobile_number, ''), ' ', ''), '-', ''), -10)`;
  const rows = await mysql.query<any[]>(
    `
    SELECT id
    FROM users
    WHERE ${phoneExpr} = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [last10],
  );
  const id = Number(rows?.[0]?.id || 0);
  return id > 0 ? id : null;
};

export const ensureDonationColumns = async () => {
  const alters = [
    `ALTER TABLE donations ADD COLUMN donor_name TEXT`,
    `ALTER TABLE donations ADD COLUMN donor_phone TEXT`,
    `ALTER TABLE donations ADD COLUMN prefer_date TEXT`,
    `ALTER TABLE donations ADD COLUMN occasion TEXT`,
    `ALTER TABLE donations ADD COLUMN for_whom TEXT`,
    `ALTER TABLE donations ADD COLUMN person_name TEXT`,
  ];
  for (const sql of alters) {
    try {
      await mysql.query(sql);
    } catch {
      // The column is already on the table.
    }
  }
};

const insertDonation = async (input: {
  userId: number | null;
  donationType: string;
  amount: number;
  paymentId: string;
  orderId: string;
  donatedAt: string;
  remarks: string;
  donorName: string;
  donorPhone: string;
  preferDate: string;
  occasion: string;
  forWhom: string;
  personName: string;
}) => {
  await ensureDonationColumns();
  const columns = [
    'user_id',
    'donation_type',
    'amount',
    'currency',
    'payment_method',
    'transaction_id',
    'payment_status',
    'donated_at',
    'remarks',
    'donor_name',
    'donor_phone',
    'prefer_date',
    'occasion',
    'for_whom',
    'person_name',
  ];
  const values = [
    input.userId,
    input.donationType,
    input.amount,
    'INR',
    'RAZORPAY',
    input.paymentId,
    'SUCCESS',
    input.donatedAt,
    input.remarks,
    input.donorName || null,
    input.donorPhone || null,
    input.preferDate || null,
    input.occasion || null,
    input.forWhom || null,
    input.personName || null,
  ];
  try {
    await mysql.query(
      `
      INSERT INTO donations (${columns.join(', ')}, donation_status, payment_reference)
      VALUES (${columns.map(() => '?').join(', ')}, 'SUCCESS', ?)
      `,
      [...values, input.orderId || null],
    );
  } catch {
    await mysql.query(
      `
      INSERT INTO donations (${columns.join(', ')})
      VALUES (${columns.map(() => '?').join(', ')})
      `,
      values,
    );
  }
};

export const recordRazorpayPayment = async (payment: RazorpayPayment) => {
  const paymentId = String(payment.id || '').trim();
  const status = String(payment.status || '').toLowerCase();
  const amount = Math.round(Number(payment.amount || 0) / 100);
  if (!paymentId || status !== 'captured' || !Number.isFinite(amount) || amount < 1) {
    return false;
  }
  await allowGuestDonation();
  const existing = await mysql.query<any[]>(
    `SELECT id FROM donations WHERE transaction_id = ? LIMIT 1`,
    [paymentId],
  );
  if (existing?.length) {
    return false;
  }
  const notes =
    payment.notes && !Array.isArray(payment.notes) ? payment.notes : {};
  const source = String(notes.source || '').trim().toLowerCase();
  if (source !== 'app') {
    return false;
  }
  const name = String(notes.name || '').trim();
  const phone = String(notes.phone || payment.contact || '').trim();
  const note = String(notes.note || 'Seva offering').trim();
  const preferDate = String(notes.preferDate || '').trim().slice(0, 10);
  const occasion = String(notes.occasion || '').trim().slice(0, 40);
  const forWhom = String(notes.forWhom || '').trim().slice(0, 20);
  const personName = String(notes.personName || '').trim().slice(0, 80);
  const userId = await userIdForPhone(phone);
  const remarks = [
    `Seva: ${note}`,
    name ? `Name: ${name}` : '',
    phone ? `Phone: ${phone}` : '',
    preferDate ? `Prefer date: ${preferDate}` : '',
    occasion ? `Occasion: ${occasion}` : '',
    forWhom ? `For whom: ${forWhom}` : '',
    personName ? `Person name: ${personName}` : '',
    source ? `Source: ${source}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 700);
  const specificType = sevaType(note);
  try {
    await insertDonation({
      userId,
      donationType: specificType,
      amount,
      paymentId,
      orderId: String(payment.order_id || ''),
      donatedAt: istStamp(payment.created_at),
      remarks,
      donorName: name,
      donorPhone: phone,
      preferDate,
      occasion,
      forWhom,
      personName,
    });
  } catch {
    await insertDonation({
      userId,
      donationType: 'GENERAL',
      amount,
      paymentId,
      orderId: String(payment.order_id || ''),
      donatedAt: istStamp(payment.created_at),
      remarks,
      donorName: name,
      donorPhone: phone,
      preferDate,
      occasion,
      forWhom,
      personName,
    });
  }
  await emailOtpService.notifyAdmin(
    'Razorpay donation received',
    [`A Razorpay payment was saved.`, `Amount: ₹${amount}`, remarks, `Payment: ${paymentId}`].join(
      '\n',
    ),
  );
  return true;
};

export const recordRazorpayPaymentById = async (paymentId: string) => {
  if (!razorpayReady() || !paymentId) {
    return false;
  }
  const payment = await razorpayGet(`payments/${encodeURIComponent(paymentId)}`);
  return recordRazorpayPayment(payment);
};

let recentSyncStarted = false;

const removeNonAppRazorpayDonations = async () => {
  await mysql.query(
    `
    DELETE FROM donations
    WHERE UPPER(IFNULL(payment_method, '')) = 'RAZORPAY'
      AND IFNULL(remarks, '') NOT LIKE '%Source: app%'
    `,
  );
};

export const syncRecentRazorpayDonations = async () => {
  if (recentSyncStarted || !razorpayReady()) {
    return;
  }
  recentSyncStarted = true;
  try {
    await removeNonAppRazorpayDonations();
    for (let skip = 0; skip < 100; skip += 20) {
      const body = await razorpayGet(`payments?count=20&skip=${skip}`);
      const items = Array.isArray(body.items) ? body.items : [];
      for (const payment of items) {
        try {
          await recordRazorpayPayment(payment);
        } catch (error: any) {
          console.error('Could not save a Razorpay donation:', error?.message || error);
        }
      }
      if (items.length < 20) {
        break;
      }
    }
  } catch (error: any) {
    recentSyncStarted = false;
    console.error('Could not read recent Razorpay payments:', error?.message || error);
  }
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
