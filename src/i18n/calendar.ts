import {TranslationKey} from './en';

type Vars = Record<string, string | number>;
type Translate = (key: TranslationKey, vars?: Vars) => string;

const DAY_KEYS: TranslationKey[] = [
  'daySun',
  'dayMon',
  'dayTue',
  'dayWed',
  'dayThu',
  'dayFri',
  'daySat',
];

const MONTH_KEYS: TranslationKey[] = [
  'monthJan',
  'monthFeb',
  'monthMar',
  'monthApr',
  'monthMay',
  'monthJun',
  'monthJul',
  'monthAug',
  'monthSep',
  'monthOct',
  'monthNov',
  'monthDec',
];

/**
 * The API sends dates as ISO strings or as dd/mm/yyyy, so both shapes are
 * accepted. Midday is used to keep the calendar day stable across time zones.
 */
export const parseApiDate = (raw?: string | null): Date | null => {
  const value = String(raw || '').trim();
  if (!value) {
    return null;
  }

  let iso = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const parts = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (!parts) {
      return null;
    }
    iso = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(
      2,
      '0',
    )}`;
  }

  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Short weekday in the devotee's language, e.g. Thu / గురు. */
export const shortWeekday = (t: Translate, raw?: string | null) => {
  const date = parseApiDate(raw);
  return date ? t(DAY_KEYS[date.getDay()]) : '';
};

/** Short month and day in the devotee's language, e.g. Jan 1 / జన 1. */
export const shortMonthDay = (t: Translate, raw?: string | null) => {
  const date = parseApiDate(raw);
  if (!date) {
    return String(raw || '').trim();
  }
  return `${t(MONTH_KEYS[date.getMonth()])} ${date.getDate()}`;
};
