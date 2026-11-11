import {
  CreateDonationRequest,
  MonthlyDonationStatus,
  DonationPaymentDetails,
} from './donation.types';

import donationRepository from './donation.repository';
import emailOtpService from '../../services/emailOtp.service';
import orderService from '../orders/order.service';
import orderRepository from '../orders/order.repository';
import banaLingamService from '../banaLingam/banaLingam.service';
import profileRepository from '../profile/profile.repository';
import masterService from '../master/master.service';
import AppError from '../../utils/appError';
import mysql from '../../database/mysql';

const extractPinFromText = (text: string) => {
  const matches = String(text || '').match(/\b(\d{6})\b/g);
  return matches?.[matches.length - 1] || '';
};

const parseCityStateFromAddress = (fullAddress: string) => {
  const parts = String(fullAddress || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length >= 3 && /^\d{6}$/.test(parts[parts.length - 1])) {
    return {
      city: parts[parts.length - 3] || '',
      state: parts[parts.length - 2] || '',
      pinCode: parts[parts.length - 1],
    };
  }
  return {city: '', state: '', pinCode: extractPinFromText(fullAddress)};
};



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
      city?: string;
      state?: string;
      pinCode?: string;
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

    const needsDeliveryAddress =
      kind === 'BANA_LINGAM' ||
      kind === 'RAMAKOTI_BOOKS' ||
      kind === 'HOMA_BHASMA' ||
      kind === 'BIRAVA_PENDANT';

    const addressText = String(data.address || '').trim();
    const parsedAddress = parseCityStateFromAddress(addressText);
    let deliveryCity = String(data.city || parsedAddress.city || '').trim();
    let deliveryState = String(data.state || parsedAddress.state || '').trim();
    let deliveryPin = String(data.pinCode || parsedAddress.pinCode || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    let deliveryCityId: number | null = null;
    let deliveryStateId: number | null = null;
    let deliveryCountryId = 1;

    if (needsDeliveryAddress) {
      if (!addressText) {
        throw new AppError('Enter a delivery address with a 6-digit PIN code.', 400);
      }
      if (!/^[0-9]{6}$/.test(deliveryPin)) {
        throw new AppError('PIN code is mandatory (6 digits) for delivery orders.', 400);
      }
      try {
        const lookedUp = await masterService.lookupPincode(deliveryPin);
        deliveryCity = String(lookedUp.cityName || deliveryCity).trim();
        deliveryState = String(lookedUp.stateName || deliveryState).trim();
        deliveryCityId = Number(lookedUp.cityId) || null;
        deliveryStateId = Number(lookedUp.stateId) || null;
        deliveryCountryId = Number(lookedUp.countryId) || 1;
      } catch {
        throw new AppError(
          'Could not find that PIN code. Enter a valid 6-digit PIN so city and state can be set.',
          400,
        );
      }
      if (!deliveryCity || !deliveryState || !deliveryCityId || !deliveryStateId) {
        throw new AppError(
          'Could not find that PIN code. Enter a valid 6-digit PIN so city and state can be set.',
          400,
        );
      }
    }

    const remarks = [
      data.fullName ? `Name: ${data.fullName}` : '',
      mobile ? `Mobile: ${mobile}` : '',
      data.gothram ? `Gothram: ${data.gothram}` : '',
      data.nakshatram ? `Nakshatram: ${data.nakshatram}` : '',
      data.occasion ? `Occasion: ${data.occasion}` : '',
      addressText ? `Address: ${addressText}` : '',
      deliveryCity ? `City: ${deliveryCity}` : '',
      deliveryState ? `State: ${deliveryState}` : '',
      deliveryPin ? `PIN: ${deliveryPin}` : '',
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
      const {
        default: shivaLingaEligibilityService,
      } = await import('../orders/shivaLingaEligibility.service');
      await shivaLingaEligibilityService.assertCanOrderBaanalingam(userId);

      itemName = 'Baanalingam';
      orderType = 'BANA_LINGAM';
    } else if (kind === 'RAMAKOTI_BOOKS') {
      const activeRkOrder = await orderRepository.findActiveOrderForKind(userId, 'RAMAKOTI_BOOKS');
      if (activeRkOrder) {
        throw new AppError(
          `Already one Ramakoti Books order (${activeRkOrder.orderNumber}) is in progress. You can order another once your previous order is delivered.`,
          400,
        );
      }

      itemName = 'Ramakoti Books';
      orderType = 'RAMAKOTI_BOOKS';
    } else if (kind === 'HOMA_BHASMA') {
      const activeHbOrder = await orderRepository.findActiveOrderForKind(userId, 'HOMA_BHASMA');
      if (activeHbOrder) {
        throw new AppError(
          `Already one Homa Bhasma order (${activeHbOrder.orderNumber}) is in progress. You can order another once your previous order is delivered.`,
          400,
        );
      }

      itemName = 'Homa Bhasma';
      orderType = 'HOMA_BHASMA';
    } else if (kind === 'BIRAVA_PENDANT') {
      const activeBpOrder = await orderRepository.findActiveOrderForKind(userId, 'BIRAVA_PENDANT');
      if (activeBpOrder) {
        throw new AppError(
          `Already one Bhirava Pendant order (${activeBpOrder.orderNumber}) is in progress. You can order another once your previous order is delivered.`,
          400,
        );
      }

      itemName = 'Bhirava Pendent';
      orderType = 'BIRAVA_PENDANT';
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
      `Address: ${addressText}`,
      deliveryCity ? `City: ${deliveryCity}` : '',
      deliveryState ? `State: ${deliveryState}` : '',
      deliveryPin ? `PIN: ${deliveryPin}` : '',
      data.gothram ? `Gothram: ${data.gothram}` : '',
      data.nakshatram ? `Nakshatram: ${data.nakshatram}` : '',
      purpose && kind === 'BANA_LINGAM' ? `Purpose: ${purpose}` : '',
      comments ? `Comments: ${comments}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const orderRemarks =
      kind === 'RAMAKOTI_BOOKS' ||
      kind === 'HOMA_BHASMA' ||
      kind === 'BIRAVA_PENDANT' ||
      kind === 'BANA_LINGAM'
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
        address: addressText,
        cityId: deliveryCityId as number,
        stateId: deliveryStateId as number,
        countryId: deliveryCountryId,
        postalCode: deliveryPin,
        nakshatram: data.nakshatram,
        gothram: data.gothram,
        quantity: 1,
        remarks,
      });
      requestId = request.id;
      if (addressText) {
        await profileRepository.saveAddress(userId, addressText);
      }
    }

    if (
      (kind === 'RAMAKOTI_BOOKS' ||
        kind === 'HOMA_BHASMA' ||
        kind === 'BIRAVA_PENDANT') &&
      addressText
    ) {
      await profileRepository.saveAddress(userId, addressText);
    }

    const confirmationId =
      isRequestOrder
        ? order.orderNumber
        : kind === 'NITHYA_HOMAM'
          ? `NH${order.id}${String(Date.now()).slice(-3)}`
          : `ANN${order.id}${String(Date.now()).slice(-3)}`;
    
    if (userId && donationType === 'ANNADANAM') {
      try {
        const japaService = (await import('../japa/japa.service')).default;
        await japaService.onAnnadanamPaid(userId);
      } catch (milestoneErr) {
        console.warn('Could not advance Annadanam milestone on donation creation:', milestoneErr);
      }
    }

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