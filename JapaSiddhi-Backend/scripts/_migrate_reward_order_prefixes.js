/**
 * Re-number milestone/challenge reward orders from shared RW##### to
 * type-specific prefixes (BL, MS, MSC, RM, … / name-derived).
 */
require('dotenv').config({path: require('path').join(__dirname, '..', '.env')});
const {Pool} = require('pg');
const path = require('path');

// Mirror rewardOrderPrefix.ts (plain JS for one-shot script).
const STOP = new Set([
  'A','AN','THE','OF','AND','OR','FOR','WITH','FROM','IN','ON','TO','BY',
]);
const RESERVED = new Set([
  'BL','RK','HB','BP','PB','SK','GM','MSC','MS','RM','TM','PM','SW','KM','SM','GA','YA','RW','NH','AD',
]);
const lettersOnly = v => String(v || '').toUpperCase().replace(/[^A-Z]/g, '');
const codeFromRewardName = rewardName => {
  const words = String(rewardName || '')
    .replace(/[()[\],./\\-]+/g, ' ')
    .split(/\s+/)
    .map(lettersOnly)
    .filter(w => w.length > 0 && !STOP.has(w));
  let code = words.map(w => w[0]).join('').slice(0, 3);
  if (code.length < 2) {
    const compact = lettersOnly(rewardName);
    code = (code + compact).slice(0, 3);
  }
  if (code.length < 2) code = (code + 'RW').slice(0, 2);
  if (RESERVED.has(code) || RESERVED.has(code.slice(0, 2))) {
    const compact = lettersOnly(rewardName);
    const alt = `${code[0] || 'R'}${compact.slice(1, 3) || 'X'}`.slice(0, 3);
    if (alt.length >= 2 && !RESERVED.has(alt) && !RESERVED.has(alt.slice(0, 2))) return alt;
    return `R${code.slice(0, 2)}`.slice(0, 3);
  }
  return code;
};
const rewardOrderPrefix = rewardName => {
  const lower = String(rewardName || '').trim().toLowerCase();
  if (!lower) return 'RW';
  if (
    lower.includes('baanalingam') ||
    lower.includes('banalingam') ||
    lower.includes('bana lingam') ||
    (lower.includes('narmada') && lower.includes('ling'))
  ) {
    return 'BL';
  }
  const isSreeChakra =
    lower.includes('sree chakra') ||
    lower.includes('sri chakra') ||
    lower.includes('sri chakram') ||
    lower.includes('sri yantra') ||
    lower.includes('maha meru') ||
    (lower.includes('yantra') && !lower.includes('shiv'));
  if (
    isSreeChakra ||
    ((lower.includes('marakata') || lower.includes('marakatha')) &&
      (lower.includes('chakra') || lower.includes('jade')))
  ) {
    return 'MSC';
  }
  if (
    ((lower.includes('marakata') || lower.includes('marakatha')) &&
      (lower.includes('shiv') || lower.includes('ling'))) ||
    (lower.includes('aventurine') &&
      (lower.includes('shiv') || lower.includes('ling')))
  ) {
    return 'MS';
  }
  if (lower.includes('rudraksh')) return 'RM';
  if (lower.includes('tulasi') || lower.includes('tulsi')) return 'TM';
  if (lower.includes('pasupu') || lower.includes('turmeric') || lower.includes('haldi')) return 'PM';
  if (lower.includes('sandal') || lower.includes('chandan') || lower.includes('chandana')) return 'SW';
  if (lower.includes('karungali') || lower.includes('ebony')) return 'KM';
  if (lower.includes('spatik') || lower.includes('sphatik') || lower.includes('crystal')) return 'SM';
  if (lower.includes('green agate') || lower.includes('green hakik')) return 'GA';
  if (lower.includes('yellow agate') || lower.includes('yellow hakik')) return 'YA';
  if (
    lower === 'spiritual reward' ||
    lower.includes('spiritual offering') ||
    lower.includes('spiritual product')
  ) {
    return 'RW';
  }
  return codeFromRewardName(rewardName);
};

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

    const rows = await client.query(
      `
      SELECT id, order_number, item_name, order_source, remarks
      FROM orders
      WHERE (
        upper(COALESCE(order_source::text, '')) IN ('MILESTONE', 'CHALLENGE')
        OR upper(COALESCE(order_number, '')) LIKE 'RW%'
        OR lower(COALESCE(remarks, '')) LIKE '%reward%'
      )
      AND upper(COALESCE(order_number, '')) LIKE 'RW%'
      ORDER BY id ASC
      `,
    );

    console.log(`Found ${rows.rows.length} RW reward-style orders`);

    /** @type {Record<string, number>} */
    const seqByPrefix = {};

    // Seed sequences from existing non-RW numbers already using these prefixes.
    const existing = await client.query(
      `
      SELECT order_number FROM orders
      WHERE upper(COALESCE(order_number,'')) ~ '^[A-Z]{2,4}[0-9]+$'
      `,
    );
    for (const row of existing.rows) {
      const m = String(row.order_number || '').match(/^([A-Z]{2,4})(\d+)$/i);
      if (!m) continue;
      const p = m[1].toUpperCase();
      const n = parseInt(m[2], 10) || 0;
      seqByPrefix[p] = Math.max(seqByPrefix[p] || 0, n);
    }
    // BL- uses hyphen form — seed from those too for Narmada reward renames to BL-.
    const blRows = await client.query(
      `SELECT order_number FROM orders WHERE upper(COALESCE(order_number,'')) LIKE 'BL-%'`,
    );
    let blMax = 0;
    for (const row of blRows.rows) {
      const m = String(row.order_number || '').match(/^BL-(\d+)/i);
      if (m) blMax = Math.max(blMax, parseInt(m[1], 10) || 0);
    }

    for (const row of rows.rows) {
      const name = String(row.item_name || '').trim() || 'Spiritual Reward';
      const prefix = rewardOrderPrefix(name);
      let newNum;
      if (prefix === 'BL') {
        blMax += 1;
        newNum = `BL-${String(blMax).padStart(4, '0')}`;
      } else {
        seqByPrefix[prefix] = (seqByPrefix[prefix] || 0) + 1;
        newNum = `${prefix}${String(seqByPrefix[prefix]).padStart(2, '0')}`;
      }
      await client.query(`UPDATE orders SET order_number = $1 WHERE id = $2`, [
        newNum,
        row.id,
      ]);
      // Keep claim table in sync when present.
      await client.query(
        `UPDATE milestone_reward_claims SET order_number = $1 WHERE order_id = $2`,
        [newNum, row.id],
      ).catch(() => {});
      console.log(`  #${row.id} ${row.order_number} → ${newNum} (${name})`);
    }

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
