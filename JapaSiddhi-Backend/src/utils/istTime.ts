/**
 * Parse admin schedule stamps as Asia/Kolkata when no timezone is present.
 * Naive values like "2026-11-19T15:25:00" mean 3:25 PM IST, not UTC.
 */
export const parseIstMillis = (value?: string | null): number => {
  const raw = String(value || '').trim();
  if (!raw) {
    return NaN;
  }
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)) {
    return Date.parse(raw);
  }
  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}T00:00:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}:00`;
  }
  return Date.parse(`${normalized}+05:30`);
};

export const nowIstMillis = () => Date.now();

/** e.g. 25 Nov 2026, 6:00 pm (IST wall clock) */
export const formatIstDateTime12h = (value?: string | null): string => {
  const ms = parseIstMillis(value);
  if (!Number.isFinite(ms)) {
    return '';
  }
  return new Date(ms).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
