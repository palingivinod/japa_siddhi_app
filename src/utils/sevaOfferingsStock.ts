/** Routes that support admin In/Out of Stock for seva offerings. */
export const SEVA_STOCK_ROUTES = [
  'BanaLingam',
  'RamakotiBooks',
  'HomaBhasma',
  'BiravaPendant',
] as const;

export type SevaStockRoute = (typeof SEVA_STOCK_ROUTES)[number];

export const isSevaStockRoute = (route: string): route is SevaStockRoute =>
  (SEVA_STOCK_ROUTES as readonly string[]).includes(route);

/** Map app route → backend stock key. */
export const sevaStockKeyForRoute = (route: string): string | null => {
  switch (route) {
    case 'BanaLingam':
      return 'BanaLingam';
    case 'RamakotiBooks':
      return 'RamakotiBooks';
    case 'HomaBhasma':
      return 'HomaBhasma';
    case 'BiravaPendant':
      return 'BiravaPendant';
    default:
      return null;
  }
};

export type SevaOfferingsStockMap = Record<string, {inStock?: boolean}>;

export const isSevaOfferingInStock = (
  stock: SevaOfferingsStockMap | null | undefined,
  route: string,
): boolean => {
  const key = sevaStockKeyForRoute(route);
  if (!key) {
    return true;
  }
  const row = stock?.[key];
  if (!row) {
    return true;
  }
  return row.inStock !== false;
};
