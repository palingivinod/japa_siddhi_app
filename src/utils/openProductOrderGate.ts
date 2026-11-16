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

/**
 * Any undelivered product order — blocks placing another product order
 * until admin/user marks the open one Delivered (user confirm → DELIVERED).
 */
export const findOpenProductOrder = (orders: any[] | null | undefined) => {
  const list = Array.isArray(orders) ? orders : [];
  return (
    list.find(ord => {
      if (!isProductOrderRow(ord)) {
        return false;
      }
      const status = ord?.orderStatus || ord?.order_status || ord?.status;
      return !isClosedOrderStatus(status);
    }) || null
  );
};
