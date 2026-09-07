import {
  Request,
  Response,
  NextFunction,
} from 'express';

import notificationService from './notification.service';

import apiResponse from '../../utils/apiResponse';

class NotificationController {

  async getAll(
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
        await notificationService.getUserNotifications(
          userId,
        );

      return apiResponse.success(
        res,
        'Notifications fetched successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async markAsRead(
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

      await notificationService.markAsRead(
        Number(req.params.id),
        userId,
      );

      return apiResponse.success(
        res,
        'Notification marked as read',
      );

    } catch (error) {

      next(error);

    }

  }

  async markMilestonesRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return apiResponse.error(res, 'User not authenticated', 401);
      }
      const result = await notificationService.markActionAsRead(
        userId,
        'JAPA_MILESTONE',
      );
      return apiResponse.success(
        res,
        'Milestone notifications marked as read',
        result,
      );
    } catch (error) {
      next(error);
    }
  }

  async unreadCount(
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
        await notificationService.getUnreadCount(
          userId,
        );

      return apiResponse.success(
        res,
        'Unread count fetched successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const {

        userId,

        title,

        message,

        notificationType,

        actionType,

        actionId,

        extraData,

      } = req.body;

      if (
        !userId ||
        !title ||
        !message ||
        !notificationType
      ) {

        return apiResponse.error(
          res,
          'Missing required fields',
          400,
        );

      }

      const result =
        await notificationService.create(
          {
            userId,
            title,
            message,
            notificationType,
            actionType,
            actionId,
            extraData,
          },
        );

      return apiResponse.success(
        res,
        'Notification created successfully',
        result,
      );

    } catch (error) {

      next(error);

    }

  }

}

export default new NotificationController();