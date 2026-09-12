import en, {TranslationDict, TranslationKey} from './en';
import {dictionaries, TITLE_TO_KEY} from './locales';

export type {TranslationKey, TranslationDict};
export {TITLE_TO_KEY};

export const DEFAULT_LANG = 'en';

export function resolveLanguage(code?: string | null) {
  if (code && dictionaries[code]) {
    return code;
  }
  return DEFAULT_LANG;
}

export function getDictionary(code?: string | null): TranslationDict {
  return dictionaries[resolveLanguage(code)] ?? en;
}

type Vars = Record<string, string | number>;

export function translate(
  dict: TranslationDict,
  key: TranslationKey,
  vars?: Vars,
): string {
  let value = dict[key] ?? en[key] ?? String(key);
  if (vars) {
    Object.entries(vars).forEach(([name, raw]) => {
      value = value.replace(new RegExp(`{{${name}}}`, 'g'), String(raw));
    });
  }
  return value;
}

const escapeRe = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Phrase = {phrase: string; key: TranslationKey};

const exactLookup = new Map<string, TranslationKey>();
const phrases: Phrase[] = [];

const rememberExact = (text: string, key: TranslationKey) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return;
  }
  if (!exactLookup.has(trimmed)) {
    exactLookup.set(trimmed, key);
  }
  const lower = trimmed.toLowerCase();
  if (!exactLookup.has(lower)) {
    exactLookup.set(lower, key);
  }
  const upper = trimmed.toUpperCase();
  if (!exactLookup.has(upper)) {
    exactLookup.set(upper, key);
  }
  const noDot = trimmed.replace(/[.]+$/, '').trim();
  if (noDot && noDot !== trimmed && !exactLookup.has(noDot.toLowerCase())) {
    exactLookup.set(noDot, key);
    exactLookup.set(noDot.toLowerCase(), key);
  }
};

(Object.keys(en) as TranslationKey[]).forEach(key => {
  rememberExact(en[key], key);
});
Object.entries(TITLE_TO_KEY).forEach(([title, key]) => {
  rememberExact(title, key);
});

const seenPhrase = new Set<string>();
(Object.keys(en) as TranslationKey[]).forEach(key => {
  const phrase = String(en[key] || '').trim();
  if (phrase.length < 4 || phrase.includes('{{')) {
    return;
  }
  const id = phrase.toLowerCase();
  if (seenPhrase.has(id)) {
    return;
  }
  seenPhrase.add(id);
  phrases.push({phrase, key});
});
phrases.sort((a, b) => b.phrase.length - a.phrase.length);

const lookupKey = (title: string): TranslationKey | undefined =>
  exactLookup.get(title) ||
  exactLookup.get(title.toLowerCase()) ||
  exactLookup.get(title.toUpperCase()) ||
  exactLookup.get(title.replace(/[.]+$/, '').trim()) ||
  exactLookup.get(title.replace(/[.]+$/, '').trim().toLowerCase());

export function translateTitle(dict: TranslationDict, title: string): string {
  const trimmed = String(title || '').trim();
  if (!trimmed) {
    return trimmed;
  }

  const direct = lookupKey(trimmed);
  if (direct) {
    return translate(dict, direct);
  }

  const isEnglishDict = dict.continue === en.continue && dict.settings === en.settings;
  if (isEnglishDict) {
    return trimmed;
  }

  let result = trimmed;
  phrases.forEach(item => {
    const translated = translate(dict, item.key);
    if (!translated || translated === item.phrase) {
      return;
    }
    const re = new RegExp(
      `(^|[^A-Za-z])(${escapeRe(item.phrase)})(?![A-Za-z])`,
      'gi',
    );
    result = result.replace(re, (_match, prefix) => `${prefix}${translated}`);
  });
  return result;
}
