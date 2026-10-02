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
    data: CreateOrderRequest,
  ) {

    const orderNumber = await orderRepository.getNextOrderNumber();

    const id =
      await orderRepository.create(
        data,
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
    const rank =
      status === 'DELIVERED'
        ? 4
        : status === 'SHIPPED'
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
        key: 'shipped',
        label: 'Shipped',
        date: rank >= 3 ? addDays(2) : `Expected ${addDays(2)}`,
        done: rank >= 3,
      },
      {
        key: 'delivered',
        label: 'Delivered',
        date: rank >= 4 ? addDays(4) : `Expected ${addDays(4)}`,
        done: rank >= 4,
      },
    ];
    return {
      ...order,
      currentStatus:
        rank >= 4
          ? 'Delivered'
          : rank >= 3
            ? 'Out for delivery'
            : rank >= 2
              ? 'Order Confirmed'
              : 'Under Review',
      eta: addDays(4),
      steps,
    };
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