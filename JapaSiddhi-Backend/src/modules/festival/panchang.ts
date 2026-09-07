const NAKSHATRAS = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
];

const TITHIS = [
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
];

const YOGAS = [
  'Vishkambha',
  'Priti',
  'Ayushman',
  'Saubhagya',
  'Shobhana',
  'Atiganda',
  'Sukarma',
  'Dhriti',
  'Shula',
  'Ganda',
  'Vriddhi',
  'Dhruva',
  'Vyaghata',
  'Harshana',
  'Vajra',
  'Siddhi',
  'Vyatipata',
  'Variyan',
  'Parigha',
  'Shiva',
  'Siddha',
  'Sadhya',
  'Shubha',
  'Shukla',
  'Brahma',
  'Indra',
  'Vaidhriti',
];

const MOVABLE_KARANAS = [
  'Bava',
  'Balava',
  'Kaulava',
  'Taitila',
  'Gara',
  'Vanija',
  'Vishti',
];

const FIXED_KARANAS = ['Shakuni', 'Chatushpada', 'Naga'];

const RASHIS = [
  'Mesha',
  'Vrishabha',
  'Mithuna',
  'Karka',
  'Simha',
  'Kanya',
  'Tula',
  'Vrischika',
  'Dhanu',
  'Makara',
  'Kumbha',
  'Meena',
];

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const VARAS = [
  'Ravi',
  'Soma',
  'Mangala',
  'Budha',
  'Guru',
  'Shukra',
  'Shani',
];

const IST = 'Asia/Kolkata';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ChoghadiyaPeriod = {
  name: string;
  period: 'day' | 'night';
  effect: string;
  startLocal: string;
  endLocal: string;
  startIso: string;
  endIso: string;
};

export type ChoghadiyaResult = {
  current: ChoghadiyaPeriod | null;
  periods: ChoghadiyaPeriod[];
};

export type PanchangResult = {
  date: string;
  displayDate: string;
  weekday: string;
  vara: string;
  nakshatra: string;
  pada: number;
  tithi: string;
  tithiName: string;
  tithiNumber: number;
  paksha: string;
  yoga: string;
  karana: string;
  moonRashi: string;
  sunRashi: string;
  timezone: typeof IST;
  computedAt: string;
  source?: string;
  locationName?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  rahuKalam?: string;
  yamagandam?: string;
  gulikaKalam?: string;
  choghadiya?: ChoghadiyaResult;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

const norm = (deg: number) => {
  const value = deg % 360;
  return value < 0 ? value + 360 : value;
};

const julianDay = (date: Date) => {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    (date.getUTCHours() +
      date.getUTCMinutes() / 60 +
      date.getUTCSeconds() / 3600) /
      24;
  const a = Math.floor((14 - m) / 12);
  const year = y + 4800 - a;
  const month = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * month + 2) / 5) +
    365 * year +
    Math.floor(year / 4) -
    Math.floor(year / 100) +
    Math.floor(year / 400) -
    32045
  );
};

const formatIst = (instant: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', {timeZone: IST, ...options}).format(
    instant,
  );

const istDate = (instant: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);

const weekdayIndex = (instant: Date) => {
  const name = formatIst(instant, {weekday: 'long'});
  return Math.max(0, WEEKDAYS.indexOf(name));
};

const resolveInstant = (dateInput?: string | Date) => {
  if (typeof dateInput === 'string' && DATE_PATTERN.test(dateInput)) {
    return new Date(`${dateInput}T12:00:00+05:30`);
  }
  if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
    return dateInput;
  }
  return new Date();
};

const lahiriAyanamsa = (jd: number) => {
  const years = (jd - 2451545) / 365.25;
  return 23.85 + (50.29 / 3600) * years;
};

const tithiDetails = (tithiNumber: number) => {
  if (tithiNumber === 15) {
    return {tithiName: 'Purnima', paksha: 'Shukla'};
  }
  if (tithiNumber === 30) {
    return {tithiName: 'Amavasya', paksha: 'Krishna'};
  }
  if (tithiNumber <= 15) {
    return {tithiName: TITHIS[tithiNumber - 1], paksha: 'Shukla'};
  }
  return {tithiName: TITHIS[tithiNumber - 16], paksha: 'Krishna'};
};

const karanaName = (elongation: number) => {
  const index = Math.floor(elongation / 6) % 60;
  if (index === 0) {
    return 'Kimstughna';
  }
  if (index >= 57) {
    return FIXED_KARANAS[index - 57];
  }
  return MOVABLE_KARANAS[(index - 1) % 7];
};

export const getPanchang = (dateInput?: string | Date): PanchangResult => {
  const instant = resolveInstant(dateInput);
  const jd = julianDay(instant);
  const T = (jd - 2451545) / 36525;

  const sunMean = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const sunAnom = 357.52911 + 35999.05029 * T;
  const sunCenter =
    (1.914602 - 0.004817 * T) * Math.sin(toRad(sunAnom)) +
    0.019993 * Math.sin(toRad(2 * sunAnom));
  const sunTropical = norm(sunMean + sunCenter);

  const moonMean = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8676313 * T;
  const F = 93.272095 + 483202.0175233 * T;
  const moonTropical = norm(
    moonMean +
      6.289 * Math.sin(toRad(Mp)) +
      1.274 * Math.sin(toRad(2 * D - Mp)) +
      0.658 * Math.sin(toRad(2 * D)) +
      0.214 * Math.sin(toRad(2 * Mp)) -
      0.186 * Math.sin(toRad(M)) -
      0.114 * Math.sin(toRad(2 * F)),
  );

  const ayanamsa = lahiriAyanamsa(jd);
  const sun = norm(sunTropical - ayanamsa);
  const moon = norm(moonTropical - ayanamsa);
  const elongation = norm(moonTropical - sunTropical);
  const tithiNumber = Math.min(30, Math.floor(elongation / 12) + 1);
  const {tithiName, paksha} = tithiDetails(tithiNumber);
  const span = 360 / 27;
  const nakshatraIndex = Math.floor(moon / span) % 27;
  const pada = Math.floor((moon % span) / (span / 4)) + 1;
  const yogaIndex = Math.floor(norm(sun + moon) / span) % 27;
  const dayIndex = weekdayIndex(instant);

  return {
    date: istDate(instant),
    displayDate: formatIst(instant, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    weekday: WEEKDAYS[dayIndex],
    vara: VARAS[dayIndex],
    nakshatra: NAKSHATRAS[nakshatraIndex],
    pada,
    tithi: `${paksha} ${tithiName}`,
    tithiName,
    tithiNumber,
    paksha,
    yoga: YOGAS[yogaIndex],
    karana: karanaName(elongation),
    moonRashi: RASHIS[Math.floor(moon / 30) % 12],
    sunRashi: RASHIS[Math.floor(sun / 30) % 12],
    timezone: IST,
    computedAt: instant.toISOString(),
    source: 'local',
  };
};
