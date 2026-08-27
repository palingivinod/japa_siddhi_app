import festivalRepository from './festival.repository';
import {getPanchang} from './panchang';
import {PanchangResponse} from './festival.types';

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
    const today = getPanchang().date;
    return festivalRepository.getFestivalOnDate(today);
  }

  async getPanchang(date?: string): Promise<PanchangResponse> {
    const panchang = getPanchang(date);
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
