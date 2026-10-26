export type SevaRequestKey = 'HomaBhasma' | 'BiravaPendant';

export type SevaRequestConfig = {
  kind: 'HOMA_BHASMA' | 'BIRAVA_PENDANT';
  formRoute: SevaRequestKey;
  reviewRoute: 'HomaBhasmaReview' | 'BiravaPendantReview';
  emoji: string;
  titleKey: 'homaBhasma' | 'biravaPendant';
  detailKey: 'homaBhasmaDesc' | 'biravaPendantSub';
};

export const SEVA_REQUESTS: Record<SevaRequestKey, SevaRequestConfig> = {
  HomaBhasma: {
    kind: 'HOMA_BHASMA',
    formRoute: 'HomaBhasma',
    reviewRoute: 'HomaBhasmaReview',
    emoji: '🪔',
    titleKey: 'homaBhasma',
    detailKey: 'homaBhasmaDesc',
  },
  BiravaPendant: {
    kind: 'BIRAVA_PENDANT',
    formRoute: 'BiravaPendant',
    reviewRoute: 'BiravaPendantReview',
    emoji: '🧿',
    titleKey: 'biravaPendant',
    detailKey: 'biravaPendantSub',
  },
};

export const sevaRequestFromRoute = (name: string): SevaRequestConfig =>
  name.startsWith('Birava') ? SEVA_REQUESTS.BiravaPendant : SEVA_REQUESTS.HomaBhasma;
