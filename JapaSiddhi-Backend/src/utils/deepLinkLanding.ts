/**
 * HTTPS open-app pages on Render: japasiddhi://… with Play Store fallback.
 * Copy is localized (en/hi/te/kn/ta/ml/mr/bn/or). Pass ?lang=te to force.
 */

import {
  getLandingPack,
  LANDING_LANG_LABELS,
  LANDING_LANGS,
  LandingLang,
  landingLangFromAccept,
  resolveLandingLang,
} from './deepLinkLandingI18n';

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

export const pickLandingLang = (input: {
  queryLang?: string | null;
  acceptLanguage?: string | null;
}): LandingLang => {
  const fromQuery = String(input.queryLang || '').trim();
  if (fromQuery) {
    return resolveLandingLang(fromQuery);
  }
  return landingLangFromAccept(input.acceptLanguage);
};

export const renderDeepLinkLanding = (input: {
  title: string;
  subtitle: string;
  appDeepLink: string;
  icon?: string;
  lang?: LandingLang | string | null;
}): string => {
  const lang = resolveLandingLang(input.lang);
  const pack = getLandingPack(lang);
  const title = escapeHtml(input.title);
  const subtitle = escapeHtml(input.subtitle);
  const deepLink = escapeHtml(input.appDeepLink);
  const intentUrl = toAndroidIntentUrl(input.appDeepLink);
  const icon = escapeHtml(input.icon || '🪔');
  const openInApp = escapeHtml(pack.ui.openInApp);
  const downloadPlay = escapeHtml(pack.ui.downloadPlay);
  const notOpening = escapeHtml(pack.ui.notOpening);
  const langLabel = escapeHtml(pack.ui.langLabel);

  const langOptions = LANDING_LANGS.map(
    code =>
      `<option value="${code}"${code === lang ? ' selected' : ''}>${escapeHtml(
        LANDING_LANG_LABELS[code],
      )}</option>`,
  ).join('');

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Japa Siddhi</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 24px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif;
      background: #FFFDF9; color: #3A2010;
      display: flex; justify-content: center; align-items: center; min-height: 90vh;
    }
    .card {
      background: #FFFFFF; border-radius: 20px; padding: 32px 24px;
      max-width: 440px; width: 100%; text-align: center;
      border: 1.5px solid #F3E6D0; box-shadow: 0 10px 30px rgba(86,53,15,0.09);
      position: relative;
    }
    .lang-row {
      display: flex; align-items: center; justify-content: flex-end; gap: 8px;
      margin: -8px 0 16px; font-size: 12px; color: #8A6A4A;
    }
    .lang-row select {
      border: 1px solid #E8D9B8; border-radius: 8px; padding: 6px 8px;
      background: #FFFDF9; color: #3A2010; font-size: 13px;
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
      window.__setLandingLang = function (code) {
        try {
          var url = new URL(window.location.href);
          url.searchParams.set('lang', code);
          window.location.href = url.toString();
        } catch (e) {}
      };
    })();
  </script>
</head>
<body>
  <div class="card">
    <div class="lang-row">
      <label for="dl-lang">${langLabel}</label>
      <select id="dl-lang" onchange="window.__setLandingLang(this.value)">
        ${langOptions}
      </select>
    </div>
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <p id="dl-hint" class="hint">${notOpening}</p>
    <a href="${deepLink}" class="btn-app">${openInApp}</a>
    <a href="${PLAYSTORE}" class="btn-play">${downloadPlay}</a>
  </div>
