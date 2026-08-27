export type OrderType =
  | 'BANA_LINGAM'
  | 'SPIRITUAL_PRODUCT'
  | 'ANNADANAM'
  | 'NITHYA_HOMAM';

export type OrderSource =
  | 'PURCHASE'
  | 'CHALLENGE'
  | 'ADMIN_GIFT';

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface CreateOrderRequest {

  userId: number;

  orderType: OrderType;

  orderSource: OrderSource;

  itemName: string;

  quantity: number;

  paymentId?: number | null;

  remarks?: string | null;

}

export interface UpdateOrderStatusRequest {

  orderStatus: OrderStatus;

}

export interface UpdatePaymentStatusRequest {

  paymentStatus: PaymentStatus;

}

export interface OrderResponse {

  id: number;

  userId: number;

  orderNumber: string;

  orderType: OrderType;

  orderSource: OrderSource;

  itemName: string;

  quantity: number;

  paymentId: number | null;

  paymentStatus: PaymentStatus;

  orderStatus: OrderStatus;

  remarks: string | null;

  createdAt: Date;

  updatedAt: Date;

}