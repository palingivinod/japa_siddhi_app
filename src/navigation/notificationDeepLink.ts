import {Linking} from 'react-native';

import apiService from '../services/apiService';
import {navigateTo} from './navigationRef';

type PushLike = Record<string, any> | null | undefined;

const num = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const str = (value: any) => {
  const s = String(value ?? '').trim();
  return s || undefined;
};

/**
 * Route after a notification tap (tray popup or in-app list).
 * - Idle / admin / generic → Notifications
 * - Daily goal pending / goal deadline → Chant for that mantra
 * - Challenge deadline → Chant for that challenge
 * - Challenge reward ready → reward select
 */
export const openFromNotificationPayload = async (raw: PushLike) => {
  const data = raw && typeof raw === 'object' ? raw : {};
  const action = String(
    data.actionType || data.type || data.notificationType || '',
  ).trim();
  const notificationId = str(
    data.notificationId || data.id || data.highlightId,
  );

  // Best-effort mark-as-read when we have an inbox id.
  if (notificationId && /^\d+$/.test(notificationId)) {
    apiService.put(`/notifications/${notificationId}/read`).catch(() => undefined);
  }

  if (action === 'JAPA_MILESTONE') {
    navigateTo('MilestoneNotifications');
    return;
  }

  if (
    action === 'GOAL_COMPLETED' ||
    action === 'DAILY_GOAL_COMPLETED' ||
    action === 'CHALLENGE_COMPLETED' ||
    action === 'ADMIN_BROADCAST' ||
    action === 'SUPPORT_TICKET_REPLY' ||
    action === 'SYSTEM'
  ) {
    navigateTo(
      'Notifications',
      notificationId ? {highlightId: notificationId} : undefined,
    );
    return;
  }

  if (action === 'CHALLENGE_REWARD_READY') {
    const challengeId = num(data.challengeId || data.actionId);
    if (challengeId) {
      navigateTo('ChallengeRewardSelect', {id: challengeId});
      return;
    }
    navigateTo('Challenges');
    return;
  }

  if (action === 'CHALLENGE_DEADLINE') {
    const challengeId = num(data.challengeId || data.actionId);
    if (challengeId) {
      navigateTo('Chant', {
        mode: 'community',
        challengeId,
        challengeMantra: str(data.mantraName || data.title),
        resume: true,
        fromHome: false,
      });
      return;
    }
    navigateTo('Challenges');
    return;
  }

  if (action === 'DAILY_JAPA_PENDING' || action === 'GOAL_DEADLINE') {
    const mantraId = num(data.mantraId);
    const personalMantraId = num(data.personalMantraId);
    const goalId = num(data.goalId || data.japaGoalId || data.actionId);
    const isPersonal =
      String(data.mode || '').toLowerCase() === 'private' ||
      Boolean(personalMantraId);

    navigateTo('Chant', {
      mode: isPersonal ? 'private' : 'community',
      mantraId: isPersonal ? undefined : mantraId,
      personalMantraId: personalMantraId || undefined,
      privateMantra: isPersonal
        ? str(data.mantraName) || undefined
        : undefined,
      goal: num(data.targetCount || data.goal),
      initialCount: num(data.completedCount || data.initialCount) || 0,
      dailyTarget: num(data.dailyTarget),
      japaGoalId: goalId,
      resume: true,
      fromHome: false,
    });
    return;
  }

  if (action === 'REWARD' || action === 'REWARD_READY') {
    navigateTo('Rewards');
    return;
  }

  // Idle reminder, expired goals, unknown → Notifications inbox.
  if (
    action === 'DAILY_JAPA_REMINDER' ||
    action === 'GOAL_EXPIRED' ||
    !action
  ) {
    navigateTo(
      'Notifications',
      notificationId ? {highlightId: notificationId} : undefined,
    );
    return;
  }

  navigateTo(
    'Notifications',
    notificationId ? {highlightId: notificationId} : undefined,
  );
};

/** Normalize FCM / Notifee data maps (all values are often strings). */
export const openFromPushMessage = async (remote: {
  data?: Record<string, any> | null;
  notification?: {title?: string; body?: string} | null;
} | null) => {
  const data = {...(remote?.data || {})};
  if (!data.title && remote?.notification?.title) {
    data.title = remote.notification.title;
  }
  if (!data.body && remote?.notification?.body) {
    data.body = remote.notification.body;
  }
  await openFromNotificationPayload(data);
};

/** japasiddhi://notify?... from native PendingIntent. */
export const openFromNotifyUrl = async (url: string | null | undefined) => {
  const raw = String(url || '').trim();
  if (!raw || !raw.startsWith('japasiddhi://notify')) {
    return;
  }
  const data: Record<string, string> = {};
  const q = raw.indexOf('?');
  if (q >= 0) {
    String(raw.slice(q + 1))
      .split('&')
      .forEach(part => {
        if (!part) {
          return;
        }
        const eq = part.indexOf('=');
        const key = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part);
        const value = decodeURIComponent(eq >= 0 ? part.slice(eq + 1) : '');
        if (key) {
          data[key] = value;
        }
      });
  }
  await openFromNotificationPayload(data);
};

/** Subscribe to cold-start + warm deep links from the tray. */
export const bindNotifyDeepLinks = () => {
  const handle = (url: string | null) => {
    openFromNotifyUrl(url).catch(() => undefined);
  };
  Linking.getInitialURL()
    .then(handle)
    .catch(() => undefined);
  const sub = Linking.addEventListener('url', ({url}) => handle(url));
  return () => {
    sub.remove();
  };
};
