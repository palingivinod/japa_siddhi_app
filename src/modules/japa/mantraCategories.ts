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
  {code: 'saptha', label: 'Saptha mantras', labelKey: 'mantraCatSaptha'},
  {code: 'guru', label: 'Guru mantras', labelKey: 'mantraCatGuru'},
];

export type MantraCategoryOption = {
  code: string;
  name: string;
};

export const builtinCategories = (): MantraCategoryOption[] =>
  MANTRA_CATEGORIES.map(item => ({code: item.code, name: item.label}));

export const mantraListLabel = (list?: string) =>
  String(list || '').toUpperCase() === 'ANTHARANGA'
    ? 'Antharanga Japa'
    : 'Samuhika Japa';

export const categoryTitle = (
  category: MantraCategoryOption,
  t: (key: TranslationKey) => string,
) => {
  const builtin = MANTRA_CATEGORIES.find(item => item.code === category.code);
  return builtin ? t(builtin.labelKey) : category.name;
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
