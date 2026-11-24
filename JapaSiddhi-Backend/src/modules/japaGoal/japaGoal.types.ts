export interface CreateJapaGoalRequest {

  mantraType: 'DEFAULT' | 'PERSONAL';

  mantraId?: number | null;

  personalMantraId?: number | null;

  goalName: string;

  targetCount: number;

  days: number;

  dailyTarget?: number;

  startDate: string;

  endDate?: string;

  notes?: string | null;

}


export interface JapaGoalResponse {

  id: number;

  goalName: string;

  mantraType: 'DEFAULT' | 'PERSONAL';

  mantraId: number | null;

  personalMantraId: number | null;

  mantraName: string | null;

  targetCount: number;

  completedCount: number;

  remainingCount: number;

  dailyTarget: number;

  startDate: string;

  endDate: string;

  status:
    | 'ACTIVE'
    | 'COMPLETED'
    | 'PAUSED'
    | 'CANCELLED';

}


export interface UpdateJapaGoalRequest {

  status:
    | 'ACTIVE'
    | 'PAUSED'
    | 'CANCELLED';

}

/** Raise target on the same goal row (do not create / cancel). */
export interface ExtendJapaGoalRequest {
  targetCount: number;
  days?: number;
  /** Optional new deadline (YYYY-MM-DD). Blank = keep existing deadline. */
  endDate?: string | null;
  notes?: string | null;
}

export interface ChangeJapaGoalDeadlineRequest {
  endDate: string;
}