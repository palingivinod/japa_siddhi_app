import mysql from '../database/mysql';

const DEMO_EMAIL = 'devotee@japasiddhi.com';
const DEMO_NAME = 'demo devotee';

/**
 * Safe filter for admin reports only — never used to DELETE accounts.
 * Only hides the classic seed Demo Devotee row.
 */
export const demoUserSql = (alias = 'u') => {
  const p = alias ? `${alias}.` : '';
  return `
    AND NOT (
      lower(IFNULL(${p}full_name, '')) = '${DEMO_NAME}'
      AND lower(IFNULL(${p}email, '')) = '${DEMO_EMAIL}'
    )
  `;
};

/**
 * Admin donation lists count app payments only.
 * Older in-app UPI rows are kept. Razorpay rows copied from the shared
 * account are shown only when the order was started in the app.
 */
export const demoDonationSql = (alias = 'd') => {
  const method = `UPPER(IFNULL(${alias}.payment_method, ''))`;
  const remarks = `IFNULL(${alias}.remarks, '')`;
  return `
    AND IFNULL(${alias}.transaction_id, '') NOT LIKE 'TXN-DEMO-%'
    AND (
      ${method} <> 'RAZORPAY'
      OR ${remarks} LIKE '%Source: app%'
    )
  `;
};

/**
 * Never hard-delete real users.
 * Only soft-deletes the exact seeded Demo Devotee + removes TXN-DEMO donation rows.
 */
export const purgeDemoData = async () => {
  try {
    await mysql.query('SELECT 1');

    await mysql.query(
      `DELETE FROM donations WHERE IFNULL(transaction_id, '') LIKE 'TXN-DEMO-%'`,
    );

    const seedByIdentity = await mysql.query<Array<{id: number}>>(
      `
      SELECT id FROM users
      WHERE lower(IFNULL(full_name, '')) = ?
        AND lower(IFNULL(email, '')) = ?
        AND REPLACE(REPLACE(IFNULL(mobile_number, ''), '+', ''), ' ', '') = '9999999999'
      `,
      [DEMO_NAME, DEMO_EMAIL],
    );

    const ids = Array.from(
      new Set(
        (seedByIdentity || [])
          .map(row => Number(row.id))
          .filter(Boolean),
      ),
    );

    if (!ids.length) {
      console.log('Demo seed cleanup: no Demo Devotee seed row found.');
      return;
    }

    for (const id of ids) {
      await mysql.query(
        `
        UPDATE users
        SET
          deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
          email = ?,
          mobile_number = ?,
          firebase_uid = ?,
          firebase_token = NULL
        WHERE id = ?
        `,
        [
          `deleted_${id}_${DEMO_EMAIL}`,
          `deleted_${id}_9999999999`,
          `deleted-uid-${id}`,
          id,
        ],
      );
    }

    console.log(
      `Demo seed cleanup: soft-deleted ${ids.length} Demo Devotee seed row(s). Real users untouched.`,
    );
  } catch (error) {
    console.warn('Demo seed cleanup skipped:', error);
  }
};
