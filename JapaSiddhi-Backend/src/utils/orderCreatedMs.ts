/**
 * Parse order created_at from DB into epoch ms.
 * Postgres TEXT timestamps often look like "2026-11-23 11:37:10.444859+00"
 * which JS Date rejects unless +00 is expanded to +00:00.
 */
export const parseOrderCreatedMs = (raw?: string | Date | null): number => {
  if (raw instanceof Date) {
    const ms = raw.getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  let s = String(raw || '').trim();
  if (!s) {
    return 0;
  }
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) {
      return 0;
    }
    return n < 1e12 ? n * 1000 : n;
  }
  s = s.replace(' ', 'T');
  // Only fix timezone at the end: +00 / -05 → +00:00 / -05:00
  s = s.replace(/([+-]\d{2})$/, '$1:00');
  // +0000 → +00:00
  s = s.replace(/([+-])(\d{2})(\d{2})$/, '$1$2:$3');
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : 0;
};
