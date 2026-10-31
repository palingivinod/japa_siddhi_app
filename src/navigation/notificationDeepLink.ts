import {Alert, Linking} from 'react-native';

import {startAppPayment} from '../modules/payments/startAppPayment';
import apiService from '../services/apiService';
import {
  isBookingDeepLink,
  parseBookingDeepLink,
} from './bookingDeepLinks';
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
 * - Idle / generic admin broadcast → Notifications
 * - Admin new challenge / mantra / reward / banner → that screen
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

  // Admin created a challenge → that challenge's details page.
  if (action === 'ADMIN_CHALLENGE_NEW') {
    const challengeId = num(data.challengeId || data.actionId);
    if (challengeId) {
      navigateTo('ChallengeDetails', {id: challengeId});
      return;
    }
    navigateTo('Challenges');
    return;
  }

  // Admin created a mantra → mantra select with that mantra pre-selected.
  if (action === 'ADMIN_MANTRA_NEW') {
    const mantraId = num(data.mantraId || data.actionId);
    navigateTo('MantraSelect', {
      mode: 'community',
      ...(mantraId ? {mantraId} : {}),
      ...(str(data.mantraName) ? {mantraName: str(data.mantraName)} : {}),
    });
    return;
  }

  if (action === 'ADMIN_REWARD_NEW' || action === 'ADMIN_PRODUCT_NEW') {
    navigateTo('Rewards');
    return;
  }

  if (action === 'ADMIN_BANNER_NEW') {
    navigateTo('Home');
    return;
  }

  if (action === 'MEETING_SCHEDULED' || action === 'MEETING_LIVE') {
    navigateTo('Home');
    return;
  }

  if (action === 'ORDER_STATUS' || action === 'ORDER_UPDATE') {
    const orderId = num(data.orderId || data.actionId);
    if (orderId) {
      navigateTo('OrderDetails', {id: orderId});
      return;
    }
    navigateTo('Orders');
    return;
  }

  if (
    action === 'GOAL_COMPLETED' ||
    action === 'DAILY_GOAL_COMPLETED' ||
    action === 'CHALLENGE_COMPLETED' ||
    action === 'SUPPORT_TICKET_REPLY' ||
    action === 'SYSTEM'
  ) {
    navigateTo(
      'Notifications',
      notificationId ? {highlightId: notificationId} : undefined,
    );
    return;
  }

  // Manual admin broadcast: deep-link if payload includes a target id.
  if (action === 'ADMIN_BROADCAST') {
    const challengeId = num(data.challengeId);
    if (challengeId) {
      navigateTo('ChallengeDetails', {id: challengeId});
      return;
    }
    const mantraId = num(data.mantraId);
    if (mantraId) {
      navigateTo('MantraSelect', {mode: 'community', mantraId});
      return;
    }
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

  // Idle / expired → Your Japas (not inbox, not welcome/splash).
  if (
    action === 'DAILY_JAPA_REMINDER' ||
    action === 'IDLE_7_DAYS_REMINDER' ||
    action === 'GOAL_EXPIRED'
  ) {
    navigateTo('YourJapas');
    return;
  }

  // Tray taps sometimes arrive without actionType — still route idle text.
  const blob = `${data.title || ''} ${data.body || ''} ${data.message || ''}`.toLowerCase();
  if (
    !action &&
    (blob.includes('not chanted') ||
      blob.includes('no japas yet today') ||
      blob.includes("didn't chant") ||
      blob.includes('did not chant') ||
      blob.includes('idle from sometime') ||
      blob.includes('mantra devata'))
  ) {
    navigateTo('YourJapas');
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

let lastPaymentResult = '';
let lastPaymentAt = 0;

const paymentQuery = (raw: string) => {
  const params = new URL(raw.replace('japasiddhi://', 'https://japasiddhi.app/')).searchParams;
  return {
    paymentId: params.get('payment_id') || '',
    orderId: params.get('order_id') || '',
    purpose: params.get('purpose') || '',
    seva: params.get('seva') || '',
    amount: Number(params.get('amount')),
    name: params.get('name') || '',
    phone: params.get('phone') || '',
  };
};

const acceptPaymentResult = (result: string) => {
  const now = Date.now();
  if (result === lastPaymentResult && now - lastPaymentAt < 5000) {
    return false;
  }
  lastPaymentResult = result;
  lastPaymentAt = now;
  return true;
};

const MS_PRESET_AMOUNTS = new Set([58, 116, 200, 216]);

type MonthlySupportParams = {
  amount?: number;
  openCustom?: boolean;
  openAutopay?: boolean;
};

/** Parse japasiddhi://ms/58|custom|autopay or monthly-support?… or https://…/ms/58 */
export const parseMonthlySupportDeepLink = (
  url: string | null | undefined,
): MonthlySupportParams => {
  const raw = String(url || '').trim();
  if (!raw) {
    return {};
  }

  let pathSlug = '';
  let search = '';
  try {
    // japasiddhi://ms/58 → host=ms path=/58
    // japasiddhi://monthly-support?amount=58 → host=monthly-support
    const asHttp = raw.replace(/^japasiddhi:\/\//i, 'https://');
    const parsed = new URL(asHttp);
    search = parsed.search || '';
    const host = parsed.hostname.toLowerCase();
    const parts = parsed.pathname
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean)
      .map(p => p.toLowerCase());

    if (host === 'ms') {
      pathSlug = parts[0] || '';
    } else if (host === 'monthly-support') {
      pathSlug = parts[0] || '';
    } else if (parts[0] === 'ms') {
      pathSlug = parts[1] || '';
    } else if (parts[0] === 'monthly-support') {
      pathSlug = parts[1] || '';
    }
  } catch {
    const lower = raw.toLowerCase();
    const msIdx = lower.indexOf('/ms/');
    if (msIdx >= 0) {
      pathSlug = lower
        .slice(msIdx + 4)
        .split(/[/?#]/)[0]
        .trim();
    }
    const q = raw.indexOf('?');
    if (q >= 0) {
      search = raw.slice(q);
    }
  }

  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  if (params.get('autopay') === '1' || params.get('openAutopay') === '1') {
    return {openAutopay: true};
  }
  if (params.get('custom') === '1' || params.get('openCustom') === '1') {
    return {openCustom: true};
  }
  const amountParam = Number(params.get('amount'));
  if (Number.isFinite(amountParam) && amountParam > 0) {
    return {amount: amountParam};
  }

  if (pathSlug === 'autopay' || pathSlug === 'auto') {
    return {openAutopay: true};
  }
  if (pathSlug === 'custom' || pathSlug === 'others') {
    return {openCustom: true};
  }
  const pathAmount = Number(pathSlug);
  if (Number.isFinite(pathAmount) && pathAmount > 0) {
    return {
      amount: MS_PRESET_AMOUNTS.has(pathAmount) ? pathAmount : pathAmount,
    };
  }
  return {};
};

/** Subscribe to cold-start + warm deep links from the tray. */
export const bindNotifyDeepLinks = () => {
  const handle = (url: string | null) => {
    const raw = String(url || '');
    if (raw.startsWith('japasiddhi://payment/success') || raw.startsWith('japasiddhi://payment/failure')) {
      const failed = raw.startsWith('japasiddhi://payment/failure');
      if (!acceptPaymentResult(failed ? 'failure' : 'success')) {
        return;
      }
      let payment;
      try {
        payment = paymentQuery(raw);
      } catch {
        return;
      }
      if (failed) {
        Alert.alert('Payment failed', 'Please try again.', [
          {text: 'OK', style: 'cancel'},
          {
            text: 'Retry',
            onPress: () => {
              void startAppPayment({
                amount:
                  Number.isFinite(payment.amount) && payment.amount > 0
                    ? payment.amount
                    : undefined,
                purpose: payment.purpose,
                seva: payment.seva,
                name: payment.name,
                phone: payment.phone,
              });
            },
          },
        ]);
        return;
      }
      navigateTo('PaymentConfirmation', {
        kind: 'RAZORPAY',
        seva: payment.seva,
        itemName: payment.seva || payment.purpose || 'Seva offering',
        purpose: payment.purpose,
        orderNumber: payment.paymentId,
        confirmationId: payment.paymentId,
        razorpayOrderId: payment.orderId,
        amount: Number.isFinite(payment.amount) ? payment.amount : undefined,
        name: payment.name,
        phone: payment.phone,
      });
      return;
    }

    // Direct deep links for Anna Santharpana / Annadanam donation form
    const lower = raw.toLowerCase();
    if (
      lower.includes('annasantharpana') ||
      lower.includes('annadanam') ||
      lower.startsWith('japasiddhi://seva/annadanam') ||
      lower.startsWith('japasiddhi://seva/annasantharpana')
    ) {
      navigateTo('GeneralAnnadanam');
      return;
    }

    // Monthly Support flyer: japasiddhi://ms/58|custom|autopay or
    // japasiddhi://monthly-support?amount=58|custom=1|autopay=1
    // Also https://japasiddhi.com/ms/58 (App Links)
    if (
      lower.includes('japasiddhi://ms') ||
      lower.includes('japasiddhi://monthly-support') ||
      /https?:\/\/[^/]+\/ms(\/|$|\?)/i.test(lower)
    ) {
      navigateTo('MonthlySupport', parseMonthlySupportDeepLink(raw));
      return;
    }

    // Booking / seva services: japasiddhi://book/nithya-homam,
    // https://japasiddhi.com/book/bana-lingam, japasiddhi://homam, etc.
    if (isBookingDeepLink(raw)) {
      const booking = parseBookingDeepLink(raw);
      if (booking) {
        if (booking.screen === 'MonthlySupport') {
          navigateTo('MonthlySupport', parseMonthlySupportDeepLink(raw));
        } else {
          navigateTo(booking.screen);
        }
        return;
      }
    }

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
