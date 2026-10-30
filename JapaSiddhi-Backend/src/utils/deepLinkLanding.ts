/**
 * Same pattern as /annasantharpana: HTTPS page on Render that opens the app
 * via japasiddhi://… with Play Store fallback.
 * Android also uses intent:// so Chrome can open the app (or Play Store) without
 * requiring an extra tap when App Links are not yet verified.
 */

const PLAYSTORE =
  'https://play.google.com/store/apps/details?id=com.japasiddhi';

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const toAndroidIntentUrl = (deepLink: string) => {
  const raw = String(deepLink || '').trim();
  const withoutScheme = raw.replace(/^japasiddhi:\/\//i, '');
  if (!withoutScheme || withoutScheme === raw) {
    return raw;
  }
  const fallback = encodeURIComponent(PLAYSTORE);
  return `intent://${withoutScheme}#Intent;scheme=japasiddhi;package=com.japasiddhi;S.browser_fallback_url=${fallback};end`;
};

export const renderDeepLinkLanding = (input: {
  title: string;
  subtitle: string;
  appDeepLink: string;
  icon?: string;
}): string => {
  const title = escapeHtml(input.title);
  const subtitle = escapeHtml(input.subtitle);
  const deepLink = escapeHtml(input.appDeepLink);
  const intentUrl = toAndroidIntentUrl(input.appDeepLink);
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
    .hint { font-size: 13px; color: #8A6A4A; margin: 0 0 18px; display: none; }
    .hint.show { display: block; }
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
    (function () {
      var deepLink = ${JSON.stringify(input.appDeepLink)};
      var intentUrl = ${JSON.stringify(intentUrl)};
      var isAndroid = /Android/i.test(navigator.userAgent || '');
      var target = isAndroid ? intentUrl : deepLink;
      setTimeout(function () {
        window.location.href = target;
      }, 150);
      setTimeout(function () {
        var hint = document.getElementById('dl-hint');
        if (hint) { hint.className = 'hint show'; }
      }, 1600);
    })();
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <p id="dl-hint" class="hint">App not opening? Please download Japa Siddhi, then open this link again.</p>
    <a href="${deepLink}" class="btn-app">Open in Japa Siddhi App</a>
    <a href="${PLAYSTORE}" class="btn-play">Please download the app (Play Store)</a>
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
    title: 'Monthly Support — Custom amount',
    subtitle: 'Open Japa Siddhi to enter your own Monthly Support amount.',
    deepLink: 'japasiddhi://ms/custom',
  },
  autopay: {
    title: 'Monthly Support — Autopay',
    subtitle: 'Open Japa Siddhi to set up Monthly Support Autopay.',
    deepLink: 'japasiddhi://ms/autopay',
  },
};

export const resolveMonthlySupportLanding = (slug: string) => {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (key && MS_PAGES[key]) {
    return MS_PAGES[key];
  }
  return {
    title: 'Monthly Support',
    subtitle: 'Open Japa Siddhi to contribute Monthly Support.',
    deepLink: 'japasiddhi://monthly-support',
  };
};

const BOOK_PAGES: Record<
  string,
  {title: string; subtitle: string; deepLink: string; icon?: string}
> = {
  'nithya-homam': {
    title: 'Nithya Homam',
    subtitle: 'Open Japa Siddhi to book Nithya Homam.',
    deepLink: 'japasiddhi://book/nithya-homam',
    icon: '🔥',
  },
  'nitya-homam': {
    title: 'Nithya Homam',
    subtitle: 'Open Japa Siddhi to book Nithya Homam.',
    deepLink: 'japasiddhi://book/nithya-homam',
    icon: '🔥',
  },
  homam: {
    title: 'Nithya Homam',
    subtitle: 'Open Japa Siddhi to book Nithya Homam.',
    deepLink: 'japasiddhi://book/nithya-homam',
    icon: '🔥',
  },
  'bana-lingam': {
    title: 'Bana Lingam',
    subtitle: 'Open Japa Siddhi to book Bana Lingam seva.',
    deepLink: 'japasiddhi://book/bana-lingam',
  },
  banalingam: {
    title: 'Bana Lingam',
    subtitle: 'Open Japa Siddhi to book Bana Lingam seva.',
    deepLink: 'japasiddhi://book/bana-lingam',
  },
  baanalingam: {
    title: 'Bana Lingam',
    subtitle: 'Open Japa Siddhi to book Bana Lingam seva.',
    deepLink: 'japasiddhi://book/bana-lingam',
  },
  annadanam: {
    title: 'Anna Santharpana',
    subtitle: 'Open Japa Siddhi for Anna Santharpana.',
    deepLink: 'japasiddhi://book/annadanam',
    icon: '🍲',
  },
  annasantharpana: {
    title: 'Anna Santharpana',
    subtitle: 'Open Japa Siddhi for Anna Santharpana.',
    deepLink: 'japasiddhi://annasantharpana',
    icon: '🍲',
  },
  'japa-annadanam': {
    title: 'Japa Annadanam',
    subtitle: 'Open Japa Siddhi for Japa Annadanam.',
    deepLink: 'japasiddhi://book/japa-annadanam',
    icon: '🍲',
  },
  donate: {
    title: 'Monthly Support',
    subtitle: 'Open Japa Siddhi to contribute Monthly Support.',
    deepLink: 'japasiddhi://monthly-support',
  },
  ramakoti: {
    title: 'Ramakoti',
    subtitle: 'Open Japa Siddhi for Ramakoti.',
    deepLink: 'japasiddhi://book/ramakoti',
  },
  'homa-bhasma': {
    title: 'Homa Bhasma',
    subtitle: 'Open Japa Siddhi for Homa Bhasma.',
    deepLink: 'japasiddhi://book/homa-bhasma',
  },
  bhasma: {
    title: 'Homa Bhasma',
    subtitle: 'Open Japa Siddhi for Homa Bhasma.',
    deepLink: 'japasiddhi://book/homa-bhasma',
  },
  birava: {
    title: 'Bhairava Pendant',
    subtitle: 'Open Japa Siddhi for Bhairava Pendant.',
    deepLink: 'japasiddhi://book/birava',
  },
  'birava-pendant': {
    title: 'Bhairava Pendant',
    subtitle: 'Open Japa Siddhi for Bhairava Pendant.',
    deepLink: 'japasiddhi://book/birava',
  },
  seva: {
    title: 'Book Seva',
    subtitle: 'Open Japa Siddhi to book seva.',
    deepLink: 'japasiddhi://book/seva',
  },
  festivals: {
    title: 'Festivals',
    subtitle: 'Open Japa Siddhi for festival offerings.',
    deepLink: 'japasiddhi://book/festivals',
  },
};

export const resolveBookingLanding = (slug: string) => {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (key && BOOK_PAGES[key]) {
    return BOOK_PAGES[key];
  }
  return {
    title: 'Book Seva',
    subtitle: 'Open Japa Siddhi to book seva.',
    deepLink: 'japasiddhi://book/seva',
    icon: '🪔',
  };
};
