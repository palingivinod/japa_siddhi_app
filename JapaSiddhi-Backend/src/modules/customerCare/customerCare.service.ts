import {CreateTicketRequest, TicketStatus} from './customerCare.types';
import customerCareRepository from './customerCare.repository';
import emailOtpService from '../../services/emailOtp.service';
import mysql from '../../database/mysql';

class CustomerCareService {
  private async resolveUserName(userId: number) {
    try {
      const rows = await mysql.query<Array<{fullName?: string}>>(
        `
        SELECT full_name AS fullName
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId],
      );
      return String(rows?.[0]?.fullName || '').trim() || `User #${userId}`;
    } catch {
      return `User #${userId}`;
    }
  }

  async create(data: CreateTicketRequest, mediaBaseUrl?: string) {
    // Keep Order / Service in the stored message for older admin clients, but
    // email the original description separately so it is not listed twice.
    const storedMessage = data.orderService
      ? `${data.message}\n\nOrder / Service: ${data.orderService}`
      : data.message;
    const id = await customerCareRepository.create({
      ...data,
      message: storedMessage,
    });
    const screenshotLink = data.screenshotUrl
      ? `${mediaBaseUrl || ''}${data.screenshotUrl}`
      : '-';
    const userName = await this.resolveUserName(data.userId);

    await emailOtpService.notifyAdmin(
      'New customer care ticket',
      [
        'A new support ticket was raised.',
        `User ID: ${data.userId}`,
        `User Name: ${userName}`,
        `Subject: ${data.subject}`,
        `Order / Service: ${data.orderService || '-'}`,
        `Message: ${data.message}`,
        `Screenshot: ${screenshotLink}`,
        `Ticket ID: ${id}`,
      ].join('\n'),
    );

    return {id, screenshotUrl: data.screenshotUrl || null};
  }

  async getById(id: number) {
    const ticket = await customerCareRepository.getById(id);
    if (!ticket) {
      throw new Error('Support ticket not found');
    }
    return ticket;
  }

  async getUserTickets(userId: number) {
    return customerCareRepository.getUserTickets(userId);
  }

  async getAll() {
    return customerCareRepository.getAll();
  }

  async reply(id: number, reply: string, status: TicketStatus) {
    const ticket = await customerCareRepository.getById(id);
    if (!ticket) {
      throw new Error('Support ticket not found');
    }

    const cleanReply = String(reply || '').trim();
    if (!cleanReply) {
      throw Object.assign(new Error('Reply message is required.'), {
        statusCode: 400,
      });
    }

    const nextStatus: TicketStatus =
      status === 'RESOLVED' || status === 'CLOSED'
        ? 'RESOLVED'
        : status === 'IN_PROGRESS'
          ? 'IN_PROGRESS'
          : 'OPEN';

    await customerCareRepository.reply(id, cleanReply, nextStatus);

    const userId = Number(ticket.userId);
    const ticketCode = `TK${id}`;
    const solved = nextStatus === 'RESOLVED';
    const title = solved
      ? 'Support ticket solved'
      : 'Support replied to your ticket';
    const message = solved
      ? `Your ticket ${ticketCode} was marked solved. Reply: ${cleanReply}`
      : `Support replied on ${ticketCode}: ${cleanReply}`;

    try {
      const notificationService = (
        await import('../notification/notification.service')
      ).default;
      await notificationService.create({
        userId,
        title,
        message,
        notificationType: 'SYSTEM',
        actionType: 'SUPPORT_TICKET_REPLY',
        actionId: id,
        extraData: {
          ticketId: id,
          status: nextStatus,
        },
      });
    } catch (error) {
      console.warn('Support reply in-app notification failed:', error);
    }

    try {
      const tokenRows = await mysql.query<any[]>(
        `
        SELECT fcm_token AS fcmToken
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
        `,
        [userId],
      );
      const token = String(tokenRows?.[0]?.fcmToken || '').trim();
      if (token) {
        const {sendPushToTokens} = await import(
          '../admin/adminNotification.service'
        );
        await sendPushToTokens(
          [token],
          title,
          message,
          'SUPPORT_TICKET_REPLY',
        );
      }
    } catch (error) {
      console.warn('Support reply FCM push failed:', error);
    }

    return {
      success: true,
      id,
      status: nextStatus,
      adminReply: cleanReply,
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

    // Canonical customer-care number for Call and WhatsApp. Older placeholders
    // (empty / 9999… / previous 7349…) are ignored so both options always open
    // this line after deploy.
    const SUPPORT_PHONE = '+916281585599';
    const stored = String(map.support_phone || '').replace(/[^\d]/g, '');
    const isPlaceholder =
      !stored ||
      stored === '9999999999' ||
      stored === '917349483937' ||
      stored === '7349483937';
    const phone = isPlaceholder ? SUPPORT_PHONE : String(map.support_phone);
    const digits = phone.replace(/[^\d]/g, '');
    return {
      supportPhone: phone.startsWith('+') ? phone : `+${digits}`,
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
