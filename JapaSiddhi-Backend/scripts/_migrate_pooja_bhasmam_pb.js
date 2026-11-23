/**
 * One-shot: renumber mis-prefixed Pooja Bhasmam orders from BL-#### → PB##.
 * Homa Bhasmam (HB) is left unchanged.
 */
require('dotenv').config({path: require('path').join(__dirname, '..', '.env')});
const {Pool} = require('pg');

const cs =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  [
    'postgresql://japasiddhi_database_user:',
    '8FBnzCgO8zLxC66riAkgljsGYEmB8WJ8',
    '@dpg-dbea8n9srm7s73bfn8cg-a.ohio-postgres.render.com/japasiddhi_database',
  ].join('');

const pool = new Pool({
  connectionString: cs,
  ssl: {rejectUnauthorized: false},
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const maxPb = await client.query(
      `
      SELECT order_number
      FROM orders
      WHERE upper(order_number) ~ '^(PB|GM)[0-9]+'
      ORDER BY id DESC
      LIMIT 500
      `,
    );
    let maxSeq = 0;
    for (const row of maxPb.rows) {
      const m = String(row.order_number || '').match(/^(?:PB|GM)(\d+)/i);
      if (m) {
        maxSeq = Math.max(maxSeq, parseInt(m[1], 10) || 0);
      }
    }

    const bad = await client.query(
      `
      SELECT id, order_number, order_type, item_name
      FROM orders
      WHERE (
        upper(COALESCE(order_type::text, '')) = 'GOU_MAYA_BHASMA'
        OR lower(COALESCE(item_name, '')) LIKE '%pooja%bhasma%'
        OR lower(COALESCE(item_name, '')) LIKE '%gou%maya%'
      )
      AND upper(COALESCE(order_number, '')) LIKE 'BL-%'
      ORDER BY id ASC
      `,
    );

    console.log(`Found ${bad.rows.length} Pooja Bhasmam rows with BL- prefix`);
    console.log(`Current max PB/GM seq: ${maxSeq}`);

    let next = maxSeq;
    for (const row of bad.rows) {
      next += 1;
      const newNum = `PB${String(next).padStart(2, '0')}`;
      await client.query(
        `UPDATE orders SET order_number = $1 WHERE id = $2`,
        [newNum, row.id],
      );
      console.log(`  #${row.id} ${row.order_number} → ${newNum} (${row.item_name})`);
    }

    // Also fix Siva Koti that fell through to BL-
    const skBad = await client.query(
      `
      SELECT id, order_number, order_type, item_name
      FROM orders
      WHERE (
        upper(COALESCE(order_type::text, '')) = 'SHIVAKOTI_BOOKS'
        OR lower(COALESCE(item_name, '')) LIKE '%shivakoti%'
        OR lower(COALESCE(item_name, '')) LIKE '%siva koti%'
        OR lower(COALESCE(item_name, '')) LIKE '%sivakoti%'
      )
      AND upper(COALESCE(order_number, '')) LIKE 'BL-%'
      ORDER BY id ASC
      `,
    );
    const maxSk = await client.query(
      `
      SELECT order_number FROM orders
      WHERE upper(order_number) LIKE 'SK%'
      ORDER BY id DESC LIMIT 200
      `,
    );
    let skSeq = 0;
    for (const row of maxSk.rows) {
      const m = String(row.order_number || '').match(/^SK(\d+)/i);
      if (m) skSeq = Math.max(skSeq, parseInt(m[1], 10) || 0);
    }
    console.log(`Found ${skBad.rows.length} Siva Koti rows with BL- prefix`);
    for (const row of skBad.rows) {
      skSeq += 1;
      const newNum = `SK${String(skSeq).padStart(2, '0')}`;
      await client.query(
        `UPDATE orders SET order_number = $1 WHERE id = $2`,
        [newNum, row.id],
      );
      console.log(`  #${row.id} ${row.order_number} → ${newNum} (${row.item_name})`);
    }

    // Sanity: Homa should already be HB
    const homa = await client.query(
      `
      SELECT count(*)::int AS n,
        count(*) FILTER (WHERE upper(COALESCE(order_number,'')) LIKE 'HB%')::int AS hb,
        count(*) FILTER (WHERE upper(COALESCE(order_number,'')) LIKE 'BL-%')::int AS bl
      FROM orders
      WHERE upper(COALESCE(order_type::text,'')) = 'HOMA_BHASMA'
         OR (
           lower(COALESCE(item_name,'')) LIKE '%homa%'
           AND lower(COALESCE(item_name,'')) LIKE '%bhasma%'
           AND lower(COALESCE(item_name,'')) NOT LIKE '%pooja%'
         )
      `,
    );
    console.log('Homa Bhasmam counts:', homa.rows[0]);

    await client.query('COMMIT');
    console.log('DONE');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('FAILED', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
