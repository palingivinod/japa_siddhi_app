import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

import mysql from '../../database/mysql';

const resolveLogoPath = (): string | null => {
  const candidates = [
    path.join(process.cwd(), 'assets', 'logo.png'),
    path.join(process.cwd(), 'dist', 'assets', 'logo.png'),
    path.join(__dirname, '..', '..', '..', 'assets', 'logo.png'),
    path.join(__dirname, '..', '..', '..', '..', 'assets', 'logo.png'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }
  return null;
};

export type ReceiptInput = {
  paymentId: string;
  orderId?: string;
  amount?: number | null;
  seva?: string;
  purpose?: string;
  name?: string;
  phone?: string;
  paidAt?: string;
};

const line = (doc: InstanceType<typeof PDFDocument>, label: string, value: string) => {
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#56350F')
    .text(label, {continued: true});
  doc
    .font('Helvetica')
    .fillColor('#3A2010')
    .text(` ${value}`);
  doc.moveDown(0.35);
};

export const buildPaymentReceiptPdf = async (
  input: ReceiptInput,
): Promise<{fileName: string; base64: string; mimeType: string}> => {
  const paymentId = String(input.paymentId || '').trim();
  if (!paymentId) {
    throw new Error('Payment id is required.');
  }

  let amount = Number(input.amount);
  let name = String(input.name || '').trim();
  let phone = String(input.phone || '').trim();
  let seva = String(input.seva || input.purpose || '').trim();
  let purpose = String(input.purpose || '').trim();
  let orderId = String(input.orderId || '').trim();
  let paidAt = String(input.paidAt || '').trim();

  try {
    const rows = await mysql.query<any[]>(
      `SELECT amount, donor_name AS donorName, donor_phone AS donorPhone,
              donation_type AS donationType, remarks, payment_reference AS orderRef,
              donated_at AS donatedAt, transaction_id AS transactionId
       FROM donations
       WHERE transaction_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [paymentId],
    );
    const row = rows?.[0];
    if (row) {
      if (!Number.isFinite(amount) || amount < 1) {
        amount = Number(row.amount);
      }
      if (!name) {
        name = String(row.donorName || row.donor_name || '').trim();
      }
      if (!phone) {
        phone = String(row.donorPhone || row.donor_phone || '').trim();
      }
      if (!seva) {
        seva = String(row.donationType || row.donation_type || '').trim();
      }
      if (!purpose) {
        purpose = String(row.remarks || '').trim().slice(0, 120);
      }
      if (!orderId) {
        orderId = String(row.orderRef || row.payment_reference || '').trim();
      }
      if (!paidAt) {
        paidAt = String(row.donatedAt || row.donated_at || '').trim();
      }
    }
  } catch {
    // Receipt can still be built from request params if DB lookup fails.
  }

  const amountLabel =
    Number.isFinite(amount) && amount > 0 ? `₹${Math.round(amount)}` : '—';
  const when =
    paidAt && !Number.isNaN(Date.parse(paidAt))
      ? new Date(paidAt).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})
      : new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});

  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const logoPath = resolveLogoPath();
  if (logoPath) {
    try {
      const logoWidth = 88;
      const logoX = (doc.page.width - logoWidth) / 2;
      const logoY = doc.y;
      doc.image(logoPath, logoX, logoY, {width: logoWidth});
      doc.y = logoY + logoWidth + 14;
    } catch (error: any) {
      console.warn('Receipt logo embed failed:', error?.message || error);
    }
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor('#2D5016')
    .text('Japa Siddhi', {align: 'center'});
  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#665242')
    .text('Bilva Patra Trust', {align: 'center'});
  doc.moveDown(0.4);
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#B87316')
    .text('Payment Receipt', {align: 'center'});
  doc.moveDown(1);

  doc
    .moveTo(48, doc.y)
    .lineTo(547, doc.y)
    .strokeColor('#E8D9B8')
    .stroke();
  doc.moveDown(1);

  line(doc, 'Status:', 'SUCCESS');
  line(doc, 'Date:', when);
  line(doc, 'Payment ID:', paymentId);
  if (orderId) {
    line(doc, 'Order ID:', orderId);
  }
  line(doc, 'Amount:', amountLabel);
  if (seva) {
    line(doc, 'Seva:', seva);
  }
  if (purpose && purpose !== seva) {
    line(doc, 'Purpose:', purpose);
  }
  if (name) {
    line(doc, 'Devotee:', name);
  }
  if (phone) {
    line(doc, 'Mobile:', phone);
  }

  doc.moveDown(1.2);
  doc
    .moveTo(48, doc.y)
    .lineTo(547, doc.y)
    .strokeColor('#E8D9B8')
    .stroke();
  doc.moveDown(1);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#665242')
    .text(
      'Thank you for your contribution. This receipt confirms your payment through Razorpay for Japa Siddhi seva offerings.',
      {align: 'left'},
    );
  doc.moveDown(0.8);
  doc.text('Team Japa Siddhi — Bilva Patra Trust', {align: 'left'});

  doc.end();
  const buffer = await done;
  const safeId = paymentId.replace(/[^\w.-]/g, '').slice(0, 24) || 'payment';
  return {
    fileName: `japa-siddhi-receipt-${safeId}.pdf`,
    base64: buffer.toString('base64'),
    mimeType: 'application/pdf',
  };
};
