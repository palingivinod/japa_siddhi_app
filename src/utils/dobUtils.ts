export const formatDobDisplay = (iso: string): string => {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};

export const parseDob = (raw: string): string | null => {
  const text = String(raw || '').trim();
  const dmy = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const day = Number(dmy?.[1] || iso?.[3] || 0);
  const month = Number(dmy?.[2] || iso?.[2] || 0);
  const year = Number(dmy?.[3] || iso?.[1] || 0);
  if (!dmy && !iso) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > new Date()
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const maskDob = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};
