import {
  CreateDonationRequest,
  MonthlyDonationStatus,
  DonationPaymentDetails,
} from './donation.types';

import donationRepository from './donation.repository';
import emailOtpService from '../../services/emailOtp.service';
import orderService from '../orders/order.service';
import banaLingamService from '../banaLingam/banaLingam.service';
import profileRepository from '../profile/profile.repository';
import AppError from '../../utils/appError';
import mysql from '../../database/mysql';



class DonationService {


  async create(
    userId: number,
    data: CreateDonationRequest & {skipAdminNotify?: boolean},
  ) {


    const id =
      await donationRepository.create({

        userId,

        donationType:
          data.donationType,

        amount:
          data.amount,

        paymentMethod:
          data.paymentMethod,

        transactionId:
          data.transactionId ?? null,

        paymentReference:
          data.paymentReference ?? null,

        remarks:
          data.remarks ?? null,

      });


    if (!data.skipAdminNotify) {
      await emailOtpService.notifyAdmin(
        `New ${data.donationType} donation`,
        [
          'A new donation or seva was recorded.',
          `Type: ${data.donationType}`,
          `Amount: ₹${data.amount}`,
          `Method: ${data.paymentMethod}`,
          `Remarks: ${data.remarks || '-'}`,
          `User ID: ${userId}`,
          `Donation ID: ${id}`,
        ].join('\n'),
      );
    }

    return {

      id,

    };

  }



  async getHistory(
    userId: number,
  ) {


    return donationRepository.getHistory(
      userId,
    );

  }



  async getMonthlyStatus(
    userId: number,
  ): Promise<MonthlyDonationStatus> {


    const donation =
      await donationRepository.getMonthlyStatus(
        userId,
      );


    return {

      isDonated:
        !!donation,

      amount:
        donation?.amount ?? 0,

      month:
        new Date()
          .toISOString()
          .slice(0, 7),

      lastDonationDate:
        donation?.donated_at ?? null,

    };

  }



  async getPaymentDetails(): Promise<DonationPaymentDetails> {


    const settings =
      await donationRepository.getPaymentSettings();


    const placeholderValues = new Set([
      '123456789012',
      'SBIN0001234',
      '9999999999',
    ]);

    const realValue = (value?: string | null) => {
      const trimmed = String(value || '').trim();
      if (!trimmed || placeholderValues.has(trimmed)) {
        return null;
      }
      return trimmed;
    };

    const details: any = {

      upiId: null,

      googlePayNumber: null,

      phonePeNumber: null,

      paytmNumber: null,

      qrCode: null,

      bankName: null,

      accountHolderName: null,

      accountNumber: null,

      ifscCode: null,

    };


    settings.forEach((item) => {

      switch(item.setting_key) {

        case 'upi_id':
          details.upiId = realValue(item.setting_value) || 'q007640149@ybl';
          break;

        case 'google_pay_number':
          details.googlePayNumber = realValue(item.setting_value);
          break;

        case 'phonepe_number':
          details.phonePeNumber = realValue(item.setting_value);
          break;

        case 'paytm_number':
          details.paytmNumber = realValue(item.setting_value);
          break;

        case 'donation_qr_code':
          details.qrCode = realValue(item.setting_value);
          break;

        case 'bank_name':
          details.bankName = realValue(item.setting_value);
          break;

        case 'account_holder_name':
          details.accountHolderName = realValue(item.setting_value);
          break;

        case 'account_number':
          details.accountNumber = realValue(item.setting_value);
          break;

        case 'ifsc_code':
          details.ifscCode = realValue(item.setting_value);
          break;

      }

    });


    if (!details.upiId) {
      details.upiId = 'q007640149@ybl';
    }

    return details;

  }

  getCatalog() {
    return {
      offerings: [501, 1008, 2001],
      homamAmount: 1008,
      methods: ['UPI'],
      services: [
        {
          key: 'JAPA_ANNADANAM',
          title: 'Japa Annadanam',
          subtitle: 'Sponsor food after your Japa milestone.',
        },
        {
          key: 'GENERAL',
          title: 'General Annadanam',
          subtitle: 'Offer food service for an occasion.',
        },
      ],
    };
  }

