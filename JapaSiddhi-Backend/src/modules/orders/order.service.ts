import {
  randomUUID,
} from 'crypto';

import {
  CreateOrderRequest,
  OrderStatus,
  PaymentStatus,
} from './order.types';

import orderRepository from './order.repository';

class OrderService {

  async create(
    data: CreateOrderRequest & {numberPrefix?: string},
  ) {

    const {numberPrefix, ...order} = data;
    const orderNumber = await orderRepository.getNextOrderNumber(numberPrefix);

    const id =
      await orderRepository.create(
        order,
        orderNumber,
      );

    return {
      id,
      orderNumber,
    };

  }

  async getById(
    id: number,
  ) {

    const order =
      await orderRepository.getById(
        id,
      );

    if (!order) {

      throw new Error(
        'Order not found',
      );

    }

    return order;

  }

  async getUserOrders(
    userId: number,
  ) {

    return orderRepository.getUserOrders(
      userId,
    );

  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus,
  ) {

    await orderRepository.updateOrderStatus(
      id,
      status,
    );

    return {

      success: true,

    };

  }

  async getTracking(id: number) {
    const order = await this.getById(id);
    const created = new Date(order.createdAt || Date.now());
    const addDays = (days: number) => {
      const date = new Date(created);
      date.setDate(date.getDate() + days);
      return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    };
    const status = String(order.orderStatus || 'UNDER_REVIEW').toUpperCase();
    const type = String(order.orderType || '').toUpperCase();
    const item = String(order.itemName || '').toLowerCase();
    const number = String(order.orderNumber || '').toUpperCase();
    const isBaanalingam =
      type === 'BANA_LINGAM' ||
      number.startsWith('BL-') ||
      item.includes('baanalingam') ||
      item.includes('banalingam');

    if (isBaanalingam) {
      const rank =
        status === 'DELIVERED'
          ? 7
          : status === 'SHIPPED'
            ? 6
            : status === 'PACKING'
              ? 5
              : status === 'CONFIRMED' ||
                  status === 'PROCESSING' ||
                  status === 'READY'
                ? 4
                : status === 'SANKALP_TAKEN'
                  ? 3
                  : status === 'CALLED_TALKED' || status === 'CALLED_DEVOTEE'
                    ? 2
                    : 1;
      const isUnderReview = status === 'UNDER_REVIEW' || status === 'PENDING';
      const steps = [
        {
          key: 'under_review',
          label: isUnderReview ? 'Under Review' : 'Order Placed',
          date: addDays(0),
          done: rank >= 1,
        },
        {
          key: 'called',
          label: 'Called and talked with devotee',
          date: rank >= 2 ? addDays(1) : 'Awaiting call',
          done: rank >= 2,
        },
        {
          key: 'sankalp',
          label: 'Sankalp taken by devotee',
          date: rank >= 3 ? addDays(2) : 'Awaiting sankalp',
          done: rank >= 3,
        },
        {
          key: 'confirmed',
          label: 'Order confirmation',
          date: rank >= 4 ? addDays(3) : 'Awaiting confirmation',
          done: rank >= 4,
        },
        {
          key: 'packing',
          label: 'Packing',
          date: rank >= 5 ? addDays(4) : `Expected ${addDays(4)}`,
          done: rank >= 5,
        },
        {
          key: 'shipped',
          label: 'Shipped',
          date: rank >= 6 ? addDays(5) : `Expected ${addDays(5)}`,
          done: rank >= 6,
        },
        {
          key: 'delivered',
          label: 'Delivered',
          date: rank >= 7 ? addDays(7) : `Expected ${addDays(7)}`,
          done: rank >= 7,
        },
      ];
      const currentStatus =
        rank >= 7
          ? 'Delivered'
          : rank >= 6
            ? 'Out for delivery'
            : rank >= 5
              ? 'Packing'
              : rank >= 4
                ? 'Order confirmation'
                : rank >= 3
                  ? 'Sankalp taken by devotee'
                  : rank >= 2
                    ? 'Called and talked with devotee'
                    : 'Under Review';
      return {
        ...order,
        currentStatus,
        eta: addDays(7),
        steps,
        canMarkReceived: status === 'SHIPPED',
      };
    }

    const rank =
      status === 'DELIVERED'
        ? 5
        : status === 'SHIPPED'
          ? 4
          : status === 'PACKING'
            ? 3
            : status === 'CONFIRMED' || status === 'PROCESSING' || status === 'READY'
              ? 2
              : 1;
    const isUnderReview = status === 'UNDER_REVIEW' || status === 'PENDING';
    const steps = [
      {
        key: 'under_review',
        label: isUnderReview ? 'Under Review' : 'Order Placed',
        date: addDays(0),
        done: rank >= 1,
      },
      {
        key: 'confirmed',
        label: 'Order Confirmed',
        date: rank >= 2 ? addDays(1) : 'Awaiting confirmation',
        done: rank >= 2,
      },
      {
        key: 'packing',
        label: 'Packing',
        date: rank >= 3 ? addDays(2) : `Expected ${addDays(2)}`,
        done: rank >= 3,
      },
      {
        key: 'shipped',
        label: 'Shipped',
        date: rank >= 4 ? addDays(3) : `Expected ${addDays(3)}`,
        done: rank >= 4,
      },
      {
        key: 'delivered',
        label: 'Delivered',
        date: rank >= 5 ? addDays(5) : `Expected ${addDays(5)}`,
        done: rank >= 5,
      },
    ];
    return {
      ...order,
      currentStatus:
        rank >= 5
          ? 'Delivered'
          : rank >= 4
            ? 'Out for delivery'
            : rank >= 3
              ? 'Packing'
              : rank >= 2
                ? 'Order Confirmed'
                : 'Under Review',
      eta: addDays(5),
      steps,
      canMarkReceived: status === 'SHIPPED',
    };
  }

  async markReceivedByUser(id: number, userId: number) {
    return orderRepository.markReceivedByUser(id, userId);
  }

  async cancelForUser(id: number, userId: number, reason: string) {
    return orderRepository.cancelForUser(id, userId, reason);
  }

  async updatePaymentStatus(
    id: number,
    status: PaymentStatus,
  ) {

    await orderRepository.updatePaymentStatus(
      id,
      status,
    );

    return {

      success: true,

    };

  }

}

export default new OrderService();