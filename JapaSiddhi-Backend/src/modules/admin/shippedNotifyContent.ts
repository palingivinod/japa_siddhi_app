/**
 * Fixed in-app copy when an order is marked Shipped.
 * Shared photo collage + video for every order kind.
 */

export type ShippedOrderKind =
  | 'BAANALINGAM'
  | 'RAMAKOTI'
  | 'HOMA_BHASMA'
  | 'BHIRAVA'
  | 'GENERIC';

export type ShippedNotifyContent = {
  kind: ShippedOrderKind;
  title: string;
  message: string;
  /** Public https URL for in-app / push image. */
  imageUrl?: string;
  /** Public https URL — set later when video asset is ready. */
  videoUrl?: string;
};

/** Same media for every shipped order (all product kinds). */
const SHARED_SHIPPED_IMAGE_URL =
  'https://japasiddhi.onrender.com/uploads/shipped/shipped-photo-example.jpg';
const SHARED_SHIPPED_VIDEO_URL =
  'https://japasiddhi.onrender.com/uploads/shipped/shipped-photo-example.mp4';

const SHARED_MEDIA = {
  imageUrl: SHARED_SHIPPED_IMAGE_URL,
  videoUrl: SHARED_SHIPPED_VIDEO_URL,
};

const CONTENT: Record<Exclude<ShippedOrderKind, 'GENERIC'>, ShippedNotifyContent> =
  {
    BAANALINGAM: {
      kind: 'BAANALINGAM',
      title: 'Your Baanalingam order has been shipped',
      message:
        'After you receive it, please send us a photo of you with the Baanalingam. This helps us confirm safe delivery.\n\nThank you for your devotion. 🙏',
      ...SHARED_MEDIA,
    },
    RAMAKOTI: {
      kind: 'RAMAKOTI',
      title: 'Your Ramakoti books have been shipped',
      message:
        'After you receive them, please send us a photo of you with the Ramakoti books. This helps us confirm delivery.\n\nThank you for continuing your Ramakoti japa. 🙏',
      ...SHARED_MEDIA,
    },
    HOMA_BHASMA: {
      kind: 'HOMA_BHASMA',
      title: 'Your Homa Bhasma order has been shipped',
      message:
        'After you receive it, please send us a photo of you with the Homa Bhasma. This helps us confirm safe delivery.\n\nThank you. 🙏',
      ...SHARED_MEDIA,
    },
    BHIRAVA: {
      kind: 'BHIRAVA',
      title: 'Your Bhirava Pendent has been shipped',
      message:
        'After you receive it, please send us a photo of you wearing / holding the pendant. This helps us confirm delivery.\n\nThank you. 🙏',
      ...SHARED_MEDIA,
    },
  };

export const resolveShippedOrderKind = (input: {
  orderType?: string | null;
  orderNo?: string | null;
  product?: string | null;
  remarks?: string | null;
}): ShippedOrderKind => {
  const type = String(input.orderType || '').toUpperCase();
  const number = String(input.orderNo || '')
    .replace(/^#/, '')
    .toUpperCase();
  const product = String(input.product || '').toLowerCase();
  const remarks = String(input.remarks || '').toLowerCase();
  const hay = `${product} ${remarks}`;

  if (
    type === 'RAMAKOTI_BOOKS' ||
    type.includes('RAMAKOTI') ||
    number.startsWith('RK') ||
    hay.includes('ramakoti')
  ) {
    return 'RAMAKOTI';
  }
  if (
    type === 'HOMA_BHASMA' ||
    type.includes('BHASMA') ||
    number.startsWith('HB') ||
    hay.includes('homa') ||
    hay.includes('bhasma')
  ) {
    return 'HOMA_BHASMA';
  }
  if (
    type === 'BIRAVA_PENDANT' ||
    type.includes('BIRAVA') ||
    type.includes('BHIRAVA') ||
    type.includes('PENDANT') ||
    number.startsWith('BP') ||
    hay.includes('birava') ||
    hay.includes('bhirava') ||
    hay.includes('pendant') ||
    hay.includes('pendent')
  ) {
    return 'BHIRAVA';
  }
  if (
    type === 'BANA_LINGAM' ||
    type.includes('BAANA') ||
    type.includes('BANA_LING') ||
    number.startsWith('BL') ||
    hay.includes('baanalingam') ||
    hay.includes('banalingam') ||
    hay.includes('lingam')
  ) {
    return 'BAANALINGAM';
  }
  return 'GENERIC';
};

export const getShippedNotifyContent = (input: {
  orderType?: string | null;
  orderNo?: string | null;
  product?: string | null;
  remarks?: string | null;
}): ShippedNotifyContent => {
  const kind = resolveShippedOrderKind(input);
  if (kind !== 'GENERIC') {
    return CONTENT[kind];
  }
  const product =
    String(input.product || 'your order').trim() || 'your order';
  return {
    kind: 'GENERIC',
    title: 'Your order has been shipped',
    message: `After you receive it, please send us a photo of you with the item (${product}). This helps us confirm safe delivery.\n\nThank you. 🙏`,
    ...SHARED_MEDIA,
  };
};
