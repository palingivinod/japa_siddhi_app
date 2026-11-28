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

/** The Top 10 Chanters report is picked every day at this India hour (9 PM). */
export const TOP_CHANTERS_PICK_HOUR_IST = 21;

/**
 * Date of the Top 10 Chanters report users see right now (India time):
 * yesterday until 9 PM, then today. Must match the backend rule.
 */
export const topChantersReportIso = (): string => {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const today = ist.toISOString().slice(0, 10);
  if (ist.getUTCHours() >= TOP_CHANTERS_PICK_HOUR_IST) {
    return today;
  }
  return new Date(Date.parse(`${today}T00:00:00Z`) - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
};

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
