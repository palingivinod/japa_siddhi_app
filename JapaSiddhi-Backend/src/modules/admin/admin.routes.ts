import {Router, Request, Response} from 'express';

import mysql from '../../database/mysql';

const router = Router();

const num = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatDonationsLabel = (amount: number) => {
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    const fixed = lakhs >= 10 ? lakhs.toFixed(1) : lakhs.toFixed(2);
    return `₹${fixed.replace(/\.0$/, '')}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

router.get('/dashboard-stats', async (_req: Request, res: Response) => {
  try {
    const usersRows = await mysql.query<any[]>(`
      SELECT COUNT(*) AS totalUsers
      FROM users
      WHERE deleted_at IS NULL
    `);

    const japaGlobal = await mysql.query<any[]>(`
      SELECT total_japa_count AS totalJapa
      FROM global_japa_counter
      WHERE id = 1
    `);

    const japaSessions = await mysql.query<any[]>(`
      SELECT IFNULL(SUM(session_count), 0) AS totalJapa
      FROM japa_sessions
    `);

    const ordersRows = await mysql.query<any[]>(`
      SELECT COUNT(*) AS totalOrders
      FROM orders
    `);

    const donationsRows = await mysql.query<any[]>(`
      SELECT IFNULL(SUM(amount), 0) AS totalDonations
      FROM donations
      WHERE UPPER(IFNULL(payment_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
         OR UPPER(IFNULL(donation_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
    `);

    const users = num(usersRows?.[0]?.totalUsers);
    const globalJapa = num(japaGlobal?.[0]?.totalJapa);
    const sessionJapa = num(japaSessions?.[0]?.totalJapa);
    const japa = Math.max(globalJapa, sessionJapa);
    const orders = num(ordersRows?.[0]?.totalOrders);
    const donations = num(donationsRows?.[0]?.totalDonations);

    return res.json({
      success: true,
      data: {
        users,
        japa,
        orders,
        donations,
        donationsLabel: formatDonationsLabel(donations),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load admin dashboard stats.',
    });
  }
});

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    await mysql.query('SELECT 1');
    const engine = mysql.getEngineName() || 'sqlite';
    const range = String(req.query.range || '7d').toLowerCase();
    const region = String(req.query.region || 'all').toLowerCase();
    const metricRaw = String(req.query.metric || 'japa').toLowerCase();
    const metric =
      metricRaw === 'users' ||
      metricRaw === 'demographics' ||
      metricRaw === 'user'
        ? 'users'
        : metricRaw === 'donations' || metricRaw === 'donation'
          ? 'donations'
          : metricRaw === 'challenges' || metricRaw === 'challenge'
            ? 'challenges'
            : metricRaw === 'festivals' || metricRaw === 'festival'
              ? 'festivals'
              : metricRaw === 'overview'
                ? 'overview'
                : 'japa';

    const days =
      range === 'today' || range === '1d'
        ? 1
        : range === '30d' || range === 'month'
          ? 30
          : range === 'all'
            ? 180
            : 7;

    const regionFilterUsers =
      region === 'in' || region === 'india'
        ? `AND IFNULL(u.country_id, 1) = 1`
        : '';

    const regionFilterSessions =
      region === 'in' || region === 'india'
        ? `AND js.user_id IN (SELECT id FROM users WHERE IFNULL(country_id, 1) = 1 AND deleted_at IS NULL)`
        : '';

    const regionFilterUserId =
      region === 'in' || region === 'india'
        ? `AND user_id IN (SELECT id FROM users WHERE IFNULL(country_id, 1) = 1 AND deleted_at IS NULL)`
        : '';

    const regionFilterCp =
      region === 'in' || region === 'india'
        ? `AND cp.user_id IN (SELECT id FROM users WHERE IFNULL(country_id, 1) = 1 AND deleted_at IS NULL)`
        : '';

    const dateGte =
      engine === 'mysql'
        ? `DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)`
        : `date('now', '-${days - 1} days')`;
    const prevGte =
      engine === 'mysql'
        ? `DATE_SUB(CURDATE(), INTERVAL ${days * 2 - 1} DAY)`
        : `date('now', '-${days * 2 - 1} days')`;
    const prevLt =
      engine === 'mysql'
        ? `DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)`
        : `date('now', '-${days - 1} days')`;

    const donationSuccess = `
      (
        UPPER(IFNULL(payment_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
        OR UPPER(IFNULL(donation_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
      )
    `;
    const donationStamp = 'IFNULL(donated_at, created_at)';

    const totalUsersSql = `
      SELECT COUNT(*) AS total
      FROM users u
      WHERE u.deleted_at IS NULL
      ${regionFilterUsers}
    `;
    const totalUsersRows = await mysql.query<any[]>(totalUsersSql);
    const users = num(totalUsersRows?.[0]?.total);

    const bars: Array<{label: string; value: number}> = [];
    let kpi = 0;
    let prev = 0;
    let kpiLabel = 'Japa count';
    let kpiFormat: 'number' | 'currency' = 'number';

    if (metric === 'users') {
      kpiLabel = range === 'all' ? 'Total users' : 'New users';

      const usersInRangeSql =
        engine === 'mysql'
          ? `SELECT COUNT(*) AS total
             FROM users u
             WHERE u.deleted_at IS NULL
               AND u.created_at >= ${dateGte}
               ${regionFilterUsers}`
          : `SELECT COUNT(*) AS total
             FROM users u
             WHERE u.deleted_at IS NULL
               AND date(u.created_at) >= ${dateGte}
               ${regionFilterUsers}`;

      const prevUsersSql =
        engine === 'mysql'
          ? `SELECT COUNT(*) AS total
             FROM users u
             WHERE u.deleted_at IS NULL
               AND u.created_at >= ${prevGte}
               AND u.created_at < ${prevLt}
               ${regionFilterUsers}`
          : `SELECT COUNT(*) AS total
             FROM users u
             WHERE u.deleted_at IS NULL
               AND date(u.created_at) >= ${prevGte}
               AND date(u.created_at) < ${prevLt}
               ${regionFilterUsers}`;

      const [inRangeRows, prevRows] = await Promise.all([
        mysql.query<any[]>(usersInRangeSql),
        mysql.query<any[]>(prevUsersSql),
      ]);

      kpi = range === 'all' ? users : num(inRangeRows?.[0]?.total);
      prev = num(prevRows?.[0]?.total);

      const genderSql =
        engine === 'mysql'
          ? `SELECT
               CASE
                 WHEN LOWER(IFNULL(u.gender, '')) IN ('male', 'm') THEN 'Male'
                 WHEN LOWER(IFNULL(u.gender, '')) IN ('female', 'f') THEN 'Female'
                 WHEN TRIM(IFNULL(u.gender, '')) = '' THEN 'Unknown'
                 ELSE IFNULL(u.gender, 'Other')
               END AS label,
               COUNT(*) AS total
             FROM users u
             WHERE u.deleted_at IS NULL
               AND u.created_at >= ${dateGte}
               ${regionFilterUsers}
             GROUP BY label
             ORDER BY total DESC
             LIMIT 6`
          : `SELECT
               CASE
                 WHEN LOWER(IFNULL(u.gender, '')) IN ('male', 'm') THEN 'Male'
                 WHEN LOWER(IFNULL(u.gender, '')) IN ('female', 'f') THEN 'Female'
                 WHEN TRIM(IFNULL(u.gender, '')) = '' THEN 'Unknown'
                 ELSE IFNULL(u.gender, 'Other')
               END AS label,
               COUNT(*) AS total
             FROM users u
             WHERE u.deleted_at IS NULL
               AND date(u.created_at) >= ${dateGte}
               ${regionFilterUsers}
             GROUP BY label
             ORDER BY total DESC
             LIMIT 6`;

      const genderRows = await mysql.query<any[]>(genderSql);
      if (genderRows?.length) {
        genderRows.forEach((row: any) => {
          bars.push({
            label: String(row.label || 'Other').slice(0, 10),
            value: num(row.total),
          });
        });
      } else {
        const barCount = Math.min(days, 6);
        for (let i = barCount - 1; i >= 0; i -= 1) {
          const daySql =
            engine === 'mysql'
              ? `SELECT COUNT(*) AS total
                 FROM users u
                 WHERE u.deleted_at IS NULL
                   AND DATE(u.created_at) = DATE_SUB(CURDATE(), INTERVAL ${i} DAY)
                   ${regionFilterUsers}`
              : `SELECT COUNT(*) AS total
                 FROM users u
                 WHERE u.deleted_at IS NULL
                   AND date(u.created_at) = date('now', '-${i} days')
                   ${regionFilterUsers}`;
          const dayRows = await mysql.query<any[]>(daySql);
          const d = new Date();
          d.setDate(d.getDate() - i);
          bars.push({
            label: d.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            }),
            value: num(dayRows?.[0]?.total),
          });
        }
      }
    } else if (metric === 'donations') {
      kpiLabel = 'Donations ₹';
      kpiFormat = 'currency';

      const sumSql =
        engine === 'mysql'
          ? `SELECT IFNULL(SUM(amount), 0) AS total
             FROM donations
             WHERE ${donationSuccess}
               AND ${donationStamp} >= ${dateGte}
               ${regionFilterUserId}`
          : `SELECT IFNULL(SUM(amount), 0) AS total
             FROM donations
             WHERE ${donationSuccess}
               AND date(${donationStamp}) >= ${dateGte}
               ${regionFilterUserId}`;

      const prevSumSql =
        engine === 'mysql'
          ? `SELECT IFNULL(SUM(amount), 0) AS total
             FROM donations
             WHERE ${donationSuccess}
               AND ${donationStamp} >= ${prevGte}
               AND ${donationStamp} < ${prevLt}
               ${regionFilterUserId}`
          : `SELECT IFNULL(SUM(amount), 0) AS total
             FROM donations
             WHERE ${donationSuccess}
               AND date(${donationStamp}) >= ${prevGte}
               AND date(${donationStamp}) < ${prevLt}
               ${regionFilterUserId}`;

      const [sumRows, prevRows] = await Promise.all([
        mysql.query<any[]>(sumSql),
        mysql.query<any[]>(prevSumSql),
      ]);
      kpi = Math.round(num(sumRows?.[0]?.total));
      prev = Math.round(num(prevRows?.[0]?.total));

      const barCount = Math.min(days, 6);
      for (let i = barCount - 1; i >= 0; i -= 1) {
        const daySql =
          engine === 'mysql'
            ? `SELECT IFNULL(SUM(amount), 0) AS total
               FROM donations
               WHERE ${donationSuccess}
                 AND DATE(${donationStamp}) = DATE_SUB(CURDATE(), INTERVAL ${i} DAY)
                 ${regionFilterUserId}`
            : `SELECT IFNULL(SUM(amount), 0) AS total
               FROM donations
               WHERE ${donationSuccess}
                 AND date(${donationStamp}) = date('now', '-${i} days')
                 ${regionFilterUserId}`;
        const dayRows = await mysql.query<any[]>(daySql);
        const d = new Date();
        d.setDate(d.getDate() - i);
        bars.push({
          label: d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          }),
          value: Math.round(num(dayRows?.[0]?.total)),
        });
      }
    } else if (metric === 'challenges') {
      kpiLabel = 'Participants';

      const joinSql =
        engine === 'mysql'
          ? `SELECT COUNT(*) AS total
             FROM challenge_participants cp
             WHERE cp.created_at >= ${dateGte}
             ${regionFilterCp}`
          : `SELECT COUNT(*) AS total
             FROM challenge_participants cp
             WHERE date(cp.created_at) >= ${dateGte}
             ${regionFilterCp}`;

      const prevJoinSql =
        engine === 'mysql'
          ? `SELECT COUNT(*) AS total
             FROM challenge_participants cp
             WHERE cp.created_at >= ${prevGte}
               AND cp.created_at < ${prevLt}
             ${regionFilterCp}`
          : `SELECT COUNT(*) AS total
             FROM challenge_participants cp
             WHERE date(cp.created_at) >= ${prevGte}
               AND date(cp.created_at) < ${prevLt}
             ${regionFilterCp}`;

      const [joinRows, prevRows] = await Promise.all([
        mysql.query<any[]>(joinSql),
        mysql.query<any[]>(prevJoinSql),
      ]);
      kpi = num(joinRows?.[0]?.total);
      prev = num(prevRows?.[0]?.total);

      const topSql =
        engine === 'mysql'
          ? `SELECT
               IFNULL(c.title, 'Challenge') AS label,
               COUNT(cp.id) AS total
             FROM challenges c
             LEFT JOIN challenge_participants cp
               ON cp.challenge_id = c.id
              AND cp.created_at >= ${dateGte}
              ${regionFilterCp}
             GROUP BY c.id, c.title
             ORDER BY total DESC, c.id DESC
             LIMIT 6`
          : `SELECT
               IFNULL(c.title, 'Challenge') AS label,
               COUNT(cp.id) AS total
             FROM challenges c
             LEFT JOIN challenge_participants cp
               ON cp.challenge_id = c.id
              AND date(cp.created_at) >= ${dateGte}
              ${regionFilterCp}
             GROUP BY c.id, c.title
             ORDER BY total DESC, c.id DESC
             LIMIT 6`;

      const topRows = await mysql.query<any[]>(topSql);
      if (topRows?.length) {
        topRows.forEach((row: any) => {
          bars.push({
            label: String(row.label || 'Challenge').slice(0, 10),
            value: num(row.total),
          });
        });
      } else {
        const barCount = Math.min(days, 6);
        for (let i = barCount - 1; i >= 0; i -= 1) {
          const daySql =
            engine === 'mysql'
              ? `SELECT COUNT(*) AS total
                 FROM challenge_participants cp
                 WHERE DATE(cp.created_at) = DATE_SUB(CURDATE(), INTERVAL ${i} DAY)
                 ${regionFilterCp}`
              : `SELECT COUNT(*) AS total
                 FROM challenge_participants cp
                 WHERE date(cp.created_at) = date('now', '-${i} days')
                 ${regionFilterCp}`;
          const dayRows = await mysql.query<any[]>(daySql);
          const d = new Date();
          d.setDate(d.getDate() - i);
          bars.push({
            label: d.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            }),
            value: num(dayRows?.[0]?.total),
          });
        }
      }
    } else if (metric === 'festivals') {
      kpiLabel = 'Festivals';

      const festWindowSql =
        engine === 'mysql'
          ? range === 'all'
            ? `SELECT COUNT(*) AS total FROM festivals f WHERE IFNULL(f.is_active, 1) = 1`
            : `SELECT COUNT(*) AS total
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
                 AND DATE(f.festival_date) >= ${dateGte}
                 AND DATE(f.festival_date) <= DATE_ADD(CURDATE(), INTERVAL ${days - 1} DAY)`
          : range === 'all'
            ? `SELECT COUNT(*) AS total FROM festivals f WHERE IFNULL(f.is_active, 1) = 1`
            : `SELECT COUNT(*) AS total
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
                 AND date(f.festival_date) >= ${dateGte}
                 AND date(f.festival_date) <= date('now', '+${days - 1} days')`;

      const prevFestSql =
        engine === 'mysql'
          ? `SELECT COUNT(*) AS total
             FROM festivals f
             WHERE IFNULL(f.is_active, 1) = 1
               AND DATE(f.festival_date) >= ${prevGte}
               AND DATE(f.festival_date) < ${prevLt}`
          : `SELECT COUNT(*) AS total
             FROM festivals f
             WHERE IFNULL(f.is_active, 1) = 1
               AND date(f.festival_date) >= ${prevGte}
               AND date(f.festival_date) < ${prevLt}`;

      const [festRows, prevRows] = await Promise.all([
        mysql.query<any[]>(festWindowSql),
        mysql.query<any[]>(prevFestSql),
      ]);
      kpi = num(festRows?.[0]?.total);
      prev = num(prevRows?.[0]?.total);

      const listSql =
        engine === 'mysql'
          ? range === 'all'
            ? `SELECT festival_name AS label, 1 AS total, festival_date
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
               ORDER BY f.festival_date ASC
               LIMIT 6`
            : `SELECT festival_name AS label, 1 AS total, festival_date
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
                 AND DATE(f.festival_date) >= ${dateGte}
                 AND DATE(f.festival_date) <= DATE_ADD(CURDATE(), INTERVAL ${days - 1} DAY)
               ORDER BY f.festival_date ASC
               LIMIT 6`
          : range === 'all'
            ? `SELECT festival_name AS label, 1 AS total, festival_date
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
               ORDER BY date(f.festival_date) ASC
               LIMIT 6`
            : `SELECT festival_name AS label, 1 AS total, festival_date
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
                 AND date(f.festival_date) >= ${dateGte}
                 AND date(f.festival_date) <= date('now', '+${days - 1} days')
               ORDER BY date(f.festival_date) ASC
               LIMIT 6`;

      const typeSql =
        engine === 'mysql'
          ? range === 'all'
            ? `SELECT IFNULL(festival_type, 'OTHER') AS label, COUNT(*) AS total
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
               GROUP BY label
               ORDER BY total DESC
               LIMIT 6`
            : `SELECT IFNULL(festival_type, 'OTHER') AS label, COUNT(*) AS total
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
                 AND DATE(f.festival_date) >= ${dateGte}
                 AND DATE(f.festival_date) <= DATE_ADD(CURDATE(), INTERVAL ${days - 1} DAY)
               GROUP BY label
               ORDER BY total DESC
               LIMIT 6`
          : range === 'all'
            ? `SELECT IFNULL(festival_type, 'OTHER') AS label, COUNT(*) AS total
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
               GROUP BY label
               ORDER BY total DESC
               LIMIT 6`
            : `SELECT IFNULL(festival_type, 'OTHER') AS label, COUNT(*) AS total
               FROM festivals f
               WHERE IFNULL(f.is_active, 1) = 1
                 AND date(f.festival_date) >= ${dateGte}
                 AND date(f.festival_date) <= date('now', '+${days - 1} days')
               GROUP BY label
               ORDER BY total DESC
               LIMIT 6`;

      const typeRows = await mysql.query<any[]>(typeSql);
      if (typeRows?.length && typeRows.some((r: any) => num(r.total) > 0)) {
        typeRows.forEach((row: any) => {
          bars.push({
            label: String(row.label || 'Other').slice(0, 10),
            value: num(row.total),
          });
        });
      } else {
        const listRows = await mysql.query<any[]>(listSql);
        (listRows || []).forEach((row: any) => {
          bars.push({
            label: String(row.label || 'Festival').slice(0, 10),
            value: 1,
          });
        });
      }
    } else {
      // japa / overview
      kpiLabel = 'Japa count';

      const japaSql =
        engine === 'mysql'
          ? `SELECT IFNULL(SUM(js.session_count), 0) AS total
             FROM japa_sessions js
             WHERE js.created_at >= ${dateGte}
             ${regionFilterSessions}`
          : `SELECT IFNULL(SUM(js.session_count), 0) AS total
             FROM japa_sessions js
             WHERE date(js.created_at) >= ${dateGte}
             ${regionFilterSessions}`;

      const prevJapaSql =
        engine === 'mysql'
          ? `SELECT IFNULL(SUM(js.session_count), 0) AS total
             FROM japa_sessions js
             WHERE js.created_at >= ${prevGte}
               AND js.created_at < ${prevLt}
             ${regionFilterSessions}`
          : `SELECT IFNULL(SUM(js.session_count), 0) AS total
             FROM japa_sessions js
             WHERE date(js.created_at) >= ${prevGte}
               AND date(js.created_at) < ${prevLt}
             ${regionFilterSessions}`;

      const [japaRows, prevRows] = await Promise.all([
        mysql.query<any[]>(japaSql),
        mysql.query<any[]>(prevJapaSql),
      ]);
      kpi = num(japaRows?.[0]?.total);
      prev = num(prevRows?.[0]?.total);

      const barCount = Math.min(days, 6);
      for (let i = barCount - 1; i >= 0; i -= 1) {
        const daySql =
          engine === 'mysql'
            ? `SELECT IFNULL(SUM(js.session_count), 0) AS total
               FROM japa_sessions js
               WHERE DATE(js.created_at) = DATE_SUB(CURDATE(), INTERVAL ${i} DAY)
               ${regionFilterSessions}`
            : `SELECT IFNULL(SUM(js.session_count), 0) AS total
               FROM japa_sessions js
               WHERE date(js.created_at) = date('now', '-${i} days')
               ${regionFilterSessions}`;
        const dayRows = await mysql.query<any[]>(daySql);
        const d = new Date();
        d.setDate(d.getDate() - i);
        bars.push({
          label: d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          }),
          value: num(dayRows?.[0]?.total),
        });
      }
    }

    let changePercent = 0;
    if (prev > 0) {
      changePercent = Math.round(((kpi - prev) / prev) * 100);
    } else if (kpi > 0) {
      changePercent = 100;
    }

    // For total-users KPI on "all", compare new users this 7d vs prior 7d for change.
    if (metric === 'users' && range === 'all') {
      const recentSql =
        engine === 'mysql'
          ? `SELECT COUNT(*) AS total FROM users u
             WHERE u.deleted_at IS NULL
               AND u.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
               ${regionFilterUsers}`
          : `SELECT COUNT(*) AS total FROM users u
             WHERE u.deleted_at IS NULL
               AND date(u.created_at) >= date('now', '-6 days')
               ${regionFilterUsers}`;
      const priorSql =
        engine === 'mysql'
          ? `SELECT COUNT(*) AS total FROM users u
             WHERE u.deleted_at IS NULL
               AND u.created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
               AND u.created_at < DATE_SUB(CURDATE(), INTERVAL 6 DAY)
               ${regionFilterUsers}`
          : `SELECT COUNT(*) AS total FROM users u
             WHERE u.deleted_at IS NULL
               AND date(u.created_at) >= date('now', '-13 days')
               AND date(u.created_at) < date('now', '-6 days')
               ${regionFilterUsers}`;
      const [recentRows, priorRows] = await Promise.all([
        mysql.query<any[]>(recentSql),
        mysql.query<any[]>(priorSql),
      ]);
      const recent = num(recentRows?.[0]?.total);
      const prior = num(priorRows?.[0]?.total);
      if (prior > 0) {
        changePercent = Math.round(((recent - prior) / prior) * 100);
      } else if (recent > 0) {
        changePercent = 100;
      } else {
        changePercent = 0;
      }
    }

    const changeLabel =
      changePercent > 0
        ? `+${changePercent}%`
        : changePercent < 0
          ? `${changePercent}%`
          : '0%';

    return res.json({
      success: true,
      data: {
        metric,
        kpi,
        kpiLabel,
        kpiFormat,
        users,
        change: changeLabel,
        changePercent,
        range,
        region,
        bars,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load analytics.',
    });
  }
});

const mapUserRow = (row: any) => {
  const country = String(row.mobileCountryCode || '').replace(/\D/g, '');
  const mobile = String(row.mobileNumber || '').replace(/\D/g, '');
  const statusRaw = String(row.accountStatus || 'ACTIVE').toUpperCase();
  const status = statusRaw === 'BLOCKED' || statusRaw === 'SUSPENDED'
    ? 'Blocked'
    : 'Active';

  return {
    id: String(row.id),
    name: row.fullName || 'Devotee',
    email: row.email || '',
    mobile: country && mobile ? `+${country} ${mobile}` : mobile || '—',
    mobileCountryCode: country,
    mobileNumber: mobile,
    japaCount: num(row.japaCount),
    status,
    accountStatus: statusRaw,
  };
};

router.get('/users', async (_req: Request, res: Response) => {
  try {
    const rows = await mysql.query<any[]>(`
      SELECT
        u.id,
        u.full_name AS fullName,
        u.email,
        u.mobile_country_code AS mobileCountryCode,
        u.mobile_number AS mobileNumber,
        u.account_status AS accountStatus,
        IFNULL((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.user_id = u.id
        ), 0) AS japaCount
      FROM users u
      WHERE u.deleted_at IS NULL
      ORDER BY u.id DESC
    `);

    return res.json({
      success: true,
      data: (rows || []).map(mapUserRow),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load users.',
    });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({success: false, message: 'Invalid user id.'});
    }

    const rows = await mysql.query<any[]>(`
      SELECT
        u.id,
        u.full_name AS fullName,
        u.email,
        u.mobile_country_code AS mobileCountryCode,
        u.mobile_number AS mobileNumber,
        u.account_status AS accountStatus,
        IFNULL((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.user_id = u.id
        ), 0) AS japaCount
      FROM users u
      WHERE u.id = ?
        AND u.deleted_at IS NULL
      LIMIT 1
    `, [userId]);

    if (!rows?.length) {
      return res.status(404).json({success: false, message: 'User not found.'});
    }

    return res.json({
      success: true,
      data: mapUserRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load user.',
    });
  }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({success: false, message: 'Invalid user id.'});
    }

    const fullName = String(req.body?.fullName || req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const mobileCountryCode = String(
      req.body?.mobileCountryCode || '',
    ).replace(/\D/g, '');
    const mobileNumber = String(req.body?.mobileNumber || '').replace(/\D/g, '');
    const statusInput = String(req.body?.status || req.body?.accountStatus || '')
      .trim()
      .toUpperCase();

    let accountStatus: string | null = null;
    if (statusInput === 'BLOCKED' || statusInput === 'ACTIVE') {
      accountStatus = statusInput;
    } else if (statusInput === 'BLOCK') {
      accountStatus = 'BLOCKED';
    }

    if (!fullName && !email && !mobileNumber && !accountStatus) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one field to update.',
      });
    }

    const existing = await mysql.query<any[]>(`
      SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1
    `, [userId]);
    if (!existing?.length) {
      return res.status(404).json({success: false, message: 'User not found.'});
    }

    await mysql.query(
      `
      UPDATE users
      SET
        full_name = CASE WHEN ? <> '' THEN ? ELSE full_name END,
        email = CASE WHEN ? <> '' THEN ? ELSE email END,
        mobile_country_code = CASE WHEN ? <> '' THEN ? ELSE mobile_country_code END,
        mobile_number = CASE WHEN ? <> '' THEN ? ELSE mobile_number END,
        account_status = CASE WHEN ? IS NOT NULL THEN ? ELSE account_status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        fullName,
        fullName,
        email,
        email,
        mobileCountryCode,
        mobileCountryCode,
        mobileNumber,
        mobileNumber,
        accountStatus,
        accountStatus,
        userId,
      ],
    );

    const rows = await mysql.query<any[]>(`
      SELECT
        u.id,
        u.full_name AS fullName,
        u.email,
        u.mobile_country_code AS mobileCountryCode,
        u.mobile_number AS mobileNumber,
        u.account_status AS accountStatus,
        IFNULL((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.user_id = u.id
        ), 0) AS japaCount
      FROM users u
      WHERE u.id = ?
      LIMIT 1
    `, [userId]);

    return res.json({
      success: true,
      message: 'User updated successfully.',
      data: mapUserRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update user.',
    });
  }
});

const mapMantraRow = (row: any) => ({
  id: String(row.id),
  name: row.mantraName || '',
  subtitle: row.deityName || 'Community mantra',
  deityName: row.deityName || '',
  sanskritText: row.sanskritText || '',
  transliteration: row.transliteration || '',
  target: num(row.defaultJapaCount) || 108,
  active: Number(row.isActive) === 1 || row.isActive === true,
  isFeatured: Number(row.isFeatured) === 1 || row.isFeatured === true,
});

router.get('/mantras', async (_req: Request, res: Response) => {
  try {
    const mantraRepository = (await import('../mantra/mantra.repository'))
      .default;
    // Admin list matches what users can see: active mantras only.
    const rows = await mantraRepository.getActiveMantras();
    return res.json({
      success: true,
      data: (rows || []).map((row: any) =>
        mapMantraRow({...row, isActive: 1}),
      ),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load mantras.',
    });
  }
});

router.get('/mantras/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid mantra id.'});
    }
    const mantraRepository = (await import('../mantra/mantra.repository'))
      .default;
    const row = await mantraRepository.getById(id);
    if (!row) {
      return res.status(404).json({success: false, message: 'Mantra not found.'});
    }
    return res.json({success: true, data: mapMantraRow(row)});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load mantra.',
    });
  }
});

