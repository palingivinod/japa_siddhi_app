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



class DonationService {


  async create(
    userId: number,
    data: CreateDonationRequest,
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


    await emailOtpService.notifyAdmin(
      `New ${data.donationType} donation`,
      [
        'A new donation or seva was recorded.',
        `Type: ${data.donationType}`,
        `Amount: ₹${data.amount}`,
        `Method: ${data.paymentMethod}`,
        `Remarks: ${data.remarks || '-'}`,
        `Donation ID: ${id}`,
      ].join('\n'),
    );

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
        donation?.amount ?? 200,

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
    },
  ) {
    const kind = String(data.kind || 'ANNADANAM').toUpperCase();
    const amount = Number(data.amount || 1008);
    const remarks = [
      data.occasion ? `Occasion: ${data.occasion}` : '',
      data.remarks || '',
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
        transactionId: `UPI-${Date.now()}`,
        paymentReference: 'UPI QR',
        remarks,
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
      await orderService.updatePaymentStatus(order.id, 'SUCCESS');
      await orderService.updateOrderStatus(order.id, 'ACTIVE');
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
    };
  }

}


export default new DonationService();