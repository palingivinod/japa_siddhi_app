import {Alert} from 'react-native';

import apiService from '../services/apiService';
import {BAANALINGAM_JAPAS} from './rewardContent';

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
    ((name.includes('marakata') || name.includes('marakatha')) &&
      (name.includes('shiv') || name.includes('ling'))) ||
    (name.includes('aventurine') && name.includes('shiv'))
  );
};

const isActiveOrder = (row: any) => {
  const status = String(row?.orderStatus || row?.order_status || '')
    .toUpperCase();
  return status !== 'CANCELLED' && status !== 'CANCELED';
};

/**
 * Gate Seva Hub / Home Baanalingam tap:
 * - already ordered Baanalingam or Markata → block
 * - absolute 5,000 Japas required (no present+)
 * - else allow navigation
 */
export const gateBaanalingamSevaPress = async (opts: {
  t: Translate;
  onAllow: () => void;
  onAlreadyOrderedOk?: () => void;
}): Promise<void> => {
  const {t, onAllow, onAlreadyOrderedOk} = opts;
  try {
    const [ordersRes, milestoneRes] = await Promise.all([
      apiService.get('/orders').catch(() => null),
      apiService.get('/japa/milestones').catch(() => null),
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
        [
          {
            text: t('ok') || 'OK',
            onPress: () => onAlreadyOrderedOk?.(),
          },
        ],
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

    const milestoneData = milestoneRes?.data?.data || {};
    const total = Number(
      milestoneData.total || milestoneData.milestoneTotal || 0,
    );

    if (total < BAANALINGAM_JAPAS) {
      Alert.alert(
        t('shivaLingaNotEligibleTitle') || 'Not eligible',
        t('baanalingamSevaEligibilityMessage') ||
          'You can grab this after 5,000 Japas.',
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