router.post('/mantras', async (req: Request, res: Response) => {
  try {
    const mantraName = String(req.body?.mantraName || req.body?.name || '').trim();
    if (!mantraName) {
      return res.status(400).json({
        success: false,
        message: 'Mantra name is required.',
      });
    }
    const mantraRepository = (await import('../mantra/mantra.repository'))
      .default;
    const created = await mantraRepository.create({
      mantraName,
      deityName: req.body?.deityName || req.body?.subtitle,
      sanskritText: req.body?.sanskritText,
      transliteration: req.body?.transliteration,
      defaultJapaCount: Number(req.body?.defaultJapaCount || req.body?.target || 10000),
      isActive: req.body?.isActive !== false && req.body?.active !== false,
      isFeatured: Boolean(req.body?.isFeatured),
    });
    return res.status(201).json({
      success: true,
      message: 'Mantra created successfully.',
      data: mapMantraRow(created),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to create mantra.',
    });
  }
});

router.put('/mantras/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid mantra id.'});
    }
    const mantraRepository = (await import('../mantra/mantra.repository'))
      .default;
    const updated = await mantraRepository.update(id, {
      mantraName: req.body?.mantraName || req.body?.name,
      deityName: req.body?.deityName || req.body?.subtitle,
      sanskritText: req.body?.sanskritText,
      transliteration: req.body?.transliteration,
      defaultJapaCount:
        req.body?.defaultJapaCount != null || req.body?.target != null
          ? Number(req.body?.defaultJapaCount ?? req.body?.target)
          : undefined,
      isActive:
        req.body?.isActive != null || req.body?.active != null
          ? Boolean(req.body?.isActive ?? req.body?.active)
          : undefined,
      isFeatured:
        req.body?.isFeatured != null ? Boolean(req.body.isFeatured) : undefined,
    });
    if (!updated) {
      return res.status(404).json({success: false, message: 'Mantra not found.'});
    }
    return res.json({
      success: true,
      message: 'Mantra updated successfully.',
      data: mapMantraRow(updated),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update mantra.',
    });
  }
});

