import {PanchangResult} from './panchang';

export interface FestivalResponse {
  id: number;
  festivalName: string;
  description: string | null;
  festivalDate: string;
  festivalType: 'HINDU' | 'BIRTHDAY' | 'ANNIVERSARY' | 'SPECIAL';
  isPublicHoliday: boolean;
}

export interface FestivalSummary {
  id: number;
  festivalName: string;
  description: string | null;
  festivalDate: string;
  festivalType: string;
}

export interface PanchangResponse extends PanchangResult {
  festival: FestivalSummary | null;
  nextFestival: FestivalSummary | null;
}