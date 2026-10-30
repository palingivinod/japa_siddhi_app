/**
 * Shared booking / seva deep-link map.
 *
 * App:    japasiddhi://book/{slug}
 *         japasiddhi://{slug}
 * Web:    https://japasiddhi.onrender.com/book/{slug}
 *
 * Opens the matching booking screen (no payment auto-start unless that
 * screen already handles route params — e.g. Monthly Support via /ms/*).
 */

export type BookingScreen =
  | 'NithyaHomam'
  | 'BanaLingam'
  | 'Donate'
  | 'GeneralAnnadanam'
  | 'JapaAnnadanam'
  | 'MonthlySupport'
  | 'RamakotiBooks'
  | 'HomaBhasma'
  | 'BiravaPendant'
  | 'SevaHub'
  | 'Festivals';

type BookingEntry = {
  screen: BookingScreen;
  /** Short labels for website open-app page */
  title: string;
  aliases: string[];
};

/** Canonical slug → screen. First alias is the preferred public path. */
export const BOOKING_DEEP_LINKS: BookingEntry[] = [
  {
    screen: 'NithyaHomam',
    title: 'Nithya Homam',
    aliases: ['nithya-homam', 'nitya-homam', 'homam', 'nithyahomam'],
  },
  {
    screen: 'BanaLingam',
    title: 'Baanalingam Seva',
    aliases: ['bana-lingam', 'banalingam', 'baanalingam', 'bana'],
  },
  {
    screen: 'Donate',
    title: 'Annadanam',
    aliases: ['annadanam', 'donate', 'anna'],
  },
  {
    screen: 'GeneralAnnadanam',
    title: 'Anna Santharpana',
    aliases: [
      'annasantharpana',
      'anna-santharpana',
      'general-annadanam',
      'generalannadanam',
    ],
  },
  {
    screen: 'JapaAnnadanam',
    title: 'Japa Annadanam',
    aliases: ['japa-annadanam', 'japaannadanam'],
  },
  {
    screen: 'MonthlySupport',
    title: 'Monthly Support',
    aliases: ['monthly-support', 'monthlysupport'],
  },
  {
    screen: 'RamakotiBooks',
    title: 'Ramakoti Books',
    aliases: ['ramakoti', 'ramakoti-books', 'ramakotibooks'],
  },
  {
    screen: 'HomaBhasma',
    title: 'Homa Bhasma',
    aliases: ['homa-bhasma', 'homabhasma', 'bhasma'],
  },
  {
    screen: 'BiravaPendant',
    title: 'Birava Pendant',
    aliases: ['birava', 'birava-pendant', 'biravapendant'],
  },
  {
    screen: 'SevaHub',
    title: 'Seva & Bookings',
    aliases: ['seva', 'seva-hub', 'sevahub', 'bookings'],
  },
  {
    screen: 'Festivals',
    title: 'Festivals',
    aliases: ['festivals', 'festival'],
  },
];

const SLUG_TO_ENTRY: Record<string, BookingEntry> = {};
for (const entry of BOOKING_DEEP_LINKS) {
  for (const alias of entry.aliases) {
    SLUG_TO_ENTRY[alias.toLowerCase()] = entry;
  }
}

export const BOOKING_PUBLIC_SLUGS = BOOKING_DEEP_LINKS.map(e => e.aliases[0]);

export const resolveBookingSlug = (
  slug: string | null | undefined,
): BookingEntry | null => {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
  if (!key) {
    return null;
  }
  return SLUG_TO_ENTRY[key] || null;
};

/**
 * Extract booking slug from:
 * - japasiddhi://book/nithya-homam
 * - japasiddhi://nithya-homam
 * - https://japasiddhi.com/book/nithya-homam
 * - japasiddhi://seva/nithya-homam (legacy-style)
 */
export const parseBookingDeepLink = (
  url: string | null | undefined,
): BookingEntry | null => {
  const raw = String(url || '').trim();
  if (!raw) {
    return null;
  }

  try {
    const asHttp = raw.replace(/^japasiddhi:\/\//i, 'https://');
    const parsed = new URL(asHttp);
    const host = parsed.hostname.toLowerCase();
    const parts = parsed.pathname
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean)
      .map(p => p.toLowerCase());

    // japasiddhi://book/nithya-homam  → host=book, parts=[nithya-homam]
    if (host === 'book' || host === 'booking' || host === 'seva') {
      return resolveBookingSlug(parts[0] || host);
    }

    // https://…/book/nithya-homam
    if (parts[0] === 'book' || parts[0] === 'booking') {
      return resolveBookingSlug(parts[1]);
    }

    // https://…/seva/nithya-homam or japasiddhi://seva/… already covered by host
    if (parts[0] === 'seva' && parts[1]) {
      return resolveBookingSlug(parts[1]);
    }

    // japasiddhi://nithya-homam (host is the slug)
    const fromHost = resolveBookingSlug(host);
    if (fromHost) {
      return fromHost;
    }

    // https://…/nithya-homam
    if (parts[0]) {
      return resolveBookingSlug(parts[0]);
    }
  } catch {
    const lower = raw.toLowerCase();
    const bookIdx = lower.indexOf('/book/');
    if (bookIdx >= 0) {
      return resolveBookingSlug(
        lower
          .slice(bookIdx + 6)
          .split(/[/?#]/)[0],
      );
    }
  }

  return null;
};

/** True if URL looks like a booking deep link (including known host aliases). */
export const isBookingDeepLink = (url: string | null | undefined): boolean => {
  const lower = String(url || '').toLowerCase();
  if (!lower) {
    return false;
  }
  if (
    lower.includes('japasiddhi://book/') ||
    lower.includes('japasiddhi://book?') ||
    lower === 'japasiddhi://book' ||
    lower.includes('japasiddhi://booking/') ||
    /https?:\/\/[^/]+\/book(\/|$|\?)/i.test(lower) ||
    /https?:\/\/[^/]+\/booking(\/|$|\?)/i.test(lower)
  ) {
    return true;
  }
  // Direct custom-scheme hosts only (japasiddhi://nithya-homam) — avoid
  // matching arbitrary https paths that happen to share a word.
  if (!lower.startsWith('japasiddhi://')) {
    return false;
  }
  return parseBookingDeepLink(url) != null;
};