router.delete('/mantras/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid mantra id.'});
    }
    const mantraRepository = (await import('../mantra/mantra.repository'))
      .default;
    const deleted = await mantraRepository.softDelete(id);
    if (!deleted) {
      return res.status(404).json({success: false, message: 'Mantra not found.'});
    }
    return res.json({
      success: true,
      message: 'Mantra deleted successfully.',
      data: mapMantraRow({...deleted, isActive: 0}),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to delete mantra.',
    });
  }
});

const localYmd = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Normalize admin date input to YYYY-MM-DD (accepts DD/MM/YYYY too). */
const parseChallengeDate = (raw: unknown): string | null => {
  const value = String(raw || '').trim();
  if (!value) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parts = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (parts) {
    const day = Number(parts[1]);
    const month = Number(parts[2]);
    const year = parts[3];
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return localYmd(parsed);
  }
  return null;
};

const mapChallengeRow = (row: any) => {
  const active = Number(row.isActive) === 1 || row.isActive === true;
  return {
    id: String(row.id),
    title: row.title || '',
    detail: row.description || `${Number(row.targetValue || 0).toLocaleString('en-IN')} target`,
    description: row.description || '',
    challengeType: row.challengeType || 'JAPA_COUNT',
    targetValue: Number(row.targetValue) || 0,
    rewardType: row.rewardType || 'CERTIFICATE',
    rewardName: row.rewardName || '',
    rewardQuantity: Number(row.rewardQuantity) || 1,
    startDate: parseChallengeDate(row.startDate) || row.startDate,
    endDate: parseChallengeDate(row.endDate) || row.endDate,
    status: active ? 'Active' : 'Inactive',
    active,
  };
};

