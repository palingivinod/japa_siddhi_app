import {AppIconName} from '../../components/icons/AppIcon';

export type SevaRequestKey =
  | 'HomaBhasma'
  | 'BiravaPendant'
  | 'ShivakotiBooks'
  | 'GouMayaBhasma';

export type SevaRequestKind =
  | 'HOMA_BHASMA'
  | 'BIRAVA_PENDANT'
  | 'SHIVAKOTI_BOOKS'
  | 'GOU_MAYA_BHASMA';

export type SevaRequestConfig = {
  kind: SevaRequestKind;
  formRoute: SevaRequestKey;
  reviewRoute:
    | 'HomaBhasmaReview'
    | 'BiravaPendantReview'
    | 'ShivakotiBooksReview'
    | 'GouMayaBhasmaReview';
  icon: AppIconName;
  titleKey:
    | 'homaBhasma'
    | 'biravaPendant'
    | 'shivakotiBooks'
    | 'gouMayaBhasma';
  detailKey:
    | 'homaBhasmaDesc'
    | 'biravaPendantSub'
    | 'shivakotiBooksIntro'
    | 'gouMayaBhasmaDesc';
  pendingTitleKey:
    | 'homaBhasmaPendingOrderTitle'
    | 'biravaPendingOrderTitle'
    | 'shivakotiPendingOrderTitle'
    | 'gouMayaPendingOrderTitle';
  pendingMessageKey:
    | 'homaBhasmaPendingOrderMessage'
    | 'biravaPendingOrderMessage'
    | 'shivakotiPendingOrderMessage'
    | 'gouMayaPendingOrderMessage';
  registerNoteKey?: 'shivakotiRegisterNote' | 'gouMayaRegisterNote';
  matchOrder: (type: string, name: string, num: string) => boolean;
  showPhotos?: boolean;
  /** Local bundled video preview (tap opens full-screen player). */
  showVideo?: boolean;
};

const matchHoma = (type: string, name: string, num: string) => {
  if (
    type === 'GOU_MAYA_BHASMA' ||
    name.includes('gou maya') ||
    name.includes('goumaya') ||
    name.includes('pooja bhasmam') ||
    name.includes('pooja bhasma')
  ) {
    return false;
  }
  return (
    type === 'HOMA_BHASMA' ||
    (name.includes('homa') && name.includes('bhasma')) ||
    name.includes('bhasmam') ||
    num.startsWith('HB') ||
    num.startsWith('#HB')
  );
};

const matchBirava = (type: string, name: string, num: string) =>
  type === 'BIRAVA_PENDANT' ||
  name.includes('birava') ||
  name.includes('bhirava') ||
  name.includes('pendant') ||
  name.includes('pendent') ||
  num.startsWith('BP') ||
  num.startsWith('#BP');

const matchShivakoti = (type: string, name: string, num: string) =>
  type === 'SHIVAKOTI_BOOKS' ||
  name.includes('shivakoti') ||
  num.startsWith('SK') ||
  num.startsWith('#SK');

const matchGouMaya = (type: string, name: string, num: string) =>
  type === 'GOU_MAYA_BHASMA' ||
  name.includes('gou maya') ||
  name.includes('goumaya') ||
  name.includes('pooja bhasmam') ||
  name.includes('pooja bhasma') ||
  (name.includes('gou') && name.includes('bhasma')) ||
  num.startsWith('GM') ||
  num.startsWith('#GM');

export const SEVA_REQUESTS: Record<SevaRequestKey, SevaRequestConfig> = {
  HomaBhasma: {
    kind: 'HOMA_BHASMA',
    formRoute: 'HomaBhasma',
    reviewRoute: 'HomaBhasmaReview',
    icon: 'homaBhasma',
    titleKey: 'homaBhasma',
    detailKey: 'homaBhasmaDesc',
    pendingTitleKey: 'homaBhasmaPendingOrderTitle',
    pendingMessageKey: 'homaBhasmaPendingOrderMessage',
    matchOrder: matchHoma,
  },
  BiravaPendant: {
    kind: 'BIRAVA_PENDANT',
    formRoute: 'BiravaPendant',
    reviewRoute: 'BiravaPendantReview',
    icon: 'biravaPendant',
    titleKey: 'biravaPendant',
    detailKey: 'biravaPendantSub',
    pendingTitleKey: 'biravaPendingOrderTitle',
    pendingMessageKey: 'biravaPendingOrderMessage',
    matchOrder: matchBirava,
    showPhotos: true,
  },
  ShivakotiBooks: {
    kind: 'SHIVAKOTI_BOOKS',
    formRoute: 'ShivakotiBooks',
    reviewRoute: 'ShivakotiBooksReview',
    icon: 'shivakoti',
    titleKey: 'shivakotiBooks',
    detailKey: 'shivakotiBooksIntro',
    pendingTitleKey: 'shivakotiPendingOrderTitle',
    pendingMessageKey: 'shivakotiPendingOrderMessage',
    registerNoteKey: 'shivakotiRegisterNote',
    matchOrder: matchShivakoti,
    showPhotos: true,
  },
  GouMayaBhasma: {
    kind: 'GOU_MAYA_BHASMA',
    formRoute: 'GouMayaBhasma',
    reviewRoute: 'GouMayaBhasmaReview',
    icon: 'gouMayaBhasma',
    titleKey: 'gouMayaBhasma',
    detailKey: 'gouMayaBhasmaDesc',
    pendingTitleKey: 'gouMayaPendingOrderTitle',
    pendingMessageKey: 'gouMayaPendingOrderMessage',
    registerNoteKey: 'gouMayaRegisterNote',
    matchOrder: matchGouMaya,
    showVideo: true,
  },
};

export const sevaRequestFromRoute = (name: string): SevaRequestConfig => {
  if (name.startsWith('Birava')) {
    return SEVA_REQUESTS.BiravaPendant;
  }
  if (name.startsWith('Shivakoti')) {
    return SEVA_REQUESTS.ShivakotiBooks;
  }
  if (name.startsWith('GouMaya')) {
    return SEVA_REQUESTS.GouMayaBhasma;
  }
  return SEVA_REQUESTS.HomaBhasma;
};
