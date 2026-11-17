import festivalRepository from './festival.repository';
import {getPanchang} from './panchang';
import {PanchangResponse} from './festival.types';
import {
  ensureDailyPanchang,
  istCalendarDate,
} from './panchangDailyCache';

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

    // Today (or explicit today): shared daily cache. Other dates: local calc only
    // so we never burn provider quota browsing other days.
    let panchang =
      !requested || requested === today
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