router.get('/challenges', async (_req: Request, res: Response) => {
  try {
    const rows = await mysql.query<any[]>(`
      SELECT
        id,
        title,
        description,
        challenge_type AS challengeType,
        target_value AS targetValue,
        reward_type AS rewardType,
        reward_name AS rewardName,
        reward_quantity AS rewardQuantity,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive
      FROM challenges
      ORDER BY id DESC
    `);
    return res.json({
      success: true,
      data: (rows || []).map(mapChallengeRow),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load challenges.',
    });
  }
});

router.post('/challenges', async (req: Request, res: Response) => {
  try {
    const title = String(req.body?.title || req.body?.name || '').trim();
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Challenge name is required.',
      });
    }

    const targetValue = Math.max(
      1,
      Number(String(req.body?.targetValue || req.body?.target || '10000').replace(/,/g, '')) ||
        10000,
    );
    const parsedStart = parseChallengeDate(req.body?.startDate);
    const parsedEnd = parseChallengeDate(req.body?.endDate);
    if (String(req.body?.startDate || '').trim() && !parsedStart) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be YYYY-MM-DD or DD/MM/YYYY.',
      });
    }
    if (String(req.body?.endDate || '').trim() && !parsedEnd) {
      return res.status(400).json({
        success: false,
        message: 'End date must be YYYY-MM-DD or DD/MM/YYYY.',
      });
    }
    const startDate = parsedStart || localYmd();
    const endDate =
      parsedEnd ||
      localYmd(new Date(Date.now() + 30 * 86400000));
    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be on or after start date.',
      });
    }
    const description = String(req.body?.description || '').trim() || null;
    const mantraHint = String(req.body?.mantra || '').trim();
    const rewardName =
      String(req.body?.rewardName || '').trim() ||
      (mantraHint ? `${mantraHint} Certificate` : 'Certificate');

    await mysql.query(
      `
      INSERT INTO challenges (
        title,
        description,
        challenge_type,
        target_value,
        reward_type,
        reward_name,
        reward_quantity,
        start_date,
        end_date,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        title,
        description,
        String(req.body?.challengeType || 'JAPA_COUNT'),
        targetValue,
        String(req.body?.rewardType || 'CERTIFICATE'),
        rewardName,
        Number(req.body?.rewardQuantity) || 1,
        startDate,
        endDate,
      ],
    );

    const created = await mysql.query<any[]>(
      `SELECT
        id,
        title,
        description,
        challenge_type AS challengeType,
        target_value AS targetValue,
        reward_type AS rewardType,
        reward_name AS rewardName,
        reward_quantity AS rewardQuantity,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive
      FROM challenges
      ORDER BY id DESC
      LIMIT 1`,
    );

    return res.status(201).json({
      success: true,
      message: 'Challenge created successfully.',
      data: mapChallengeRow(created[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to create challenge.',
    });
  }
});

router.put('/challenges/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid challenge id.'});
    }

    const existing = await mysql.query<any[]>(`
      SELECT
        id,
        title,
        description,
        challenge_type AS challengeType,
        target_value AS targetValue,
        reward_type AS rewardType,
        reward_name AS rewardName,
        reward_quantity AS rewardQuantity,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive
      FROM challenges
      WHERE id = ?
      LIMIT 1
    `, [id]);

    if (!existing?.length) {
      return res.status(404).json({success: false, message: 'Challenge not found.'});
    }

    const current = existing[0];
    const statusRaw = String(req.body?.status || '').trim().toLowerCase();
    let isActive = Number(current.isActive) === 1 ? 1 : 0;

    if (statusRaw === 'active') {
      isActive = 1;
    } else if (statusRaw === 'inactive') {
      isActive = 0;
    } else if (req.body?.isActive !== undefined || req.body?.active !== undefined) {
      const raw = req.body?.isActive !== undefined ? req.body.isActive : req.body.active;
      isActive =
        raw === true || raw === 1 || raw === '1' || String(raw).toLowerCase() === 'true'
          ? 1
          : 0;
    }

    await mysql.query(
      `
      UPDATE challenges
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [isActive, id],
    );

    const rows = await mysql.query<any[]>(`
      SELECT
        id,
        title,
        description,
        challenge_type AS challengeType,
        target_value AS targetValue,
        reward_type AS rewardType,
        reward_name AS rewardName,
        reward_quantity AS rewardQuantity,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive
      FROM challenges
      WHERE id = ?
      LIMIT 1
    `, [id]);

    return res.json({
      success: true,
      message: 'Challenge updated successfully.',
      data: mapChallengeRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update challenge.',
    });
  }
});

