import AsyncStorage from '@react-native-async-storage/async-storage';

export const LINGAM_ADVICE_ACTION = 'LINGAM_ADVICE';

const keyFor = (userId: string | number, milestone: number) =>
  `lingam_advice_banner_dismissed_${userId || 'anon'}_${milestone}`;

export const isLingamAdviceNotification = (item: any) =>
  String(item?.actionType || '') === LINGAM_ADVICE_ACTION ||
  String(item?.extraData?.kind || '') === 'lingam_advice';

export const lingamAdviceMilestone = (item: any) =>
  Number(
    item?.actionId ||
      item?.extraData?.milestone ||
      item?.extraData?.actionId ||
      0,
  );

export const isLingamAdviceBannerDismissed = async (
  userId: string | number,
  milestone: number,
) => {
  if (!milestone) {
    return true;
  }
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId, milestone));
    return raw === '1';
  } catch {
    return false;
  }
};

export const dismissLingamAdviceBanner = async (
  userId: string | number,
  milestone: number,
) => {
  if (!milestone) {
    return;
  }
  try {
    await AsyncStorage.setItem(keyFor(userId, milestone), '1');
  } catch {
    // ignore
  }
};
