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

export function translateTitle(dict: TranslationDict, title: string): string {
  const key = TITLE_TO_KEY[title];
  if (!key) {
    return title;
  }
  return translate(dict, key);
}
