import {
  CreateTicketRequest,
  TicketStatus,
} from './customerCare.types';

import customerCareRepository from './customerCare.repository';
import emailOtpService from '../../services/emailOtp.service';
import mysql from '../../database/mysql';

class CustomerCareService {

  async create(
    data: CreateTicketRequest,
  ) {

    const id =
      await customerCareRepository.create(
        data,
      );

    await emailOtpService.notifyAdmin(
      'New customer care ticket',
      [
        'A new support ticket was raised.',
        `Subject: ${data.subject}`,
        `Order / Service: ${data.orderService || '-'}`,
        `Message: ${data.message}`,
        `Ticket ID: ${id}`,
      ].join('\n'),
    );

    return {

      id,

    };

  }

  async getById(
    id: number,
  ) {

    const ticket =
      await customerCareRepository.getById(
        id,
      );

    if (!ticket) {

      throw new Error(
        'Support ticket not found',
      );

    }

    return ticket;

  }

  async getUserTickets(
    userId: number,
  ) {

    return customerCareRepository.getUserTickets(
      userId,
    );

  }

  async reply(
    id: number,
    reply: string,
    status: TicketStatus,
  ) {

    const ticket =
      await customerCareRepository.getById(
        id,
      );

    if (!ticket) {

      throw new Error(
        'Support ticket not found',
      );

    }

    await customerCareRepository.reply(
      id,
      reply,
      status,
    );

    return {

      success: true,

    };

  }

  async getConfig() {
    const settings = await mysql.query<any[]>(
      `
      SELECT setting_key, setting_value
      FROM app_settings
      WHERE setting_key IN ('support_phone', 'support_email')
      `,
    );
    const map: Record<string, string> = {};
    (settings || []).forEach(item => {
      map[item.setting_key] = item.setting_value;
    });
    const phone = map.support_phone || '+917349483937';
    const digits = phone.replace(/[^\d]/g, '');
    return {
      supportPhone: phone,
      supportEmail: map.support_email || 'kailaasavaasi@gmail.com',
      whatsappUrl: `https://wa.me/${digits}`,
      hours: '9 AM – 6 PM',
    };
  }

  async getFaqs() {
    try {
      return await mysql.query<any[]>(
        `
        SELECT id, question, answer, display_order AS displayOrder
        FROM support_faqs
        ORDER BY display_order ASC
        `,
      );
    } catch {
      return [
        {
          id: 1,
          question: 'How does Smart Japa work?',
          answer:
            'Smart Japa counts each valid tap or voice chant against your selected mantra and daily goal.',
        },
        {
          id: 2,
          question: 'How are Japa counts protected?',
          answer:
            'Each session is saved to your account so progress stays with you across devices.',
        },
        {
          id: 3,
          question: 'How do I donate Annadanam?',
          answer:
            'Open Seva, choose Annadanam, pick Japa or General offering, then complete payment.',
        },
        {
          id: 4,
          question: 'How do I track my order?',
          answer: 'Open Orders, tap VIEW, then use Track Order.',
        },
        {
          id: 5,
          question: 'How do I change language?',
          answer: 'Go to Profile > Settings > Language.',
        },
      ];
    }
  }

}

export default new CustomerCareService();