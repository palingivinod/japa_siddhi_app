export interface CreateJapaSessionRequest {

  japaGoalId?: number;

  mantraType: 'DEFAULT' | 'PERSONAL';

  mantraId?: number | null;

  personalMantraId?: number | null;

  chantMode: 'TAP' | 'VOICE';

  sessionCount: number;

  durationSeconds?: number;

  tapValidationTime?: number;

  voiceMatchPercentage?: number;

  voiceValidated?: boolean;

  remarks?: string;

}


export interface JapaSession {

  id: number;

  userId: number;

  japaGoalId: number | null;

  mantraType: 'DEFAULT' | 'PERSONAL';

  mantraId: number | null;

  personalMantraId: number | null;

  chantMode: 'TAP' | 'VOICE';

  sessionCount: number;

  durationSeconds: number;

  tapValidationTime: number | null;

  voiceMatchPercentage: number | null;

  voiceValidated: boolean;

  createdAt: Date;

}


export interface JapaValidationResult {

  isValid: boolean;

  mode: 'TAP' | 'VOICE';

  message: string;

  sessionCount: number;

}


export interface TapChantValidation {

  expectedDurationSeconds: number;

  actualDurationSeconds: number;

  isValid: boolean;

}


export interface VoiceChantValidation {

  selectedMantra: string;

  recognizedText: string;

  matchPercentage: number;

  minimumRequiredPercentage: number;

  isValid: boolean;

}


export interface JapaSummary {

  totalJapaCount: number;

  todayJapaCount: number;

  weeklyJapaCount: number;

  monthlyJapaCount: number;

  globalJapaCount: number;

  streakDays?: number;

}


export interface JapaGoal {

  id: number;

  goalName: string;

  mantraType: 'DEFAULT' | 'PERSONAL';

  mantraId: number | null;

  personalMantraId: number | null;

  targetCount: number;

  completedCount: number;

  remainingCount: number;

  dailyTarget: number;

  status:
    | 'ACTIVE'
    | 'COMPLETED'
    | 'PAUSED'
    | 'CANCELLED';

}