router.delete('/challenges/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid challenge id.'});
    }
    await mysql.query(`DELETE FROM challenge_participants WHERE challenge_id = ?`, [id]);
    await mysql.query(`DELETE FROM challenges WHERE id = ?`, [id]);
    return res.json({
      success: true,
      message: 'Challenge deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to delete challenge.',
    });
  }
});

router.post('/notifications/send', async (req: Request, res: Response) => {
  try {
    const {sendAdminNotification} = await import('./adminNotification.service');
    const result = await sendAdminNotification({
      title: String(req.body?.title || ''),
      message: String(req.body?.message || ''),
      targetRaw: String(req.body?.target || req.body?.targetGroup || 'All users'),
      scheduleRaw: String(req.body?.schedule || 'Now'),
      scheduledAt: req.body?.scheduledAt
        ? String(req.body.scheduledAt)
        : undefined,
    });
    return res.status(result.mode === 'scheduled' ? 202 : 200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Unable to send notification.',
    });
  }
});

router.get('/annadanam-features', async (_req: Request, res: Response) => {
  try {
    const {listAnnadanamFeatures} = await import('./annadanamFeatures.service');
    const data = await listAnnadanamFeatures();
    return res.json({success: true, data});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load Annadanam features.',
    });
  }
});

router.put('/annadanam-features/:id', async (req: Request, res: Response) => {
  try {
    const {setAnnadanamFeatureActive} = await import(
      './annadanamFeatures.service'
    );
    const active =
      req.body?.active === true ||
      req.body?.active === 1 ||
      req.body?.active === '1' ||
      String(req.body?.status || '').toLowerCase() === 'active';
    const data = await setAnnadanamFeatureActive(String(req.params.id), active);
    return res.json({
      success: true,
      message: 'Annadanam feature updated.',
      data,
    });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Unable to update Annadanam feature.',
    });
  }
});

const mapHomamEnrollment = (row: any) => {
  const statusRaw = String(row.orderStatus || '').toUpperCase();
  const active = statusRaw !== 'INACTIVE' && statusRaw !== 'CANCELLED';
  const paymentRaw = String(row.paymentStatus || '').toUpperCase();
  let stage = 'Enrolled';
  if (!active) {
    stage = 'Inactive';
  } else if (paymentRaw === 'SUCCESS' || paymentRaw === 'PAID') {
    stage = 'Paid';
  }
  return {
    id: String(row.id),
    code: `NH${row.id}`,
    name: row.customerName || 'Devotee',
    stage,
    status: active ? 'Active' : 'Inactive',
    orderNumber: row.orderNumber,
    createdAt: row.createdAt,
  };
};

router.get('/homam-enrollments', async (_req: Request, res: Response) => {
  try {
    const rows = await mysql.query<any[]>(`
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.payment_status AS paymentStatus,
        o.order_status AS orderStatus,
        o.created_at AS createdAt,
        IFNULL(u.full_name, 'Devotee') AS customerName
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.order_type = 'NITHYA_HOMAM'
      ORDER BY o.id DESC
    `);
    return res.json({
      success: true,
      data: (rows || []).map(mapHomamEnrollment),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load Homam enrollments.',
    });
  }
});