  async getHomamStatus(userId: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        payment_status AS paymentStatus,
        order_status AS orderStatus,
        remarks,
        created_at AS createdAt
      FROM orders
      WHERE user_id = ?
        AND order_type = 'NITHYA_HOMAM'
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId],
    );
    const row = rows?.[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      code: `NH${row.id}`,
      paymentStatus: row.paymentStatus,
      orderStatus: row.orderStatus,
      remarks: row.remarks || '',
      createdAt: row.createdAt,
    };
  }

  async checkout(
    userId: number,
    data: {
      kind?: string;
      amount?: number;
      fullName?: string;
      mobile?: string;
      address?: string;
      occasion?: string;
      nakshatram?: string;
      gothram?: string;
      remarks?: string;
      purpose?: string;
      comments?: string;
      transactionId?: string;
      utr?: string;
    },
  ) {
    const kind = String(data.kind || 'ANNADANAM').toUpperCase();
    const amount = Number(data.amount || 1008);
    const purpose = String(data.purpose || data.remarks || '').trim();
    const comments = String(data.comments || '').trim().slice(0, 1000);
    const utr = String(data.transactionId || data.utr || '')
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase();

    if (kind === 'NITHYA_HOMAM') {
      if (utr.length < 8) {
        throw new AppError(
          'Enter the UPI payment UTR / Transaction ID from your payment app after paying.',
          400,
        );
      }
    }

    // Older app builds may send a country code, so keep the last 10 digits and
    // reject anything that is not a full mobile number.
    const rawMobile = String(data.mobile ?? '').trim();
    const mobile = rawMobile.replace(/\D/g, '').slice(-10);
    if (rawMobile && mobile.length !== 10) {
      throw new AppError('Enter a valid 10-digit mobile number.', 400);
    }

    const remarks = [
      data.fullName ? `Name: ${data.fullName}` : '',
      mobile ? `Mobile: ${mobile}` : '',
      data.gothram ? `Gothram: ${data.gothram}` : '',
      data.nakshatram ? `Nakshatram: ${data.nakshatram}` : '',
      data.occasion ? `Occasion: ${data.occasion}` : '',
      data.address ? `Address: ${data.address}` : '',
      purpose ? `Purpose: ${purpose}` : '',
      comments ? `Comments: ${comments}` : '',
      utr ? `UTR: ${utr}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    let donationId: number | null = null;
    let requestId: number | null = null;
    let itemName = 'Annadanam';
    let orderType:
      | 'BANA_LINGAM'
      | 'RAMAKOTI_BOOKS'
      | 'HOMA_BHASMA'
      | 'BIRAVA_PENDANT'
      | 'ANNADANAM'
      | 'NITHYA_HOMAM' = 'ANNADANAM';
    let donationType: 'ANNADANAM' | 'GENERAL' | 'NITHYA_HOMAM' = 'ANNADANAM';

    if (kind === 'BANA_LINGAM') {
      const activeBanaOrder = await mysql.query<any[]>(
        `
        SELECT id, order_number, order_status
        FROM orders
        WHERE user_id = ?
          AND (order_type = 'BANA_LINGAM' OR lower(item_name) LIKE '%baanalingam%' OR lower(item_name) LIKE '%banalingam%')
          AND upper(order_status) NOT IN ('DELIVERED', 'CANCELLED')
        LIMIT 1
        `,
        [userId],
      );

      if (activeBanaOrder && activeBanaOrder.length > 0) {
        throw new AppError(
          'Already one order is in review. You can order another once your previous order is delivered.',
          400,
        );
      }

      itemName = 'Baanalingam';
      orderType = 'BANA_LINGAM';
    } else if (kind === 'RAMAKOTI_BOOKS') {
      itemName = 'Ramakoti Books';
      orderType = 'RAMAKOTI_BOOKS';
      if (!String(data.address || '').trim()) {
        throw new AppError('Add your address in Personal Details.', 400);
      }
    } else if (kind === 'HOMA_BHASMA') {
      itemName = 'Homa Bhasma';
      orderType = 'HOMA_BHASMA';
      if (!String(data.address || '').trim()) {
        throw new AppError('Enter a delivery address.', 400);
      }
    } else if (kind === 'BIRAVA_PENDANT') {
      itemName = 'Bhirava Pendent';
      orderType = 'BIRAVA_PENDANT';
      if (!String(data.address || '').trim()) {
        throw new AppError('Enter a delivery address.', 400);
      }
    } else if (kind === 'NITHYA_HOMAM') {
      itemName = 'Nithya Homam';
      orderType = 'NITHYA_HOMAM';
      donationType = 'NITHYA_HOMAM';
    } else if (kind === 'GENERAL' || kind === 'GENERAL_ANNADANAM') {
      itemName = 'General Annadanam';
      donationType = 'GENERAL';
    } else {
      itemName = 'Japa Annadanam';
      donationType = 'ANNADANAM';
    }

    const isRequestOrder =
      kind === 'BANA_LINGAM' ||
      kind === 'RAMAKOTI_BOOKS' ||
      kind === 'HOMA_BHASMA' ||
      kind === 'BIRAVA_PENDANT';

    if (!isRequestOrder) {
      const donation = await this.create(userId, {
        donationType,
        amount,
        paymentMethod: 'UPI',
        transactionId: utr || `UPI-${Date.now()}`,
        paymentReference: 'UPI QR',
        remarks,
        skipAdminNotify: kind === 'NITHYA_HOMAM',
      });
      donationId = donation.id;
    }

    const deliveryLines = [
      `Name: ${data.fullName || 'Devotee'}`,
      `Mobile: ${mobile || '-'}`,
      `Address: ${String(data.address || '').trim()}`,
      data.gothram ? `Gothram: ${data.gothram}` : '',
      data.nakshatram ? `Nakshatram: ${data.nakshatram}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const orderRemarks =
      kind === 'RAMAKOTI_BOOKS' ||
      kind === 'HOMA_BHASMA' ||
      kind === 'BIRAVA_PENDANT'
        ? deliveryLines
        : remarks || `Paid ₹${amount} via UPI QR`;
    const numberPrefix =
      kind === 'RAMAKOTI_BOOKS'
        ? 'RK'
        : kind === 'HOMA_BHASMA'
          ? 'HB'
          : kind === 'BIRAVA_PENDANT'
            ? 'BP'
            : undefined;
    const order = await orderService.create({
      userId,
      orderType,
      orderSource: 'PURCHASE',
      itemName,
      quantity: 1,
      orderStatus: 'UNDER_REVIEW',
      remarks: orderRemarks,
      numberPrefix,
    });

    if (kind === 'NITHYA_HOMAM') {
      // Stay pending until admin verifies the UTR against bank/UPI statement.
      await orderService.updatePaymentStatus(order.id, 'PENDING');
      await orderService.updateOrderStatus(order.id, 'PENDING');
      await emailOtpService.notifyAdmin(
        'Nithya Homam payment pending verification',
        [
          'A devotee submitted Nithya Homam payment for verification.',
          `Name: ${data.fullName || '-'}`,
          `Mobile: ${mobile || '-'}`,
          `Gothram: ${data.gothram || '-'}`,
          `Nakshatram: ${data.nakshatram || '-'}`,
          `Purpose: ${purpose || '-'}`,
          `Amount: ₹${amount}`,
          `UTR / Transaction ID: ${utr}`,
          `User ID: ${userId}`,
          `Enrollment ID: NH${order.id}`,
          '',
          'Please verify this UTR in your UPI/bank app, then mark Verified in Admin → Nithya Homam.',
        ].join('\n'),
      );
    }

    if (kind === 'BANA_LINGAM') {
      const request = await banaLingamService.create({
        userId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        fullName: data.fullName || 'Devotee',
        mobile,
        address: data.address || 'Temple delivery',
        cityId: 1,
        stateId: 1,
        countryId: 1,
        postalCode: '000000',
        nakshatram: data.nakshatram,
        gothram: data.gothram,
        quantity: 1,
        remarks,
      });
      requestId = request.id;
      if (data.address) {
        await profileRepository.saveAddress(userId, data.address);
      }
    }

    if (
      (kind === 'RAMAKOTI_BOOKS' ||
        kind === 'HOMA_BHASMA' ||
        kind === 'BIRAVA_PENDANT') &&
      data.address
    ) {
      await profileRepository.saveAddress(userId, data.address);
    }

    const confirmationId =
      isRequestOrder
        ? order.orderNumber
        : kind === 'NITHYA_HOMAM'
          ? `NH${order.id}${String(Date.now()).slice(-3)}`
          : `ANN${order.id}${String(Date.now()).slice(-3)}`;
    return {
      donationId,
      requestId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      confirmationId,
      itemName,
      amount,
      method: 'Razorpay',
      kind,
      paymentStatus: kind === 'NITHYA_HOMAM' ? 'PENDING' : 'SUCCESS',
      utr: utr || null,
      message:
        kind === 'NITHYA_HOMAM'
          ? 'Payment submitted. Enrollment will activate after admin verifies your UTR.'
          : undefined,
    };
  }

}


export default new DonationService();