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
      transactionId?: string;
      utr?: string;
    },
  ) {
    const kind = String(data.kind || 'ANNADANAM').toUpperCase();
    const amount = Number(data.amount || 1008);
    const purpose = String(data.purpose || data.remarks || '').trim();
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

    const remarks = [
      data.fullName ? `Name: ${data.fullName}` : '',
      data.mobile ? `Mobile: ${data.mobile}` : '',
      data.gothram ? `Gothram: ${data.gothram}` : '',
      data.nakshatram ? `Nakshatram: ${data.nakshatram}` : '',
      data.occasion ? `Occasion: ${data.occasion}` : '',
      purpose ? `Purpose: ${purpose}` : '',
      utr ? `UTR: ${utr}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    let donationId: number | null = null;
    let requestId: number | null = null;
    let itemName = 'Annadanam';
    let orderType: 'BANA_LINGAM' | 'ANNADANAM' | 'NITHYA_HOMAM' =
      'ANNADANAM';
    let donationType: 'ANNADANAM' | 'GENERAL' | 'NITHYA_HOMAM' = 'ANNADANAM';

    if (kind === 'BANA_LINGAM') {
      itemName = 'Baanalingam';
      orderType = 'BANA_LINGAM';
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

    if (kind !== 'BANA_LINGAM') {
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

    const order = await orderService.create({
      userId,
      orderType,
      orderSource: 'PURCHASE',
      itemName,
      quantity: 1,
      remarks: remarks || `Paid ₹${amount} via UPI QR`,
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
          `Mobile: ${data.mobile || '-'}`,
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
        fullName: data.fullName || 'Devotee',
        mobile: data.mobile || '',
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

    const prefix =
      kind === 'NITHYA_HOMAM'
        ? 'NH'
        : kind === 'BANA_LINGAM'
          ? 'JS'
          : 'ANN';
    return {
      donationId,
      requestId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      confirmationId: `${prefix}${order.id}${String(Date.now()).slice(-3)}`,
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