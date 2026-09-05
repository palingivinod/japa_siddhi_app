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
});

export const festivalName = (item?: FestivalSummary | null) =>
  item?.festivalName || item?.name || '';

export const festivalDateLabel = (value?: string) => {
  if (!value) {
    return '';
  }
  const day = String(value).slice(0, 10);
  const parsed = new Date(`${day}T12:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) {
    return day;
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(parsed);
};
