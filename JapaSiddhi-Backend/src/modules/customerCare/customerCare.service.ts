import {
  CreateTicketRequest,
  TicketStatus,
} from './customerCare.types';

import customerCareRepository from './customerCare.repository';
import emailOtpService from '../../services/emailOtp.service';

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

}

export default new CustomerCareService();