import {istIsoDate, shiftIsoDate} from './dateUtils';
import type {SevaRequestConfig} from '../modules/sevaRequest/sevaRequestConfig';
import {parseOrderCreatedMs} from './orderCreatedMs';

export const BHASMAM_REORDER_COOLDOWN_DAYS = 30;

const isCancelledStatus = (raw?: string | null) => {
  const status = String(raw || '')
    .toUpperCase()
    .replace(/[-\s]/g, '_');
  return status === 'CANCELLED' || status === 'CANCELED';
};

const orderCreatedMs = (ord: any): number => {
  const raw =
    ord?.createdAt ||
    ord?.created_at ||
    ord?.orderDate ||
    ord?.orderedAt ||
    '';
  return parseOrderCreatedMs(raw);
};

const matchesSevaOrder = (ord: any, matchOrder: SevaRequestConfig['matchOrder']) => {
  const type = String(ord?.orderType || ord?.order_type || '').toUpperCase();
  const name = String(
    ord?.itemName || ord?.product || ord?.rewardName || '',
  ).toLowerCase();
  const num = String(ord?.orderNumber || ord?.orderNo || ord?.order_number || '')
    .toUpperCase()
    .replace(/^#/, '');
  return matchOrder(type, name, num);
};

export type BhasmamCooldownInfo = {
  order: any;
  orderedOnIso: string;
  availableOnIso: string;
  orderedOnLabel: string;
  availableOnLabel: string;
};

const formatIstDayLabel = (iso: string) => {
  const [y, m, d] = String(iso || '')
    .slice(0, 10)
    .split('-')
    .map(Number);
  if (!y || !m || !d) {
    return iso;
  }
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Latest non-cancelled Homa / Pooja Bhasmam order still inside the 30-day window.
 * Pass `formatDay` so ordered/available dates render in the user's app language.
 */
export const findBhasmamReorderCooldown = (
  orders: any[] | null | undefined,
  matchOrder: SevaRequestConfig['matchOrder'],
  now: Date = new Date(),
  formatDay?: (iso: string) => string,
): BhasmamCooldownInfo | null => {
  const list = Array.isArray(orders) ? orders : [];
  const nowMs = now.getTime();
  const windowMs = BHASMAM_REORDER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const labelFor = formatDay || formatIstDayLabel;

  let latest: any = null;
  let latestMs = 0;
  for (const ord of list) {
    if (isCancelledStatus(ord?.orderStatus || ord?.order_status || ord?.status)) {
      continue;
    }
    if (!matchesSevaOrder(ord, matchOrder)) {
      continue;
    }
    const ms = orderCreatedMs(ord);
    if (ms <= 0) {
      continue;
    }
    if (nowMs - ms < windowMs && ms >= latestMs) {
      latest = ord;
      latestMs = ms;
    }
  }

  if (!latest || latestMs <= 0) {
    return null;
  }

  const orderedOnIso = istIsoDate(new Date(latestMs));
  const availableOnIso = shiftIsoDate(
    orderedOnIso,
    BHASMAM_REORDER_COOLDOWN_DAYS,
  );
  return {
    order: latest,
    orderedOnIso,
    availableOnIso,
    orderedOnLabel: labelFor(orderedOnIso),
    availableOnLabel: labelFor(availableOnIso),
  };
};

export const isBhasmamCooldownKind = (kind?: string) =>
  kind === 'HOMA_BHASMA' || kind === 'GOU_MAYA_BHASMA';
