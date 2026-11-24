import {
  randomUUID,
} from 'crypto';

import {
  CreateOrderRequest,
  OrderStatus,
  PaymentStatus,
} from './order.types';

import orderRepository from './order.repository';
import AppError from '../../utils/appError';
import {parseOrderCreatedMs} from '../../utils/orderCreatedMs';

class OrderService {

  async create(
    data: CreateOrderRequest & {numberPrefix?: string},
  ) {

    const {numberPrefix, ...order} = data;

    // Product orders: one open (non-delivered) order blocks all new product orders.
    // Homam / Annadanam seva rows are excluded.
    const orderType = String(order.orderType || '').toUpperCase();
    const isSevaRow =
      orderType === 'NITHYA_HOMAM' || orderType === 'ANNADANAM';
    if (order.userId && order.orderType && !isSevaRow) {
      const activeOrder = await orderRepository.findAnyActiveProductOrder(
        order.userId,
      );
      if (activeOrder) {
        throw new AppError(
          `Already one order (${activeOrder.orderNumber}) is in progress. You can order another once your previous order is delivered.`,
          400,
        );
      }

      // Homa / Pooja Bhasmam: block reorder for 30 days from last non-cancelled
      // order (includes soft-deleted — hide from My Orders must not clear cooldown).
      if (orderType === 'HOMA_BHASMA' || orderType === 'GOU_MAYA_BHASMA') {
        const recent = await orderRepository.findRecentBhasmamOrder(
          order.userId,
          orderType as 'HOMA_BHASMA' | 'GOU_MAYA_BHASMA',
          30,
        );
        if (recent) {
          const orderedMs = parseOrderCreatedMs(recent.createdAt);
          const item =
            orderType === 'GOU_MAYA_BHASMA' ? 'Pooja Bhasmam' : 'Homa Bhasmam';
          if (orderedMs > 0) {
            const available = new Date(orderedMs + 30 * 24 * 60 * 60 * 1000);
            const orderedLabel = new Date(orderedMs).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Kolkata',
            });
            const availableLabel = available.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Kolkata',
            });
            throw new AppError(
              `You ordered ${item} on ${orderedLabel}. You can order again after 30 days, on ${availableLabel}.`,
              400,
            );
          }
          throw new AppError(
            `You ordered ${item} recently. You can order again after 30 days.`,
            400,
          );
        }
      }
    }

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
    const PENDING_LABEL = 'Update soon';

    /** Real calendar day in IST — never invents a future/guessed date. */
    const formatDay = (raw: Date | string | number | null | undefined) => {
      if (raw == null || raw === '') {
        return '';
      }
      const date = raw instanceof Date ? raw : new Date(raw);
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    };

    let eventMap: Record<string, Date> = {};
    try {
      eventMap = await orderRepository.getStatusEventMap(id);
    } catch {
      eventMap = {};
    }

    const firstOf = (...codes: string[]) => {
      for (const code of codes) {
        if (eventMap[code]) {
          return eventMap[code];
        }
      }
      return null;
    };

    /**
     * Phase date rules (strict):
     * - Use only recorded admin status-event timestamps.
     * - Order Placed / Under Review may use real order created_at if no event yet.
     * - Never copy order.updatedAt or invent dates for other phases.
     * - Not reached / no real date → "Update soon".
     */
    const phaseDate = (
      done: boolean,
      statuses: string[],
      opts?: {allowCreatedFallback?: boolean},
    ) => {
      if (!done) {
        return PENDING_LABEL;
      }
      const fromEvent = firstOf(...statuses);
      if (fromEvent) {
        return formatDay(fromEvent) || PENDING_LABEL;
      }
      if (opts?.allowCreatedFallback) {
        return formatDay(created) || PENDING_LABEL;
      }
      return PENDING_LABEL;
    };

    const status = String(order.orderStatus || 'UNDER_REVIEW').toUpperCase();
    const type = String(order.orderType || '').toUpperCase();
    const item = String(order.itemName || '').toLowerCase();
    const number = String(order.orderNumber || '')
      .replace(/^#/, '')
      .toUpperCase();
    const isBooksOrBhasmam =
      type === 'GOU_MAYA_BHASMA' ||
      type === 'HOMA_BHASMA' ||
      type === 'RAMAKOTI_BOOKS' ||
      type === 'SHIVAKOTI_BOOKS' ||
      type === 'BIRAVA_PENDANT' ||
      number.startsWith('PB') ||
      number.startsWith('GM') ||
      number.startsWith('HB') ||
      number.startsWith('RK') ||
      number.startsWith('SK') ||
      number.startsWith('BP') ||
      item.includes('pooja bhasmam') ||
      item.includes('pooja bhasma') ||
      item.includes('gou maya') ||
      (item.includes('homa') && item.includes('bhasma')) ||
      item.includes('ramakoti') ||
      item.includes('shivakoti') ||
      item.includes('siva koti');
    const isBaanalingam =
      !isBooksOrBhasmam &&
      (type === 'BANA_LINGAM' ||
        number.startsWith('BL-') ||
        item.includes('baanalingam') ||
        item.includes('banalingam'));

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
          date: phaseDate(rank >= 1, ['UNDER_REVIEW', 'PENDING'], {
            allowCreatedFallback: true,
          }),
          done: rank >= 1,
        },
        {
          key: 'called',
          label: 'Called and talked with devotee',
          date: phaseDate(rank >= 2, ['CALLED_TALKED', 'CALLED_DEVOTEE']),
          done: rank >= 2,
        },
        {
          key: 'sankalp',
          label: 'Sankalp taken by devotee',
          date: phaseDate(rank >= 3, ['SANKALP_TAKEN']),
          done: rank >= 3,
        },
        {
          key: 'confirmed',
          label: 'Order confirmation',
          date: phaseDate(rank >= 4, ['CONFIRMED', 'PROCESSING', 'READY']),
          done: rank >= 4,
        },
        {
          key: 'packing',
          label: 'Packing',
          date: phaseDate(rank >= 5, ['PACKING']),
          done: rank >= 5,
        },
        {
          key: 'shipped',
          label: 'Shipped',
          date: phaseDate(rank >= 6, ['SHIPPED']),
          done: rank >= 6,
        },
        {
          key: 'delivered',
          label: 'Delivered',
          date: phaseDate(rank >= 7, ['DELIVERED']),
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
        eta:
          rank >= 7
            ? phaseDate(true, ['DELIVERED']) === PENDING_LABEL
              ? 'Delivered'
              : phaseDate(true, ['DELIVERED'])
            : PENDING_LABEL,
        steps,
        canMarkReceived:
          (status === 'SHIPPED' || status === 'DELIVERED') && !order.userReceived,
        userReceived: Boolean(order.userReceived),
        userReceivedAt: order.userReceivedAt || null,
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
        date: phaseDate(rank >= 1, ['UNDER_REVIEW', 'PENDING'], {
          allowCreatedFallback: true,
        }),
        done: rank >= 1,
      },
      {
        key: 'confirmed',
        label: 'Order Confirmed',
        date: phaseDate(rank >= 2, ['CONFIRMED', 'PROCESSING', 'READY']),
        done: rank >= 2,
      },
      {
        key: 'packing',
        label: 'Packing',
        date: phaseDate(rank >= 3, ['PACKING']),
        done: rank >= 3,
      },
      {
        key: 'shipped',
        label: 'Shipped',
        date: phaseDate(rank >= 4, ['SHIPPED']),
        done: rank >= 4,
      },
      {
        key: 'delivered',
        label: 'Delivered',
        date: phaseDate(rank >= 5, ['DELIVERED']),
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
      eta:
        rank >= 5
          ? phaseDate(true, ['DELIVERED']) === PENDING_LABEL
            ? 'Delivered'
            : phaseDate(true, ['DELIVERED'])
          : PENDING_LABEL,
      steps,
      canMarkReceived:
        (status === 'SHIPPED' || status === 'DELIVERED') && !order.userReceived,
      userReceived: Boolean(order.userReceived),
      userReceivedAt: order.userReceivedAt || null,
    };
  }

  async markReceivedByUser(id: number, userId: number) {
    return orderRepository.markReceivedByUser(id, userId);
  }

  async deleteForUser(id: number, userId: number) {
    return orderRepository.deleteForUser(id, userId);
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