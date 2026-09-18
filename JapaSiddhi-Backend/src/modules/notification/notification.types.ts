export interface CreateNotificationRequest {

  userId: number;

  title: string;

  message: string;

  notificationType:
    | 'GENERAL'
    | 'JAPA_REMINDER'
    | 'GOAL_COMPLETED'
    | 'MONTHLY_DONATION'
    | 'FESTIVAL'
    | 'BIRTHDAY'
    | 'ANNIVERSARY'
    | 'FAMILY_INVITATION'
    | 'FAMILY_JOINED'
    | 'FAMILY_PROGRESS'
    | 'REWARD'
    | 'SYSTEM';

  actionType?: string | null;

  actionId?: number | null;

  extraData?: Record<string, any> | null;

  /** When set, the row is removed after this timestamp so reminders do not pile up. */
  expiresAt?: string | null;

}

export interface NotificationResponse {

  id: number;

  userId: number;

  title: string;

  message: string;

  notificationType:
    | 'GENERAL'
    | 'JAPA_REMINDER'
    | 'GOAL_COMPLETED'
    | 'MONTHLY_DONATION'
    | 'FESTIVAL'
    | 'BIRTHDAY'
    | 'ANNIVERSARY'
    | 'FAMILY_INVITATION'
    | 'FAMILY_JOINED'
    | 'FAMILY_PROGRESS'
    | 'REWARD'
    | 'SYSTEM';

  actionType: string | null;

  actionId: number | null;

  extraData: Record<string, any> | null;

  isRead: boolean;

  sentAt: Date;

  readAt: Date | null;

}

export interface NotificationCount {

  unreadCount: number;

}