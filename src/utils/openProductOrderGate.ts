/** Product-order statuses that no longer block new orders. */
export const isClosedOrderStatus = (raw?: string | null) => {
  const status = String(raw || '')
    .toUpperCase()
    .replace(/[-\s]/g, '_');
  return (
    status === 'DELIVERED' ||
    status === 'CANCELLED' ||
    status === 'CANCELED'
  );
};

/** Homam / Annadanam are sevas, not product fulfillment orders. */
export const isProductOrderRow = (ord: any) => {
  const type = String(ord?.orderType || ord?.order_type || '').toUpperCase();
  return type !== 'NITHYA_HOMAM' && type !== 'ANNADANAM';
};

export const isSoftDeletedOrder = (ord: any) =>
  Boolean(Number(ord?.deletedByUser ?? ord?.deleted_by_user ?? 0));

/** Normalize GET /orders payload shapes. */
export const ordersFromApiResponse = (ordersRes: any): any[] => {
  const raw = ordersRes?.data?.data ?? ordersRes?.data ?? ordersRes;
  return Array.isArray(raw) ? raw : [];
};

/**
 * Any undelivered product order — blocks placing another product order
 * until the open one is Delivered (or cancelled). Soft-deleted rows are ignored
 * here (delete is only allowed after deliver/cancel).
 */
export const findOpenProductOrder = (orders: any[] | null | undefined) => {
  const list = Array.isArray(orders) ? orders : [];
  return (
    list.find(ord => {
      if (isSoftDeletedOrder(ord)) {
        return false;
      }
      if (!isProductOrderRow(ord)) {
        return false;
      }
      const status = ord?.orderStatus || ord?.order_status || ord?.status;
      return !isClosedOrderStatus(status);
    }) || null
  );
};