router.put('/homam-enrollments/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid enrollment id.'});
    }
    const existing = await mysql.query<any[]>(`
      SELECT id FROM orders
      WHERE id = ? AND order_type = 'NITHYA_HOMAM'
      LIMIT 1
    `, [id]);
    if (!existing?.length) {
      return res.status(404).json({success: false, message: 'Enrollment not found.'});
    }

    const statusRaw = String(req.body?.status || '').toLowerCase();
    const active =
      statusRaw === 'active' ||
      req.body?.active === true ||
      req.body?.active === 1 ||
      req.body?.active === '1';
    const nextStatus = active ? 'ACTIVE' : 'INACTIVE';

    await mysql.query(
      `
      UPDATE orders
      SET order_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [nextStatus, id],
    );

    const rows = await mysql.query<any[]>(`
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.payment_status AS paymentStatus,
        o.order_status AS orderStatus,
        o.created_at AS createdAt,
        IFNULL(u.full_name, 'Devotee') AS customerName
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      LIMIT 1
    `, [id]);

    return res.json({
      success: true,
      message: 'Enrollment updated.',
      data: mapHomamEnrollment(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update enrollment.',
    });
  }
});

const toAdminBaanalingamStatus = (raw: string) => {
  const value = String(raw || '').toUpperCase();
  if (value === 'COMPLETED' || value === 'DELIVERED') {
    return 'Delivered';
  }
  if (value === 'APPROVED' || value === 'SENT') {
    return 'Sent';
  }
  return 'Pending';
};

const fromAdminBaanalingamStatus = (raw: string) => {
  const value = String(raw || '').toLowerCase();
  if (value === 'delivered') {
    return 'COMPLETED';
  }
  if (value === 'sent') {
    return 'APPROVED';
  }
  return 'PENDING';
};

const mapBaanalingamRow = (row: any) => ({
  id: String(row.id),
  code: `BP${row.id}`,
  name: row.customerName || row.fullName || 'Devotee',
  status: toAdminBaanalingamStatus(row.requestStatus),
  requestStatus: row.requestStatus,
  mobile: row.mobile || '',
  createdAt: row.createdAt,
});

router.get('/baanalingam', async (_req: Request, res: Response) => {
  try {
    const banaLingamService = (await import('../banaLingam/banaLingam.service'))
      .default;
    const rows = await banaLingamService.listAll();
    return res.json({
      success: true,
      data: (rows || []).map(mapBaanalingamRow),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load Baanalingam applications.',
    });
  }
});

router.put('/baanalingam/:id/status', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }
    const nextStatus = fromAdminBaanalingamStatus(
      String(req.body?.status || ''),
    ) as any;
    const banaLingamService = (await import('../banaLingam/banaLingam.service'))
      .default;
    await banaLingamService.updateStatus(id, nextStatus);
    const row = await banaLingamService.getById(id);
    return res.json({
      success: true,
      message: 'Baanalingam status updated.',
      data: mapBaanalingamRow({
        ...row,
        customerName: row.fullName,
      }),
    });
  } catch (error: any) {
    return res.status(error?.message?.includes('not found') ? 404 : 500).json({
      success: false,
      message: error?.message || 'Unable to update Baanalingam status.',
    });
  }
});

router.get('/banners', async (_req: Request, res: Response) => {
  try {
    const {listBanners} = await import('./banner.service');
    const data = await listBanners(false);
    return res.json({success: true, data});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load banners.',
    });
  }
});

router.post('/banners', async (req: Request, res: Response) => {
  try {
    const {createBanner} = await import('./banner.service');
    const data = await createBanner({
      title: String(req.body?.title || ''),
      subtitle: req.body?.subtitle,
      module: req.body?.module || req.body?.moduleName,
      imageUrl: req.body?.imageUrl,
      buttonText: req.body?.buttonText,
      status: req.body?.status || 'Active',
    });
    return res.status(201).json({
      success: true,
      message: 'Banner created.',
      data,
    });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Unable to create banner.',
    });
  }
});

router.put('/banners/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid banner id.'});
    }
    const {updateBanner} = await import('./banner.service');
    const data = await updateBanner(id, {
      title: req.body?.title,
      subtitle: req.body?.subtitle,
      module: req.body?.module || req.body?.moduleName,
      imageUrl: req.body?.imageUrl,
      buttonText: req.body?.buttonText,
      status: req.body?.status,
    });
    return res.json({
      success: true,
      message: 'Banner updated.',
      data,
    });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Unable to update banner.',
    });
  }
});

router.delete('/banners/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid banner id.'});
    }
    const {deleteBanner} = await import('./banner.service');
    await deleteBanner(id);
    return res.json({
      success: true,
      message: 'Banner deleted.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to delete banner.',
    });
  }
});

const toAdminOrderStatus = (raw: string) => {
  const value = String(raw || '').toUpperCase();
  if (value === 'DELIVERED') {
    return 'Delivered';
  }
  if (value === 'SHIPPED' || value === 'READY') {
    return 'Shipped';
  }
  return 'Processing';
};

const fromAdminOrderStatus = (raw: string) => {
  const value = String(raw || '').toLowerCase();
  if (value === 'delivered') {
    return 'DELIVERED';
  }
  if (value === 'shipped') {
    return 'SHIPPED';
  }
  return 'PROCESSING';
};

const mapOrderRow = (row: any) => {
  const orderNo = String(row.orderNumber || `#${row.id}`);
  return {
    id: String(row.id),
    orderNo: orderNo.startsWith('#') ? orderNo : `#${orderNo}`,
    product: row.itemName || 'Item',
    customer: row.customerName || 'Devotee',
    status: toAdminOrderStatus(row.orderStatus),
    orderStatus: row.orderStatus,
    paymentStatus: row.paymentStatus,
    quantity: Number(row.quantity) || 1,
    remarks: row.remarks || '',
    createdAt: row.createdAt,
  };
};

router.get('/orders', async (_req: Request, res: Response) => {
  try {
    const rows = await mysql.query<any[]>(`
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.item_name AS itemName,
        o.quantity,
        o.payment_status AS paymentStatus,
        o.order_status AS orderStatus,
        o.remarks,
        o.created_at AS createdAt,
        IFNULL(u.full_name, 'Devotee') AS customerName
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.id DESC
    `);
    return res.json({
      success: true,
      data: (rows || []).map(mapOrderRow),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load orders.',
    });
  }
});

router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid order id.'});
    }
    const rows = await mysql.query<any[]>(`
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.item_name AS itemName,
        o.quantity,
        o.payment_status AS paymentStatus,
        o.order_status AS orderStatus,
        o.remarks,
        o.created_at AS createdAt,
        IFNULL(u.full_name, 'Devotee') AS customerName
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      LIMIT 1
    `, [id]);
    if (!rows?.length) {
      return res.status(404).json({success: false, message: 'Order not found.'});
    }
    return res.json({
      success: true,
      data: mapOrderRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load order.',
    });
  }
});

router.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid order id.'});
    }
    const nextStatus = fromAdminOrderStatus(
      String(req.body?.status || req.body?.orderStatus || ''),
    );
    const existing = await mysql.query<any[]>(`
      SELECT id FROM orders WHERE id = ? LIMIT 1
    `, [id]);
    if (!existing?.length) {
      return res.status(404).json({success: false, message: 'Order not found.'});
    }

    await mysql.query(
      `
      UPDATE orders
      SET order_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [nextStatus, id],
    );

    const rows = await mysql.query<any[]>(`
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.item_name AS itemName,
        o.quantity,
        o.payment_status AS paymentStatus,
        o.order_status AS orderStatus,
        o.remarks,
        o.created_at AS createdAt,
        IFNULL(u.full_name, 'Devotee') AS customerName
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      LIMIT 1
    `, [id]);

    return res.json({
      success: true,
      message: 'Order status updated.',
      data: mapOrderRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update order status.',
    });
  }
});

const formatInr = (amount: number) =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`;

const buildPaymentReportRows = async () => {
  await mysql.query('SELECT 1');
  const engine = mysql.getEngineName() || 'sqlite';
  const successFilter = `
    (
      UPPER(IFNULL(payment_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
      OR UPPER(IFNULL(donation_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
    )
  `;
  const stamp = 'IFNULL(donated_at, created_at)';

  const todaySql =
    engine === 'mysql'
      ? `SELECT IFNULL(SUM(amount), 0) AS total FROM donations
         WHERE ${successFilter} AND DATE(${stamp}) = CURDATE()`
      : `SELECT IFNULL(SUM(amount), 0) AS total FROM donations
         WHERE ${successFilter} AND date(${stamp}) = date('now')`;

  const weekSql =
    engine === 'mysql'
      ? `SELECT IFNULL(SUM(amount), 0) AS total FROM donations
         WHERE ${successFilter}
           AND DATE(${stamp}) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`
      : `SELECT IFNULL(SUM(amount), 0) AS total FROM donations
         WHERE ${successFilter}
           AND date(${stamp}) >= date('now', '-6 days')`;

  const monthSql =
    engine === 'mysql'
      ? `SELECT IFNULL(SUM(amount), 0) AS total FROM donations
         WHERE ${successFilter}
           AND YEAR(${stamp}) = YEAR(CURDATE())
           AND MONTH(${stamp}) = MONTH(CURDATE())`
      : `SELECT IFNULL(SUM(amount), 0) AS total FROM donations
         WHERE ${successFilter}
           AND strftime('%Y-%m', ${stamp}) = strftime('%Y-%m', 'now')`;

  const refundSql = `
    SELECT IFNULL(SUM(amount), 0) AS total
    FROM donations
    WHERE UPPER(IFNULL(payment_status, '')) IN ('REFUNDED', 'REFUND', 'PENDING_REFUND')
       OR UPPER(IFNULL(donation_status, '')) IN ('REFUNDED', 'REFUND', 'PENDING_REFUND')
  `;

  const [todayRows, weekRows, monthRows, refundRows] = await Promise.all([
    mysql.query<any[]>(todaySql),
    mysql.query<any[]>(weekSql),
    mysql.query<any[]>(monthSql),
    mysql.query<any[]>(refundSql),
  ]);

  const today = num(todayRows?.[0]?.total);
  const week = num(weekRows?.[0]?.total);
  const month = num(monthRows?.[0]?.total);
  const refunds = num(refundRows?.[0]?.total);

  return [
    {
      id: 'today',
      label: 'Today',
      amount: formatInr(today),
      amountValue: today,
      status: today > 0 ? 'Sent' : 'Pending',
    },
    {
      id: 'week',
      label: 'This week',
      amount: formatInr(week),
      amountValue: week,
      status: week > 0 ? 'Sent' : 'Pending',
    },
    {
      id: 'month',
      label: 'This month',
      amount: formatInr(month),
      amountValue: month,
      status: month > 0 ? 'Sent' : 'Pending',
    },
    {
      id: 'refunds',
      label: 'Refunds',
      amount: formatInr(refunds),
      amountValue: refunds,
      status: refunds > 0 ? 'Pending' : 'Sent',
    },
  ];
};

router.get('/payment-reports', async (_req: Request, res: Response) => {
  try {
    const data = await buildPaymentReportRows();
    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load payment reports.',
    });
  }
});

