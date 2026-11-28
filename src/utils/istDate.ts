const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Today's date in India as YYYY-MM-DD. */
export const istTodayIso = (): string =>
  new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** "2026-11-28" -> "28 Nov 2026". */
export const formatIsoDateLabel = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!match) {
    return '';
  }
  const month = MONTHS_SHORT[Number(match[2]) - 1] || '';
  return `${Number(match[3])} ${month} ${match[1]}`;
};

/** Moves a YYYY-MM-DD date by a number of days. */
export const shiftIsoDate = (iso: string, days: number): string => {
  const base = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(base)) {
    return iso;
  }
  return new Date(base + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
};
