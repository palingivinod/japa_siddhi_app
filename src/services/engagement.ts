import apiService from './apiService';

export type EngagementType = 'BANNER_TAP' | 'TOP10_OPEN' | 'HOMAM_UPDATES_OPEN';

/**
 * Tells the server a devotee opened something, for admin analytics.
 * Fire-and-forget: it never blocks the screen and failures are ignored.
 */
export const logEngagement = (
  type: EngagementType,
  refId?: string | number | null,
  source?: 'home' | 'services' | 'notification' | 'push' | 'other',
) => {
  apiService
    .post('/engagement/event', {
      type,
      refId: refId == null ? undefined : String(refId),
      source,
    })
    .catch(() => undefined);
};
