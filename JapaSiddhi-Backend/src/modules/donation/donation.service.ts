import {
  CreateDonationRequest,
  MonthlyDonationStatus,
  DonationPaymentDetails,
} from './donation.types';

import donationRepository from './donation.repository';
import emailOtpService from '../../services/emailOtp.service';



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
          details.upiId = realValue(item.setting_value);
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


    return details;

  }


}


export default new DonationService();