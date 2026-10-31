import {
  Request,
  Response,
  NextFunction,
} from 'express';

import orderService from './order.service';

import apiResponse from '../../utils/apiResponse';

class OrderController {

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const userId =
        req.user?.id;

      if (!userId) {

        return apiResponse.error(
          res,
          'User not authenticated',
          401,
        );

      }

      const {

        orderType,

        orderSource,

        itemName,

        quantity,

        paymentId,

        remarks,

      } = req.body;

      const result =
        await orderService.create(
          {
            userId,
            orderType,
            orderSource,
            itemName,
            quantity,
            paymentId,
            remarks,
          },
        );

      return apiResponse.success(
        res,
        'Order created successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async getMyOrders(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const userId =
        req.user?.id;

      if (!userId) {

        return apiResponse.error(
          res,
          'User not authenticated',
          401,
        );

      }

      const result =
        await orderService.getUserOrders(
          userId,
        );

      return apiResponse.success(
        res,
        'Orders fetched successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        await orderService.getById(
          Number(req.params.id),
        );

      return apiResponse.success(
        res,
        'Order fetched successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async cancel(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const reason = String(req.body?.reason || '').trim();
      if (reason.length < 3) {
        return apiResponse.error(res, 'Enter a reason to cancel this order.', 400);
      }
      const result = await orderService.cancelForUser(
        Number(req.params.id),
        userId,
        reason.slice(0, 300),
      );
      if (result === 'missing') {
        return apiResponse.error(res, 'Order not found', 404);
      }
      if (result === 'delivered') {
        return apiResponse.error(res, 'Delivered orders cannot be cancelled.', 400);
      }
      if (result === 'cancelled') {
        return apiResponse.error(res, 'This order is already cancelled.', 400);
      }
      return apiResponse.success(res, 'Order cancelled', {reason});
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const {

        orderStatus,

      } = req.body;

      const result =
        await orderService.updateOrderStatus(
          Number(req.params.id),
          orderStatus,
        );

      return apiResponse.success(
        res,
        'Order status updated successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async updatePaymentStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const {

        paymentStatus,

      } = req.body;

      const result =
        await orderService.updatePaymentStatus(
          Number(req.params.id),
          paymentStatus,
        );

      return apiResponse.success(
        res,
        'Payment status updated successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async getTracking(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await orderService.getTracking(Number(req.params.id));
      return apiResponse.success(res, 'Order tracking fetched', result);
    } catch (error) {
      next(error);
    }
  }

  async markReceived(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await orderService.markReceivedByUser(
        Number(req.params.id),
        userId,
      );
      if (result === 'missing') {
        return apiResponse.error(res, 'Order not found', 404);
      }
      if (result === 'delivered') {
        return apiResponse.error(res, 'This order is already marked delivered.', 400);
      }
      if (result === 'cancelled') {
        return apiResponse.error(res, 'Cancelled orders cannot be marked received.', 400);
      }
      if (result === 'not_shipped') {
        return apiResponse.error(
          res,
          'You can confirm receipt only after the order is shipped.',
          400,
        );
      }
      const tracking = await orderService.getTracking(Number(req.params.id));
      return apiResponse.success(res, 'Order marked as delivered', tracking);
    } catch (error) {
      next(error);
    }
  }

}

export default new OrderController();