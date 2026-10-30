/**
 * Same pattern as /annasantharpana: HTTPS page on Render that opens the app
 * via japasiddhi://… with Play Store fallback.
 */

const PLAYSTORE =
  'https://play.google.com/store/apps/details?id=com.japasiddhi';

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const renderDeepLinkLanding = (input: {
  title: string;
  subtitle: string;
  appDeepLink: string;
  icon?: string;
}): string => {
  const title = escapeHtml(input.title);
  const subtitle = escapeHtml(input.subtitle);
  const deepLink = escapeHtml(input.appDeepLink);
  const icon = escapeHtml(input.icon || '🪔');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Japa Siddhi</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 24px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #FFFDF9; color: #3A2010;
      display: flex; justify-content: center; align-items: center; min-height: 90vh;
    }
    .card {
      background: #FFFFFF; border-radius: 20px; padding: 32px 24px;
      max-width: 440px; width: 100%; text-align: center;
      border: 1.5px solid #F3E6D0; box-shadow: 0 10px 30px rgba(86,53,15,0.09);
    }
    .icon { font-size: 52px; margin-bottom: 14px; }
    h1 { font-size: 22px; color: #2D5016; margin: 0 0 10px; font-weight: 800; }
    p { font-size: 14px; color: #665242; line-height: 1.6; margin: 0 0 24px; }
    .btn-app {
      display: block; background: #DDA15E; color: #2C1810; font-weight: 800;
      padding: 15px 20px; border-radius: 12px; text-decoration: none; font-size: 16px;
      box-shadow: 0 4px 14px rgba(221,161,94,0.35); margin-bottom: 12px;
    }
    .btn-play {
      display: block; background: #2D5016; color: #FFFFFF; font-weight: 700;
      padding: 13px 20px; border-radius: 12px; text-decoration: none; font-size: 14px;
    }
  </style>
  <script>
    setTimeout(function() {
      window.location.href = ${JSON.stringify(input.appDeepLink)};
    }, 200);
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <a href="${deepLink}" class="btn-app">🪔 Open in Japa Siddhi App</a>
    <a href="${PLAYSTORE}" class="btn-play">📲 Download on Google Play Store</a>
  </div>
</body>
</html>
  `.trim();
};

const MS_PAGES: Record<string, {title: string; subtitle: string; deepLink: string}> = {
  '58': {
    title: 'Monthly Support — ₹58',
    subtitle: 'Open Japa Siddhi to contribute ₹58 / month via Razorpay.',
    deepLink: 'japasiddhi://ms/58',
  },
  '116': {
    title: 'Monthly Support — ₹116',
    subtitle: 'Open Japa Siddhi to contribute ₹116 / month via Razorpay.',
    deepLink: 'japasiddhi://ms/116',
  },
  '200': {
    title: 'Monthly Support — ₹200',
    subtitle: 'Open Japa Siddhi to contribute ₹200 / month via Razorpay.',
    deepLink: 'japasiddhi://ms/200',
  },
  '216': {
    title: 'Monthly Support — ₹216',
    subtitle: 'Open Japa Siddhi to contribute ₹216 / month via Razorpay.',
    deepLink: 'japasiddhi://ms/216',
  },
  custom: {
    title: 'Monthly Support — Custom',
    subtitle: 'Open Japa Siddhi to enter your own monthly contribution amount.',
    deepLink: 'japasiddhi://ms/custom',
  },
  autopay: {
    title: 'Monthly Support — Autopay',
    subtitle: 'Open Japa Siddhi to register monthly autopay for temple seva.',
    deepLink: 'japasiddhi://ms/autopay',
  },
};

export const resolveMonthlySupportLanding = (slugRaw: string) => {
  const slug = String(slugRaw || '')
    .trim()
    .toLowerCase();
  if (MS_PAGES[slug]) {
    return MS_PAGES[slug];
  }
  return {
    title: 'Monthly Spiritual Support',
    subtitle: 'Open Japa Siddhi to choose your monthly contribution plan.',
    deepLink: 'japasiddhi://monthly-support',
  };
};

const BOOK_PAGES: Record<
  string,
  {title: string; subtitle: string; deepLink: string; icon?: string}
> = {
  'nithya-homam': {
    title: 'Nithya Homam',
    subtitle: 'Open Japa Siddhi to book Nithya Homam seva.',
    deepLink: 'japasiddhi://book/nithya-homam',
    icon: '🔥',
  },
  'nitya-homam': {
    title: 'Nithya Homam',
    subtitle: 'Open Japa Siddhi to book Nithya Homam seva.',
    deepLink: 'japasiddhi://book/nithya-homam',
    icon: '🔥',
  },
  homam: {
    title: 'Nithya Homam',
    subtitle: 'Open Japa Siddhi to book Nithya Homam seva.',
    deepLink: 'japasiddhi://book/nithya-homam',
    icon: '🔥',
  },
  'bana-lingam': {
    title: 'Baanalingam Seva',
    subtitle: 'Open Japa Siddhi to book Baanalingam seva.',
    deepLink: 'japasiddhi://book/bana-lingam',
  },
  banalingam: {
    title: 'Baanalingam Seva',
    subtitle: 'Open Japa Siddhi to book Baanalingam seva.',
    deepLink: 'japasiddhi://book/bana-lingam',
  },
  baanalingam: {
    title: 'Baanalingam Seva',
    subtitle: 'Open Japa Siddhi to book Baanalingam seva.',
    deepLink: 'japasiddhi://book/bana-lingam',
  },
  annadanam: {
    title: 'Annadanam',
    subtitle: 'Open Japa Siddhi to offer Annadanam.',
    deepLink: 'japasiddhi://book/annadanam',
    icon: '🍲',
  },
  annasantharpana: {
    title: 'Anna Santharpana',
    subtitle: 'Open Japa Siddhi for the Anna Santharpana form.',
    deepLink: 'japasiddhi://annasantharpana',
    icon: '🍲',
  },
  'japa-annadanam': {
    title: 'Japa Annadanam',
    subtitle: 'Open Japa Siddhi for Japa Annadanam.',
    deepLink: 'japasiddhi://book/japa-annadanam',
    icon: '🍲',
  },
  'monthly-support': {
    title: 'Monthly Support',
    subtitle: 'Open Japa Siddhi for Monthly Spiritual Support.',
    deepLink: 'japasiddhi://monthly-support',
  },
  ramakoti: {
    title: 'Ramakoti Books',
    subtitle: 'Open Japa Siddhi to request Ramakoti books.',
    deepLink: 'japasiddhi://book/ramakoti',
  },
  'homa-bhasma': {
    title: 'Homa Bhasma',
    subtitle: 'Open Japa Siddhi to request Homa Bhasma.',
    deepLink: 'japasiddhi://book/homa-bhasma',
  },
  bhasma: {
    title: 'Homa Bhasma',
    subtitle: 'Open Japa Siddhi to request Homa Bhasma.',
    deepLink: 'japasiddhi://book/homa-bhasma',
  },
  birava: {
    title: 'Birava Pendant',
    subtitle: 'Open Japa Siddhi to request Birava Pendant.',
    deepLink: 'japasiddhi://book/birava',
  },
  'birava-pendant': {
    title: 'Birava Pendant',
    subtitle: 'Open Japa Siddhi to request Birava Pendant.',
    deepLink: 'japasiddhi://book/birava',
  },
  seva: {
    title: 'Seva & Bookings',
    subtitle: 'Open Japa Siddhi to browse seva bookings.',
    deepLink: 'japasiddhi://book/seva',
  },
  festivals: {
    title: 'Festivals',
    subtitle: 'Open Japa Siddhi to view festivals.',
    deepLink: 'japasiddhi://book/festivals',
  },
};

export const resolveBookingLanding = (slugRaw: string) => {
  const slug = String(slugRaw || '')
    .trim()
    .toLowerCase();
  if (BOOK_PAGES[slug]) {
    return BOOK_PAGES[slug];
  }
  return {
    title: 'Book a Seva',
    subtitle: 'Open Japa Siddhi to browse seva and bookings.',
    deepLink: 'japasiddhi://book/seva',
  };
};
