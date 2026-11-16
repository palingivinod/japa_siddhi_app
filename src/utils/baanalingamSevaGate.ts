import {Alert} from 'react-native';

import apiService from '../services/apiService';
import {BAANALINGAM_EXTRA_JAPAS} from './rewardContent';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const isBaanalingamOrder = (row: any) => {
  const type = String(row?.orderType || row?.order_type || '').toUpperCase();
  const name = String(row?.itemName || row?.item_name || row?.product || '')
    .toLowerCase();
  const num = String(row?.orderNumber || row?.order_number || '');
  return (
    type === 'BANA_LINGAM' ||
    name.includes('baanalingam') ||
    name.includes('banalingam') ||
    num.startsWith('BL-') ||
    num.startsWith('#BL-')
  );
};

const isMarakataOrder = (row: any) => {
  const name = String(row?.itemName || row?.item_name || row?.product || '')
    .toLowerCase();
  if (name.includes('chakra') || name.includes('yantra')) {
    return false;
  }
  return (
    (name.includes('marakata') || name.includes('marakatha')) &&
    (name.includes('shiv') || name.includes('ling'))
  ) || (name.includes('aventurine') && name.includes('shiv'));
};

const isActiveOrder = (row: any) => {
  const status = String(row?.orderStatus || row?.order_status || '')
    .toUpperCase();
  return status !== 'CANCELLED';
};

/**
 * Gate Seva Hub / Home Baanalingam tap:
 * - already ordered/received Baanalingam or Markata → block
 * - not yet at 5k / present+5k → eligibility popup
 * - else allow navigation
 */
export const gateBaanalingamSevaPress = async (opts: {
  t: Translate;
  onAllow: () => void;
}): Promise<void> => {
  const {t, onAllow} = opts;
  try {
    const [ordersRes, milestoneRes, relativeRes] = await Promise.all([
      apiService.get('/orders').catch(() => null),
      apiService.get('/japa/milestones').catch(() => null),
      apiService.get('/japa/relative-rewards').catch(() => null),
    ]);

    const orderRows = Array.isArray(ordersRes?.data?.data)
      ? ordersRes.data.data
      : Array.isArray(ordersRes?.data)
        ? ordersRes.data
        : [];
    const active = orderRows.filter(isActiveOrder);
    const hasBana = active.some(isBaanalingamOrder);
    const hasMarakata = active.some(isMarakataOrder);

    if (hasBana) {
      Alert.alert(
        t('alreadyOrderedTitle') || 'Already ordered',
        t('baanalingamAlreadyOrderedShort') ||
          'You are not able to order this because you already ordered/received Baanalingam.',
        [{text: t('ok') || 'OK'}],
      );
      return;
    }
    if (hasMarakata) {
      Alert.alert(
        t('shivaLingaNotEligibleTitle') || 'Not eligible',
        t('shivaLingaAlreadyOrderedMessage', {
          item: t('marakataShivlingItemName') || 'Marakata Shivling',
        }) ||
          'You have already ordered/received Marakata Shivling, so you are not eligible to order Baanalingam.',
        [{text: t('ok') || 'OK'}],
      );
      return;
    }

    const relativeData = relativeRes?.data?.data || {};
    const milestoneData = milestoneRes?.data?.data || {};
    const total = Number(
      relativeData.total ||
        milestoneData.total ||
        milestoneData.milestoneTotal ||
        0,
    );
    const relativeList = Array.isArray(relativeData.rewards)
      ? relativeData.rewards
      : [];
    const banaStatus = relativeList.find((row: any) => {
      const name = String(row.rewardName || row.name || '').toLowerCase();
      return (
        name.includes('baanalingam') ||
        name.includes('banalingam') ||
        (name.includes('narmada') && name.includes('ling'))
      );
    });
    const unlockTarget = Number(
      banaStatus?.unlockTarget ||
        banaStatus?.target ||
        Math.max(BAANALINGAM_EXTRA_JAPAS, total + BAANALINGAM_EXTRA_JAPAS),
    );

    // Freshers with no baseline yet: absolute 5k is enough to open.
    const effectiveTarget =
      banaStatus?.unlockTarget || banaStatus?.target
        ? unlockTarget
        : BAANALINGAM_EXTRA_JAPAS;

    if (total < effectiveTarget) {
      Alert.alert(
        t('shivaLingaNotEligibleTitle') || 'Not eligible',
        t('baanalingamSevaEligibilityMessage') ||
          'You can grab this after 5,000 Japas or present + 5,000 Japas.',
        [{text: t('ok') || 'OK'}],
      );
      return;
    }

    onAllow();
  } catch {
    // Fail open to form — form/backend still enforce locks.
    onAllow();
  }
};
