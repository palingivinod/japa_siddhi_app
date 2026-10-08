import {
  CreateNotificationRequest,
} from './notification.types';

import notificationRepository from './notification.repository';



class NotificationService {


  async create(
    data: CreateNotificationRequest,
  ) {


    const id =
      await notificationRepository.create(
        {
          userId:
            data.userId,

          title:
            data.title,

          message:
            data.message,

          notificationType:
            data.notificationType,

          actionType:
            data.actionType ?? null,

          actionId:
            data.actionId ?? null,

          extraData:
            data.extraData ?? null,

          expiresAt:
            data.expiresAt ?? null,
        },
      );


    return {

      id,

    };

  }



  async getUserNotifications(
    userId: number,
  ) {


    return notificationRepository.getUserNotifications(
      userId,
    );

  }

  async purgeExpiredReminders(userId?: number) {
    await notificationRepository.purgeExpired(userId);
  }



  async markAsRead(
    id: number,
    userId: number,
  ) {


    await notificationRepository.markAsRead(
      id,
      userId,
    );


    return {

      success: true,

    };

  }



  async getUnreadCount(
    userId: number,
  ) {


    const unreadCount =
      await notificationRepository.getUnreadCount(
        userId,
      );


    return {

      unreadCount,

    };

  }

  async existsByAction(
    userId: number,
    actionType: string,
    actionId: number,
  ) {
    return notificationRepository.existsByAction(
      userId,
      actionType,
      actionId,
    );
  }

  async findByAction(
    userId: number,
    actionType: string,
    actionId: number,
  ) {
    return notificationRepository.findByAction(
      userId,
      actionType,
      actionId,
    );
  }

  async mergeExtraData(
    id: number,
    userId: number,
    patch: Record<string, any>,
  ) {
    return notificationRepository.mergeExtraData(id, userId, patch);
  }

  async getUnreadCountByAction(userId: number, actionType: string) {
    return notificationRepository.getUnreadCountByAction(
      userId,
      actionType,
    );
  }

  async getLatestByAction(userId: number, actionType: string) {
    return notificationRepository.getLatestByAction(userId, actionType);
  }

  async markActionAsRead(userId: number, actionType: string) {
    await notificationRepository.markActionAsRead(userId, actionType);
    return {success: true};
  }

  async deleteById(id: number, userId: number) {
    await notificationRepository.deleteById(id, userId);
    return {success: true};
  }

  async clearAll(userId: number) {
    await notificationRepository.clearAll(userId);
    return {success: true};
  }
}

export default new NotificationService();