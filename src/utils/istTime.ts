/** Parse admin schedule stamps as Asia/Kolkata when timezone is missing. */
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

/** e.g. 19 Nov 2026, 3:25 pm */
export const formatIstDateTime12h = (value?: string | null): string => {
  const ms = parseIstMillis(value);
  if (!Number.isFinite(ms)) {
    return String(value || '')
      .slice(0, 16)
      .replace('T', ' ');
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

export const formatIstDate = (value?: string | null): string => {
  const ms = parseIstMillis(value);
  if (!Number.isFinite(ms)) {
    return String(value || '').slice(0, 10);
  }
  return new Date(ms).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const isNotStartedYet = (startsAt?: string | null): boolean => {
  const ms = parseIstMillis(startsAt);
  return Number.isFinite(ms) && ms > 0 && ms > Date.now();
};

export const isDeadlinePassed = (deadlineAt?: string | null): boolean => {
  const ms = parseIstMillis(deadlineAt);
  return Number.isFinite(ms) && ms > 0 && ms < Date.now();
};