router.get('/payment-reports/export', async (req: Request, res: Response) => {
  try {
    const ExcelJS = (await import('exceljs')).default;
    const fs = await import('fs');
    const path = await import('path');
    const {uploadsRoot} = await import('../../middleware/upload.middleware');

    const summary = await buildPaymentReportRows();
    const donations = await mysql.query<any[]>(`
      SELECT
        d.id,
        IFNULL(u.full_name, 'Devotee') AS donorName,
        d.donation_type AS donationType,
        d.amount,
        d.payment_status AS paymentStatus,
        d.donation_status AS donationStatus,
        d.payment_method AS paymentMethod,
        d.transaction_id AS transactionId,
        IFNULL(d.donated_at, d.created_at) AS donatedAt
      FROM donations d
      LEFT JOIN users u ON u.id = d.user_id
      ORDER BY d.id DESC
      LIMIT 1000
    `);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Japa Siddhi Admin';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Payment Summary');
    summarySheet.columns = [
      {header: 'Period', key: 'label', width: 18},
      {header: 'Amount', key: 'amount', width: 16},
      {header: 'Value', key: 'amountValue', width: 14},
      {header: 'Status', key: 'status', width: 12},
    ];
    summary.forEach(row => summarySheet.addRow(row));
    summarySheet.getRow(1).font = {bold: true};

    const detailSheet = workbook.addWorksheet('Donations');
    detailSheet.columns = [
      {header: 'ID', key: 'id', width: 8},
      {header: 'Donor', key: 'donorName', width: 24},
      {header: 'Type', key: 'donationType', width: 16},
      {header: 'Amount', key: 'amount', width: 12},
      {header: 'Payment Status', key: 'paymentStatus', width: 16},
      {header: 'Donation Status', key: 'donationStatus', width: 16},
      {header: 'Method', key: 'paymentMethod', width: 14},
      {header: 'Txn ID', key: 'transactionId', width: 28},
      {header: 'Donated At', key: 'donatedAt', width: 22},
    ];
    (donations || []).forEach((row: any) => detailSheet.addRow(row));
    detailSheet.getRow(1).font = {bold: true};

    const reportsDir = path.join(uploadsRoot, 'reports');
    fs.mkdirSync(reportsDir, {recursive: true});
    const fileName = `payment-reports-${Date.now()}.xlsx`;
    const filePath = path.join(reportsDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    const host = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${host}/uploads/reports/${fileName}`;

    // Also stream download for browser/direct clients.
    if (String(req.query.download || '') === '1') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`,
      );
      return res.sendFile(filePath);
    }

    return res.json({
      success: true,
      message: 'Excel report ready.',
      data: {
        fileName,
        url: downloadUrl,
        path: `/uploads/reports/${fileName}`,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64: fs.readFileSync(filePath).toString('base64'),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to export payment report.',
    });
  }
});

const mapLanguageRow = (row: any) => ({
  id: String(row.id),
  code: String(row.code || ''),
  name: String(row.name || ''),
  nativeName: String(row.nativeName || row.native_name || ''),
  active: Number(row.isActive ?? row.is_active ?? 0) === 1,
  isDefault: Number(row.isDefault ?? row.is_default ?? 0) === 1,
});

router.get('/languages', async (_req: Request, res: Response) => {
  try {
    await mysql.query('SELECT 1');
    const rows = await mysql.query<any[]>(`
      SELECT
        id,
        code,
        name,
        native_name AS nativeName,
        is_active AS isActive,
        is_default AS isDefault,
        display_order AS displayOrder
      FROM languages
      ORDER BY display_order ASC, name ASC
    `);
    return res.json({
      success: true,
      data: (rows || []).map(mapLanguageRow),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load languages.',
    });
  }
});

router.put('/languages/:id/status', async (req: Request, res: Response) => {
  try {
    await mysql.query('SELECT 1');
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({success: false, message: 'Invalid language id.'});
    }

    const activeRaw = req.body?.active;
    const active =
      activeRaw === true ||
      activeRaw === 1 ||
      String(activeRaw).toLowerCase() === 'true' ||
      String(activeRaw).toLowerCase() === 'active'
        ? 1
        : 0;

    // Keep at least one active language.
    if (active === 0) {
      const activeRows = await mysql.query<any[]>(`
        SELECT COUNT(*) AS total FROM languages WHERE is_active = 1 AND id <> ?
      `, [id]);
      if (num(activeRows?.[0]?.total) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one language must stay active.',
        });
      }
    }

    await mysql.query(
      `UPDATE languages SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [active, id],
    );

    const rows = await mysql.query<any[]>(`
      SELECT
        id, code, name, native_name AS nativeName,
        is_active AS isActive, is_default AS isDefault
      FROM languages WHERE id = ? LIMIT 1
    `, [id]);

    if (!rows?.[0]) {
      return res.status(404).json({success: false, message: 'Language not found.'});
    }

    return res.json({
      success: true,
      message: active ? 'Language activated.' : 'Language deactivated.',
      data: mapLanguageRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update language.',
    });
  }
});

router.post('/languages', async (req: Request, res: Response) => {
  try {
    await mysql.query('SELECT 1');
    const code = String(req.body?.code || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    const nativeName = String(req.body?.nativeName || name).trim();
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Language code and name are required.',
      });
    }

    const existing = await mysql.query<any[]>(`
      SELECT id FROM languages WHERE code = ? LIMIT 1
    `, [code]);
    if (existing?.[0]) {
      await mysql.query(
        `UPDATE languages SET is_active = 1, name = ?, native_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, nativeName, existing[0].id],
      );
      const rows = await mysql.query<any[]>(`
        SELECT id, code, name, native_name AS nativeName,
               is_active AS isActive, is_default AS isDefault
        FROM languages WHERE id = ? LIMIT 1
      `, [existing[0].id]);
      return res.json({
        success: true,
        message: 'Language enabled.',
        data: mapLanguageRow(rows[0]),
      });
    }

    const orderRows = await mysql.query<any[]>(`
      SELECT IFNULL(MAX(display_order), 0) + 1 AS nextOrder FROM languages
    `);
    const displayOrder = num(orderRows?.[0]?.nextOrder) || 1;

    await mysql.query(
      `INSERT INTO languages
        (code, locale, name, native_name, direction, google_translate_code, is_default, is_active, display_order)
       VALUES (?, ?, ?, ?, 'LTR', ?, 0, 1, ?)`,
      [code, `${code}-IN`, name, nativeName, code, displayOrder],
    );

    const rows = await mysql.query<any[]>(`
      SELECT id, code, name, native_name AS nativeName,
             is_active AS isActive, is_default AS isDefault
      FROM languages WHERE code = ? LIMIT 1
    `, [code]);

    return res.status(201).json({
      success: true,
      message: 'Language added.',
      data: mapLanguageRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to add language.',
    });
  }
});

