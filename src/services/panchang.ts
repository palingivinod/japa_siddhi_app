export type ChoghadiyaPeriod = {
  name: string;
  period: 'day' | 'night';
  effect: string;
  startLocal: string;
  endLocal: string;
  startIso: string;
  endIso: string;
};

export type ChoghadiyaPayload = {
  current?: ChoghadiyaPeriod | null;
  periods?: ChoghadiyaPeriod[];
};

export type FestivalSummary = {
  id?: number;
  festivalName?: string;
  name?: string;
  description?: string | null;
  festivalDate?: string;
  festivalType?: string;
};

export type PanchangPayload = {
  date: string;
  displayDate: string;
  weekday: string;
  vara: string;
  nakshatra: string;
  pada: number;
  tithi: string;
  tithiName: string;
  paksha: string;
  yoga: string;
  karana: string;
  moonRashi: string;
  sunRashi: string;
  source?: string;
  locationName?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  rahuKalam?: string;
  yamagandam?: string;
  gulikaKalam?: string;
  festival?: FestivalSummary | null;
  nextFestival?: FestivalSummary | null;
  choghadiya?: ChoghadiyaPayload;
  auspiciousTimings?: {
    amruthaGadiyalu: Array<{startTime: string; endTime: string}>;
  };
};

export const emptyPanchang = (): PanchangPayload => ({
  date: '',
  displayDate: '',
  weekday: '',
  vara: '',
  nakshatra: '',
  pada: 0,
  tithi: '',
  tithiName: '',
  paksha: '',
  yoga: '',
  karana: '',
  moonRashi: '',
  sunRashi: '',
  festival: null,
  nextFestival: null,
  choghadiya: {current: null, periods: []},
});

import {TranslationKey} from '../i18n/en';

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

export const festivalName = (item?: FestivalSummary | null) =>
  item?.festivalName || item?.name || '';

export const festivalDateLabel = (
  value?: string,
  t?: (key: TranslationKey, vars?: any) => string,
) => {
  if (!value) {
    return '';
  }
  const day = String(value).slice(0, 10);
  const parsed = new Date(`${day}T12:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) {
    return day;
  }
  const d = parsed.getDate();
  const m = parsed.getMonth();
  const y = parsed.getFullYear();
  if (t && MONTH_KEYS[m]) {
    return `${d} ${t(MONTH_KEYS[m])} ${y}`;
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(parsed);
};

export const formatPanchangDisplayDate = (
  panchang?: PanchangPayload | null,
  t?: (key: TranslationKey, vars?: any) => string,
) => {
  if (!panchang) {
    return '';
  }
  const dateStr = panchang.date || '';
  if (dateStr && t) {
    const parsed = new Date(`${dateStr.slice(0, 10)}T12:00:00+05:30`);
    if (!Number.isNaN(parsed.getTime())) {
      const weekdayKey = DAY_KEYS[parsed.getDay()];
      const monthKey = MONTH_KEYS[parsed.getMonth()];
      const dayNum = parsed.getDate();
      const year = parsed.getFullYear();
      if (weekdayKey && monthKey) {
        return `${t(weekdayKey)}, ${dayNum} ${t(monthKey)} ${year}`;
      }
    }
  }
  return panchang.displayDate || '';
};

export const currentChoghadiya = (
  payload?: ChoghadiyaPayload | null,
  nowMs = Date.now(),
): ChoghadiyaPeriod | null => {
  const periods = payload?.periods || [];
  const live = periods.find(item => {
    const start = new Date(item.startIso).getTime();
    const end = new Date(item.endIso).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && start <= nowMs && nowMs < end;
  });
  return live || payload?.current || null;
};

export const choghadiyaWindow = (item?: ChoghadiyaPeriod | null) => {
  if (!item?.startLocal) {
    return '';
  }
  if (item.endLocal) {
    return `${item.startLocal} – ${item.endLocal}`;
  }
  return item.startLocal;
};
