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

  adminReply: string | null;

  status: TicketStatus;

  createdAt: Date;

  updatedAt: Date;

}