</body>
</html>
  `.trim();
};

type MsBase = {deepLink: string; amount?: number; kind: 'amount' | 'custom' | 'autopay' | 'default'};

const MS_META: Record<string, MsBase> = {
  '58': {kind: 'amount', amount: 58, deepLink: 'japasiddhi://ms/58'},
  '116': {kind: 'amount', amount: 116, deepLink: 'japasiddhi://ms/116'},
  '200': {kind: 'amount', amount: 200, deepLink: 'japasiddhi://ms/200'},
  '216': {kind: 'amount', amount: 216, deepLink: 'japasiddhi://ms/216'},
  custom: {kind: 'custom', deepLink: 'japasiddhi://ms/custom'},
  custo: {kind: 'custom', deepLink: 'japasiddhi://ms/custom'},
  autopay: {kind: 'autopay', deepLink: 'japasiddhi://ms/autopay'},
};

export const resolveMonthlySupportLanding = (
  slug: string,
  lang?: string | null,
) => {
  const pack = getLandingPack(lang);
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  const meta = key ? MS_META[key] : undefined;
  if (meta?.kind === 'amount' && meta.amount) {
    const copy = pack.ms.amount(meta.amount);
    return {...copy, deepLink: meta.deepLink};
  }
  if (meta?.kind === 'custom') {
    return {...pack.ms.custom, deepLink: meta.deepLink};
  }
  if (meta?.kind === 'autopay') {
    return {...pack.ms.autopay, deepLink: meta.deepLink};
  }
  return {...pack.ms.default, deepLink: 'japasiddhi://monthly-support'};
};

type BookMeta = {
  key:
    | 'nithyaHomam'
    | 'banaLingam'
    | 'annaSantharpana'
    | 'japaAnnadanam'
    | 'monthlySupport'
    | 'ramakoti'
    | 'homaBhasma'
    | 'birava'
    | 'seva'
    | 'festivals';
  deepLink: string;
  icon?: string;
};

const BOOK_META: Record<string, BookMeta> = {
  'nithya-homam': {
    key: 'nithyaHomam',
    deepLink: 'japasiddhi://book/nithya-homam',
    icon: '🔥',
  },
  'nitya-homam': {
    key: 'nithyaHomam',
    deepLink: 'japasiddhi://book/nithya-homam',
    icon: '🔥',
  },
  homam: {
    key: 'nithyaHomam',
    deepLink: 'japasiddhi://book/nithya-homam',
    icon: '🔥',
  },
  'bana-lingam': {key: 'banaLingam', deepLink: 'japasiddhi://book/bana-lingam'},
  banalingam: {key: 'banaLingam', deepLink: 'japasiddhi://book/bana-lingam'},
  baanalingam: {key: 'banaLingam', deepLink: 'japasiddhi://book/bana-lingam'},
  annadanam: {
    key: 'annaSantharpana',
    deepLink: 'japasiddhi://book/annadanam',
    icon: '🍲',
  },
  annasantharpana: {
    key: 'annaSantharpana',
    deepLink: 'japasiddhi://annasantharpana',
    icon: '🍲',
  },
  'japa-annadanam': {
    key: 'japaAnnadanam',
    deepLink: 'japasiddhi://book/japa-annadanam',
    icon: '🍲',
  },
  donate: {
    key: 'monthlySupport',
    deepLink: 'japasiddhi://monthly-support',
  },
  ramakoti: {key: 'ramakoti', deepLink: 'japasiddhi://book/ramakoti'},
  'homa-bhasma': {key: 'homaBhasma', deepLink: 'japasiddhi://book/homa-bhasma'},
  bhasma: {key: 'homaBhasma', deepLink: 'japasiddhi://book/homa-bhasma'},
  birava: {key: 'birava', deepLink: 'japasiddhi://book/birava'},
  'birava-pendant': {key: 'birava', deepLink: 'japasiddhi://book/birava'},
  seva: {key: 'seva', deepLink: 'japasiddhi://book/seva'},
  festivals: {key: 'festivals', deepLink: 'japasiddhi://book/festivals'},
};

export const resolveBookingLanding = (
  slug: string,
  lang?: string | null,
) => {
  const pack = getLandingPack(lang);
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  const meta = key ? BOOK_META[key] : undefined;
  if (meta) {
    const copy = pack.book[meta.key];
    return {...copy, deepLink: meta.deepLink, icon: meta.icon};
  }
  return {
    ...pack.book.seva,
    deepLink: 'japasiddhi://book/seva',
    icon: '🪔',
  };
};
