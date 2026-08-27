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

}

export default new OrderController();