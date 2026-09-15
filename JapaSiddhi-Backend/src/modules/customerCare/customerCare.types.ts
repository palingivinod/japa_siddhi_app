export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface CreateTicketRequest {
  userId: number;
  subject: string;
  message: string;
  orderService?: string;
  screenshotUrl?: string | null;
}

export interface ReplyTicketRequest {
  reply: string;
  status: TicketStatus;
}

export interface TicketResponse {
  id: number;
  userId: number;
  subject: string;
  message: string;
  screenshotUrl?: string | null;
  adminReply: string | null;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
}
