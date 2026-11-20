import {TranslationKey} from '../../i18n/en';

export const MANTRA_CATEGORIES: Array<{
  code: string;
  label: string;
  labelKey: TranslationKey;
}> = [
  {code: 'siva', label: 'Siva mantras', labelKey: 'mantraCatSiva'},
  {code: 'vishnu', label: 'Vishnu mantras', labelKey: 'mantraCatVishnu'},
  {code: 'devi', label: 'Devi mantras', labelKey: 'mantraCatDevi'},
  {code: 'ganapathy', label: 'Ganapathy mantras', labelKey: 'mantraCatGanapathy'},
  {code: 'dasa_maha_vidya', label: 'Dasa maha vidya mantras', labelKey: 'mantraCatDasa'},
  {code: 'saptha', label: 'Sarpa mantras', labelKey: 'mantraCatSaptha'},
  {code: 'guru', label: 'Guru mantras', labelKey: 'mantraCatGuru'},
];

export type MantraCategoryOption = {
  code: string;
  name: string;
};

export const builtinCategories = (): MantraCategoryOption[] =>
  MANTRA_CATEGORIES.map(item => ({code: item.code, name: item.label}));

export type MantraListCode = 'SAMUHIKA' | 'ANTHARANGA' | 'BOTH';

export const normalizeMantraListParam = (
  value?: unknown,
): MantraListCode => {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  if (code === 'ANTHARANGA' || code === 'PRIVATE') {
    return 'ANTHARANGA';
  }
  if (code === 'BOTH' || code === 'ALL' || code === 'SHARED') {
    return 'BOTH';
  }
  return 'SAMUHIKA';
};

export const mantraListLabel = (list?: string) => {
  const code = normalizeMantraListParam(list);
  if (code === 'ANTHARANGA') {
    return 'Antharanga Japa';
  }
  if (code === 'BOTH') {
    return 'Both (Samuhika + Antharanga)';
  }
  return 'Samuhika Japa';
};

/** Samuhika-style schedule / event / notify UI (includes Both). */
export const isSamuhikaStyleList = (list?: string) => {
  const code = normalizeMantraListParam(list);
  return code === 'SAMUHIKA' || code === 'BOTH';
};

export const categoryTitle = (
  category: MantraCategoryOption,
  t: (key: TranslationKey) => string,
) => {
  const builtin = MANTRA_CATEGORIES.find(item => item.code === category.code);
  const saved = String(category.name || '').trim();
  if (
    !builtin ||
    (saved && saved.toLowerCase() !== builtin.label.trim().toLowerCase())
  ) {
    return saved || (builtin ? t(builtin.labelKey) : '');
  }
  return t(builtin.labelKey);
};

export const groupByCategory = <T extends {categoryCode?: string | null}>(
  rows: T[],
  categories: MantraCategoryOption[] = builtinCategories(),
) => {
  const unassigned = rows.filter(row => !row.categoryCode);
  const groups = categories.map(category => ({
    ...category,
    items: rows.filter(row => row.categoryCode === category.code),
  }));
  return {unassigned, groups};
};