const sendExcelResponse = async (
  req: Request,
  res: Response,
  workbook: any,
  filePrefix: string,
) => {
  const fs = await import('fs');
  const path = await import('path');
  const {uploadsRoot} = await import('../../middleware/upload.middleware');

  const reportsDir = path.join(uploadsRoot, 'reports');
  fs.mkdirSync(reportsDir, {recursive: true});
  const fileName = `${filePrefix}-${Date.now()}.xlsx`;
  const filePath = path.join(reportsDir, fileName);
  await workbook.xlsx.writeFile(filePath);

  const host = `${req.protocol}://${req.get('host')}`;
  const downloadUrl = `${host}/uploads/reports/${fileName}`;

  if (String(req.query.download || '') === '1') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.sendFile(filePath);
  }

  return res.json({
    success: true,
    message: 'Excel report ready.',
    data: {
      fileName,
      url: downloadUrl,
      path: `/uploads/reports/${fileName}`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: fs.readFileSync(filePath).toString('base64'),
    },
  });
};

router.get('/reports/export', async (req: Request, res: Response) => {
  try {
    await mysql.query('SELECT 1');
    const ExcelJS = (await import('exceljs')).default;
    const type = String(req.query.type || 'all').toLowerCase();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Japa Siddhi Admin';
    workbook.created = new Date();

    const addUsers = async () => {
      const rows = await mysql.query<any[]>(`
        SELECT
          u.id,
          u.full_name AS fullName,
          u.email,
          u.mobile_country_code AS mobileCountryCode,
          u.mobile_number AS mobileNumber,
          u.gender,
          u.account_status AS accountStatus,
          u.created_at AS createdAt
        FROM users u
        WHERE u.deleted_at IS NULL
        ORDER BY u.id DESC
        LIMIT 5000
      `);
      const sheet = workbook.addWorksheet('Users');
      sheet.columns = [
        {header: 'ID', key: 'id', width: 8},
        {header: 'Name', key: 'fullName', width: 24},
        {header: 'Email', key: 'email', width: 28},
        {header: 'Country Code', key: 'mobileCountryCode', width: 12},
        {header: 'Mobile', key: 'mobileNumber', width: 16},
        {header: 'Gender', key: 'gender', width: 14},
        {header: 'Status', key: 'accountStatus', width: 12},
        {header: 'Created At', key: 'createdAt', width: 22},
      ];
      (rows || []).forEach((row: any) => sheet.addRow(row));
      sheet.getRow(1).font = {bold: true};
    };

    const addJapa = async () => {
      const rows = await mysql.query<any[]>(`
        SELECT
          js.id,
          IFNULL(u.full_name, 'Devotee') AS userName,
          js.mantra_type AS mantraType,
          js.session_count AS sessionCount,
          js.chant_mode AS chantMode,
          js.duration_seconds AS durationSeconds,
          js.created_at AS createdAt
        FROM japa_sessions js
        LEFT JOIN users u ON u.id = js.user_id
        ORDER BY js.id DESC
        LIMIT 5000
      `);
      const sheet = workbook.addWorksheet('Japa');
      sheet.columns = [
        {header: 'ID', key: 'id', width: 8},
        {header: 'User', key: 'userName', width: 24},
        {header: 'Mantra Type', key: 'mantraType', width: 16},
        {header: 'Count', key: 'sessionCount', width: 10},
        {header: 'Mode', key: 'chantMode', width: 12},
        {header: 'Duration (s)', key: 'durationSeconds', width: 12},
        {header: 'Created At', key: 'createdAt', width: 22},
      ];
      (rows || []).forEach((row: any) => sheet.addRow(row));
      sheet.getRow(1).font = {bold: true};
    };

    const addChallenges = async () => {
      const rows = await mysql.query<any[]>(`
        SELECT
          c.id,
          c.title,
          c.challenge_type AS challengeType,
          c.target_value AS targetValue,
          c.start_date AS startDate,
          c.end_date AS endDate,
          c.is_active AS isActive,
          (SELECT COUNT(*) FROM challenge_participants cp WHERE cp.challenge_id = c.id) AS participants,
          (SELECT COUNT(*) FROM challenge_participants cp WHERE cp.challenge_id = c.id AND cp.is_completed = 1) AS completed
        FROM challenges c
        ORDER BY c.id DESC
        LIMIT 2000
      `);
      const sheet = workbook.addWorksheet('Challenges');
      sheet.columns = [
        {header: 'ID', key: 'id', width: 8},
        {header: 'Title', key: 'title', width: 28},
        {header: 'Type', key: 'challengeType', width: 16},
        {header: 'Target', key: 'targetValue', width: 10},
        {header: 'Start', key: 'startDate', width: 14},
        {header: 'End', key: 'endDate', width: 14},
        {header: 'Active', key: 'isActive', width: 10},
        {header: 'Participants', key: 'participants', width: 14},
        {header: 'Completed', key: 'completed', width: 12},
      ];
      (rows || []).forEach((row: any) => sheet.addRow(row));
      sheet.getRow(1).font = {bold: true};
    };

    const addDonations = async () => {
      const rows = await mysql.query<any[]>(`
        SELECT
          d.id,
          IFNULL(u.full_name, 'Devotee') AS donorName,
          d.donation_type AS donationType,
          d.amount,
          d.payment_status AS paymentStatus,
          d.donation_status AS donationStatus,
          d.payment_method AS paymentMethod,
          d.transaction_id AS transactionId,
          IFNULL(d.donated_at, d.created_at) AS donatedAt
        FROM donations d
        LEFT JOIN users u ON u.id = d.user_id
        ORDER BY d.id DESC
        LIMIT 5000
      `);
      const sheet = workbook.addWorksheet('Donations');
      sheet.columns = [
        {header: 'ID', key: 'id', width: 8},
        {header: 'Donor', key: 'donorName', width: 24},
        {header: 'Type', key: 'donationType', width: 16},
        {header: 'Amount', key: 'amount', width: 12},
        {header: 'Payment Status', key: 'paymentStatus', width: 16},
        {header: 'Donation Status', key: 'donationStatus', width: 16},
        {header: 'Method', key: 'paymentMethod', width: 14},
        {header: 'Txn ID', key: 'transactionId', width: 28},
        {header: 'Donated At', key: 'donatedAt', width: 22},
      ];
      (rows || []).forEach((row: any) => sheet.addRow(row));
      sheet.getRow(1).font = {bold: true};
    };

    const addOrders = async () => {
      const rows = await mysql.query<any[]>(`
        SELECT
          o.id,
          o.order_number AS orderNumber,
          IFNULL(u.full_name, 'Devotee') AS userName,
          o.order_type AS orderType,
          o.item_name AS itemName,
          o.quantity,
          o.order_status AS orderStatus,
          o.payment_status AS paymentStatus,
          o.created_at AS createdAt
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.id DESC
        LIMIT 5000
      `);
      const sheet = workbook.addWorksheet('Orders');
      sheet.columns = [
        {header: 'ID', key: 'id', width: 8},
        {header: 'Order No', key: 'orderNumber', width: 18},
        {header: 'User', key: 'userName', width: 24},
        {header: 'Type', key: 'orderType', width: 18},
        {header: 'Item', key: 'itemName', width: 24},
        {header: 'Qty', key: 'quantity', width: 8},
        {header: 'Order Status', key: 'orderStatus', width: 14},
        {header: 'Payment Status', key: 'paymentStatus', width: 16},
        {header: 'Created At', key: 'createdAt', width: 22},
      ];
      (rows || []).forEach((row: any) => sheet.addRow(row));
      sheet.getRow(1).font = {bold: true};
    };

    if (type === 'users' || type === 'user') {
      await addUsers();
    } else if (type === 'japa') {
      await addJapa();
    } else if (type === 'challenges' || type === 'challenge') {
      await addChallenges();
    } else if (type === 'donations' || type === 'donation') {
      await addDonations();
    } else if (type === 'orders' || type === 'order') {
      await addOrders();
    } else {
      await addUsers();
      await addJapa();
      await addChallenges();
      await addDonations();
      await addOrders();
    }

    if (workbook.worksheets.length === 0) {
      workbook.addWorksheet('Empty').addRow(['No data']);
    }

    return sendExcelResponse(req, res, workbook, `report-${type}`);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to export report.',
    });
  }
});

export default router;
