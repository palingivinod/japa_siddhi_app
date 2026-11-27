import festivalRepository from './festival.repository';
import {getPanchang} from './panchang';
import {PanchangResponse} from './festival.types';
import {
  ensureDailyPanchang,
  istCalendarDate,
} from './panchangDailyCache';

/** Dates within about 3 years of today use the cached provider source. */
const API_WINDOW_DAYS = 3 * 366;

const dayDiffFrom = (fromIso: string, toIso: string) => {
  const toUtc = (value: string) => {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86400000);
};

const nextCalendarDay = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
};

class FestivalService {
  async getUpcomingFestivals() {
    return festivalRepository.getUpcomingFestivals();
  }

  async getTodayFestival() {
    const today = istCalendarDate();
    return festivalRepository.getFestivalOnDate(today);
  }

  /**
   * Serve panchang from the once-per-IST-day backend cache.
   * External providers are called at most once per calendar day (all users share it).
   * `lang` is ignored for provider calls — app translates terms client-side.
   */
  async getPanchang(date?: string, _lang?: string): Promise<PanchangResponse> {
    const requested = String(date || '').trim().slice(0, 10);
    const isoDate = requested || istCalendarDate();
    const today = istCalendarDate();

    // Today and dates near today: cached per date (one provider call each, then
    // stored). Dates far away use the local calculation so browsing years of
    // dates cannot use up provider credits.
    const useCachedSource =
      !requested ||
      requested === today ||
      Math.abs(dayDiffFrom(today, isoDate)) <= API_WINDOW_DAYS;
    let panchang = useCachedSource
      ? await ensureDailyPanchang(isoDate)
      : getPanchang(isoDate);

    const festival = await festivalRepository.getFestivalOnDate(panchang.date);
    const nextFrom = festival
      ? nextCalendarDay(panchang.date)
      : panchang.date;
    const nextFestival = await festivalRepository.getNextFestival(nextFrom);
    return {
      ...panchang,
      festival,
      nextFestival,
    };
  }
}

export default new FestivalService();
