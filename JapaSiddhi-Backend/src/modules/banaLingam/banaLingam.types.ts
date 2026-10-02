export type BanaLingamRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export interface CreateBanaLingamRequest {

  userId: number;

  orderId?: number | null;

  orderNumber?: string | null;

  fullName: string;

  mobile: string;

  email?: string | null;

  address: string;

  cityId: number;

  stateId: number;

  countryId: number;

  postalCode: string;

  gothram?: string | null;

  nakshatram?: string | null;

  quantity: number;

  remarks?: string | null;

}

export interface UpdateBanaLingamStatusRequest {

  requestStatus: BanaLingamRequestStatus;

  remarks?: string | null;

}

export interface BanaLingamResponse {

  id: number;

  userId: number;

  orderId: number | null;

  fullName: string;

  mobile: string;

  email: string | null;

  address: string;

  cityId: number;

  stateId: number;

  countryId: number;

  postalCode: string;

  gothram: string | null;

  nakshatram: string | null;

  quantity: number;

  requestStatus: BanaLingamRequestStatus;

  remarks: string | null;

  createdAt: Date;

  updatedAt: Date;

}