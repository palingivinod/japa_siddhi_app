export const MANTRA_CATEGORIES = [
  {code: 'siva', label: 'Siva mantras'},
  {code: 'vishnu', label: 'Vishnu mantras'},
  {code: 'devi', label: 'Devi mantras'},
  {code: 'ganapathy', label: 'Ganapathy mantras'},
  {code: 'dasa_maha_vidya', label: 'Dasa maha vidya mantras'},
  {code: 'saptha', label: 'Sarpa mantras'},
  {code: 'guru', label: 'Guru mantras'},
] as const;

export type MantraCategoryCode = (typeof MANTRA_CATEGORIES)[number]['code'];
export type MantraListCode = 'SAMUHIKA' | 'ANTHARANGA' | 'BOTH';

export const BUILTIN_CATEGORY_CODES = new Set(
  MANTRA_CATEGORIES.map(item => item.code),
);

export const normalizeMantraList = (value?: unknown): MantraListCode | '' => {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  if (code === 'ANTHARANGA' || code === 'PRIVATE') {
    return 'ANTHARANGA';
  }
  if (code === 'SAMUHIKA' || code === 'COMMUNITY') {
    return 'SAMUHIKA';
  }
  if (code === 'BOTH' || code === 'ALL' || code === 'SHARED') {
    return 'BOTH';
  }
  return '';
};

/** Lists visible for a devotee/admin scope (includes BOTH). */
export const listsMatchingScope = (scope?: unknown): MantraListCode[] => {
  const code = normalizeMantraList(scope) || 'SAMUHIKA';
  if (code === 'BOTH') {
    return ['BOTH'];
  }
  return [code, 'BOTH'];
};

export const normalizeMantraCategory = (value?: unknown): string | null => {
  const code = String(value || '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9_]{1,40}$/.test(code)) {
    return null;
  }
  return code;
};
