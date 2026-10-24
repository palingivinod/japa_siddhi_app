export const MANTRA_CATEGORIES = [
  {code: 'siva', label: 'Siva mantras'},
  {code: 'vishnu', label: 'Vishnu mantras'},
  {code: 'devi', label: 'Devi mantras'},
  {code: 'ganapathy', label: 'Ganapathy mantras'},
  {code: 'dasa_maha_vidya', label: 'Dasa maha vidya mantras'},
  {code: 'saptha', label: 'Saptha mantras'},
  {code: 'guru', label: 'Guru mantras'},
] as const;

export type MantraCategoryCode = (typeof MANTRA_CATEGORIES)[number]['code'];
export type MantraListCode = 'SAMUHIKA' | 'ANTHARANGA';

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
  return '';
};

export const normalizeMantraCategory = (
  value?: unknown,
): MantraCategoryCode | null => {
  const code = String(value || '')
    .trim()
    .toLowerCase();
  const match = MANTRA_CATEGORIES.find(item => item.code === code);
  return match ? match.code : null;
};
