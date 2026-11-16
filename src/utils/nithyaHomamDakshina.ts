import {istIsoDate} from './dateUtils';

/** Full monthly dakshina outside the one-month tiered promo. */
export const NITHYA_HOMAM_FULL_DAKSHINA = 500;

/**
 * Tiered dakshina applies only during this IST calendar month.
 * From the next month onward, always ₹500.
 */
export const NITHYA_HOMAM_TIERED_YEAR_MONTH = '2026-11';

const istParts = (value?: Date | null) => {
  const iso = istIsoDate(value);
  const [year, month, day] = iso.split('-').map(Number);
  return {
    iso,
    yearMonth: `${year}-${String(month).padStart(2, '0')}`,
    day,
  };
};

export const isNithyaHomamTieredMonth = (value?: Date | null) =>
  istParts(value).yearMonth === NITHYA_HOMAM_TIERED_YEAR_MONTH;

/**
 * Dakshina in ₹ based on IST enrollment date.
 * Promo month only: 1–10 → 500, 11–20 → 300, 21+ → 200.
 * After that month → always 500.
 */
export const getNithyaHomamDakshina = (value?: Date | null) => {
  const {yearMonth, day} = istParts(value);
  if (yearMonth !== NITHYA_HOMAM_TIERED_YEAR_MONTH) {
    return NITHYA_HOMAM_FULL_DAKSHINA;
  }
  if (day <= 10) {
    return 500;
  }
  if (day <= 20) {
    return 300;
  }
  return 200;
};
