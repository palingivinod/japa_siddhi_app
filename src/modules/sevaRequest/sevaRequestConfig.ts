import {AppIconName} from '../../components/icons/AppIcon';

export type SevaRequestKey = 'HomaBhasma' | 'BiravaPendant';

export type SevaRequestConfig = {
  kind: 'HOMA_BHASMA' | 'BIRAVA_PENDANT';
  formRoute: SevaRequestKey;
  reviewRoute: 'HomaBhasmaReview' | 'BiravaPendantReview';
  icon: AppIconName;
  titleKey: 'homaBhasma' | 'biravaPendant';
  detailKey: 'homaBhasmaDesc' | 'biravaPendantSub';
};

export const SEVA_REQUESTS: Record<SevaRequestKey, SevaRequestConfig> = {
  HomaBhasma: {
    kind: 'HOMA_BHASMA',
    formRoute: 'HomaBhasma',
    reviewRoute: 'HomaBhasmaReview',
    icon: 'homaBhasma',
    titleKey: 'homaBhasma',
    detailKey: 'homaBhasmaDesc',
  },
  BiravaPendant: {
    kind: 'BIRAVA_PENDANT',
    formRoute: 'BiravaPendant',
    reviewRoute: 'BiravaPendantReview',
    icon: 'biravaPendant',
    titleKey: 'biravaPendant',
    detailKey: 'biravaPendantSub',
  },
};

export const sevaRequestFromRoute = (name: string): SevaRequestConfig =>
  name.startsWith('Birava') ? SEVA_REQUESTS.BiravaPendant : SEVA_REQUESTS.HomaBhasma;
