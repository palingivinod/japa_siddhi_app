import {
  CreateBanaLingamRequest,
  BanaLingamRequestStatus,
} from './banaLingam.types';

import banaLingamRepository from './banaLingam.repository';
import emailOtpService from '../../services/emailOtp.service';
import socketEmitter from '../../socket/socketEmitter';

class BanaLingamService {
  async create(data: CreateBanaLingamRequest) {
    const id = await banaLingamRepository.create(data);

    const orderRef = data.orderNumber || (data.orderId ? `Order #${data.orderId}` : `Request ID: ${id}`);
    await emailOtpService.notifyAdmin(
      'New Baanalingam order - Under Review',
      [
        'A new Baanalingam order was submitted and is currently Under Review.',
        `Order ID: ${orderRef}`,
        `Name: ${data.fullName}`,
        `Mobile: ${data.mobile}`,
        `Address: ${data.address}`,
        `Gothram: ${data.gothram || '-'}`,
        `Nakshatram: ${data.nakshatram || '-'}`,
        `Quantity: ${data.quantity || 1}`,
        `Status: Under Review`,
        '',
        'Please review and confirm this order in Admin Panel -> Orders.',
      ].join('\n'),
    );

    socketEmitter.emitBaanalingamUpdated({id, action: 'created'});

    return {id};
  }

  async getById(id: number) {
    const request = await banaLingamRepository.getById(id);
    if (!request) {
      throw new Error('Bana Lingam request not found');
    }
    return request;
  }

  async getUserRequests(userId: number) {
    return banaLingamRepository.getUserRequests(userId);
  }

  async listAll() {
    return banaLingamRepository.listAll();
  }

  async updateStatus(
    id: number,
    status: BanaLingamRequestStatus,
    remarks?: string | null,
  ) {
    const request = await banaLingamRepository.getById(id);
    if (!request) {
      throw new Error('Bana Lingam request not found');
    }

    await banaLingamRepository.updateStatus(id, status, remarks);
    socketEmitter.emitBaanalingamUpdated({id, status, action: 'updated'});

    return {success: true};
  }
}

export default new BanaLingamService();
