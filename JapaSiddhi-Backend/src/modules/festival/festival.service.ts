import festivalRepository from './festival.repository';
import {getPanchang} from './panchang';
import {PanchangResponse} from './festival.types';
import {
  fetchProkeralaPanchang,
  isProkeralaConfigured,
} from './prokeralaPanchang';
import {
  fetchVedicOrbitPanchang,
  isVedicOrbitConfigured,
  toVedicOrbitLang,
} from './vedicOrbitPanchang';

const nextCalendarDay = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
};

const errorDetail = (error: unknown) => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const code = (error as Error & {cause?: {code?: string}}).cause?.code;
  return `${error.message}${code ? ` [${code}]` : ''}`;
};

class FestivalService {
  async getUpcomingFestivals() {
    return festivalRepository.getUpcomingFestivals();
  }

  async getTodayFestival() {
    const today = getPanchang().date;
    return festivalRepository.getFestivalOnDate(today);
  }

  async getPanchang(date?: string, lang?: string): Promise<PanchangResponse> {
    let panchang = getPanchang(date);
    const orbitLang = toVedicOrbitLang(lang);
    let loaded = false;

    if (isProkeralaConfigured()) {
      try {
        panchang = await fetchProkeralaPanchang({
          date: date || panchang.date,
          lang,
        });
        loaded = true;
      } catch (error) {
        console.error(
          '[festival] Prokerala panchang failed, trying VedicOrbit:',
          errorDetail(error),
        );
      }
    }

    if (!loaded && isVedicOrbitConfigured()) {
      try {
        panchang = await fetchVedicOrbitPanchang({
          date: date || panchang.date,
          lang: orbitLang,
          mode: 'full',
        });
        loaded = true;
      } catch (error) {
        console.error(
          '[festival] VedicOrbit panchang failed, using local fallback:',
          errorDetail(error),
        );
      }
    }

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
