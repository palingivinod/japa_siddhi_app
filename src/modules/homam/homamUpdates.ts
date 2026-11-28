import apiService from '../../services/apiService';

/** Notification type the admin uses for Nithya Homam messages. */
export const HOMAM_ACTION_TYPE = 'NITHYA_HOMAM_ANNOUNCEMENT';

export type HomamUpdate = {
  id: number;
  title: string;
  message: string;
  imageUrl: string;
  videoUrl: string;
  audioUrl: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: string;
};

/**
 * How many Nithya Homam messages this devotee has not opened yet.
 * Devotees the admin never messaged always get 0, so nothing shows for them.
 */
export const fetchHomamUnreadCount = async (): Promise<number> => {
  try {
    const response = await apiService.get('/notifications/unread-count', {
      params: {actionType: HOMAM_ACTION_TYPE},
    });
    const count = Number(response.data?.data?.unreadCount ?? 0);
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
};

const text = (value: unknown) => String(value ?? '').trim();

/** Messages sent to this devotee, newest first. */
export const fetchHomamUpdates = async (): Promise<HomamUpdate[]> => {
  const response = await apiService.get('/notifications', {
    params: {actionType: HOMAM_ACTION_TYPE, limit: 50},
  });
  const rows: any[] = Array.isArray(response.data?.data)
    ? response.data.data
    : [];
  return rows.map(row => {
    const extra = row?.extraData || {};
    return {
      id: Number(row.id),
      title: text(extra.pushTitle || extra.mantraName || row.title),
      message: text(extra.detail || extra.pushBody || row.message),
      imageUrl: text(row.imageUrl || extra.imageUrl),
      videoUrl: text(row.videoUrl || extra.videoUrl),
      audioUrl: text(extra.audioUrl),
      linkUrl: text(extra.url || extra.link),
      isRead: Number(row.isRead) === 1 || row.isRead === true,
      createdAt: text(row.sentAt || row.createdAt),
    };
  });
};

/** Opening the updates screen clears the badge. */
export const markHomamUpdatesRead = async (): Promise<void> => {
  try {
    await apiService.put('/notifications/action/read', {
      actionType: HOMAM_ACTION_TYPE,
    });
  } catch {
    // Badge simply stays until the next successful open.
  }
};
