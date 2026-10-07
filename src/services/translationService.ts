import axios from 'axios';

export interface MultiLangTranslationResult {
  title: string;
  message: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clean translator output: decode %20 / percent-encoding, strip provider warnings.
 */
export function normalizeTranslationOutput(text: string): string {
  let out = String(text || '').trim();
  if (!out) {
    return '';
  }
  if (/MYMEMORY WARNING/i.test(out)) {
    return '';
  }
  // Decode percent-encoding (e.g. "ఇది%20is%20a%20Test")
  for (let i = 0; i < 3; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(out)) {
      break;
    }
    try {
      const decoded = decodeURIComponent(out.replace(/\+/g, ' '));
      if (!decoded || decoded === out) {
        out = out.replace(/%20/gi, ' ');
        break;
      }
      out = decoded;
    } catch {
      out = out.replace(/%20/gi, ' ').replace(/%([0-9A-Fa-f]{2})/gi, (_, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return ' ';
        }
      });
      break;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

const hasIndicScript = (text: string) =>
  /[\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0C80-\u0CFF]/.test(text);

/**
 * Reject broken / mostly-untranslated results so we can try the next engine.
 */
function isAcceptableTranslation(
  original: string,
  translated: string,
  targetLang: string,
): boolean {
  const clean = normalizeTranslationOutput(translated);
  if (!clean) {
    return false;
  }
  if (/%[0-9A-Fa-f]{2}/.test(clean)) {
    return false;
  }
  if (/MYMEMORY WARNING/i.test(clean)) {
    return false;
  }
  const src = original.trim();
  if (!src) {
    return false;
  }
  // Same as source is only OK when languages match (handled earlier).
  if (clean.toLowerCase() === src.toLowerCase() && targetLang !== 'en') {
    return false;
  }
  // For Indic targets, require some non-Latin script when source was Latin.
  const indicTargets = new Set(['te', 'hi', 'ta', 'kn', 'ml', 'mr', 'bn', 'or']);
  if (indicTargets.has(targetLang) && /^[\x00-\x7F\s.,!?'"()-]+$/.test(src)) {
    if (!hasIndicScript(clean)) {
      // Allow short proper nouns / numbers-only, otherwise reject.
      if (src.split(/\s+/).length >= 3) {
        return false;
      }
    }
  }
  return true;
}

async function translateViaGoogle(
  text: string,
  targetLang: string,
  sourceLang: string,
): Promise<string> {
  // axios params avoids manual double-encoding issues.
  const res = await axios.get(
    'https://translate.googleapis.com/translate_a/single',
    {
      params: {
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        q: text,
      },
      timeout: 10000,
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
      },
    },
  );

  if (Array.isArray(res.data) && Array.isArray(res.data[0])) {
    const translated = res.data[0]
      .map((chunk: any) => (Array.isArray(chunk) ? chunk[0] : ''))
      .filter(Boolean)
      .join('');
    return normalizeTranslationOutput(translated);
  }

  // Alternate shape from some Google clients
  if (typeof res.data === 'string') {
    return normalizeTranslationOutput(res.data);
  }
  return '';
}

async function translateViaGoogleAlt(
  text: string,
  targetLang: string,
  sourceLang: string,
): Promise<string> {
  const res = await axios.get('https://clients5.google.com/translate_a/t', {
    params: {
      client: 'dict-chrome-ex',
      sl: sourceLang,
      tl: targetLang,
      q: text,
    },
    timeout: 10000,
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    },
  });

  // Often: [["translated", "en"]] or ["translated"]
  const data = res.data;
  if (Array.isArray(data)) {
    const first = data[0];
    if (typeof first === 'string') {
      return normalizeTranslationOutput(first);
    }
    if (Array.isArray(first) && typeof first[0] === 'string') {
      return normalizeTranslationOutput(first[0]);
    }
  }
  return '';
}

async function translateViaMyMemory(
  text: string,
  targetLang: string,
  sourceLang: string,
): Promise<string> {
  const res = await axios.get('https://api.mymemory.translated.net/get', {
    params: {
      q: text,
      langpair: `${sourceLang}|${targetLang}`,
    },
    timeout: 10000,
  });
  const raw = res.data?.responseData?.translatedText;
  if (typeof raw !== 'string') {
    return '';
  }
  return normalizeTranslationOutput(raw);
}

/**
 * Translates text from English to a target language code (e.g. te, hi, ta, kn)
 * using Google first, then alternates, with sanitization against %20 garbage.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'en',
): Promise<string> {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return '';
  }
  if (targetLang === sourceLang) {
    return trimmed;
  }

  const engines = [
    translateViaGoogle,
    translateViaGoogleAlt,
    translateViaMyMemory,
  ];

  for (const engine of engines) {
    try {
      const translated = await engine(trimmed, targetLang, sourceLang);
      if (isAcceptableTranslation(trimmed, translated, targetLang)) {
        return normalizeTranslationOutput(translated);
      }
    } catch {
      // try next engine
    }
    await sleep(150);
  }

  // Last resort: return sanitized MyMemory/Google even if weak, but never %20 junk
  try {
    const soft = normalizeTranslationOutput(
      await translateViaMyMemory(trimmed, targetLang, sourceLang),
    );
    if (soft && !/%[0-9A-Fa-f]{2}/.test(soft) && !/MYMEMORY WARNING/i.test(soft)) {
      return soft;
    }
  } catch {
    // ignore
  }

  return trimmed;
}

/**
 * Translates an English field map into all target languages.
 * `copyKeys` are copied as-is (e.g. Sanskrit script that should not be machine-translated).
 */
export async function autoTranslateFields(
  englishFields: Record<string, string>,
  targetLanguages: string[] = ['te', 'hi', 'ta', 'kn'],
  options?: {copyKeys?: string[]},
): Promise<Record<string, Record<string, string>>> {
  const copyKeys = new Set(options?.copyKeys || []);
  const en: Record<string, string> = {};
  Object.keys(englishFields).forEach(key => {
    en[key] = String(englishFields[key] || '').trim();
  });

  const results: Record<string, Record<string, string>> = {en: {...en}};

  for (const lang of targetLanguages) {
    if (lang === 'en') {
      continue;
    }
    const next: Record<string, string> = {};
    const keys = Object.keys(en);
    for (const key of keys) {
      const value = en[key];
      if (!value) {
        next[key] = '';
        continue;
      }
      if (copyKeys.has(key)) {
        next[key] = value;
        continue;
      }
      const translated = await translateText(value, lang, 'en');
      next[key] = normalizeTranslationOutput(translated) || value;
      await sleep(120);
    }
    results[lang] = next;
    await sleep(200);
  }

  return results;
}

/**
 * Translates notification title & message from English into all supported target languages.
 */
export async function autoTranslateNotification(
  englishTitle: string,
  englishMessage: string,
  targetLanguages: string[] = ['te', 'hi', 'ta', 'kn'],
): Promise<Record<string, MultiLangTranslationResult>> {
  const mapped = await autoTranslateFields(
    {title: englishTitle, message: englishMessage},
    targetLanguages,
  );
  const results: Record<string, MultiLangTranslationResult> = {};
  Object.keys(mapped).forEach(lang => {
    results[lang] = {
      title: mapped[lang].title || '',
      message: mapped[lang].message || '',
    };
  });
  return results;
}
