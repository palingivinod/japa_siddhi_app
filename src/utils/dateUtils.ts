export const formatDate = (
  date: Date,
): string => {
  return date.toLocaleDateString();
};

/** Calendar day in India, as YYYY-MM-DD. Not UTC. */
export const istIsoDate = (value?: Date | null) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value ?? new Date());

/** Inclusive Indian calendar days from one YYYY-MM-DD through another. */
export const inclusiveIstDays = (fromIso: string, toIso: string) => {
  const from = String(fromIso || '').slice(0, 10);
  const to = String(toIso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return 1;
  }
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return (
    Math.round(
      (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000,
    ) + 1
  );
};

export const shiftIsoDate = (iso: string, days: number) => {
  const [year, month, day] = String(iso || '').slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};