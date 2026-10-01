export type ChallengeType =
  | 'JAPA_COUNT'
  | 'VOICE_JAPA'
  | 'TAP_JAPA'
  | 'STREAK'
  | 'SPECIAL';

export type RewardType =
  | 'CERTIFICATE'
  | 'RUDRAKSHA'
  | 'BANA_LINGAM'
  | 'SPIRITUAL_PRODUCT'
  | 'OTHER';

export interface CreateChallengeRequest {

  title: string;

  description?: string | null;

  challengeType: ChallengeType;

  targetValue: number;

  rewardType: RewardType;

  rewardName: string;

  rewardQuantity: number;

  startDate: Date;

  endDate: Date;

  translations?: string | Record<string, any> | null;

}

export interface JoinChallengeRequest {

  challengeId: number;

  userId: number;

}

export interface UpdateChallengeProgressRequest {

  challengeId: number;

  userId: number;

  currentValue: number;

}

export interface ChallengeResponse {

  id: number;

  title: string;

  description: string | null;

  challengeType: ChallengeType;

  targetValue: number;

  rewardType: RewardType;

  rewardName: string;

  rewardQuantity: number;

  startDate: Date;

  endDate: Date;

  isActive: boolean;

  translations?: string | null;

  createdAt: Date;

  updatedAt: Date;

}