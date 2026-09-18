import {Router, Request, Response} from 'express';
import rateLimit from 'express-rate-limit';

import mysql from '../../database/mysql';
import adminAccountService from './adminAccount.service';
import {demoDonationSql, demoUserSql} from '../../utils/demoData';

const router = Router();

const adminOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again later.',
  },
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const identifier = String(
      req.body?.identifier || req.body?.email || req.body?.mobileNumber || '',
    );
    const data = await adminAccountService.login(
      identifier,
      String(req.body?.password || ''),
    );
    return res.json({success: true, message: 'Admin signed in', data});
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Admin login failed',
    });
  }
});

router.post(
  '/auth/forgot/send-otp',
  adminOtpLimiter,
  async (req: Request, res: Response) => {
    try {
      const data = await adminAccountService.sendForgotOtp(
        String(req.body?.email || ''),
      );
      return res.json({
        success: true,
        message: 'OTP sent to admin email',
        data,
      });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({
        success: false,
        message: error?.message || 'Could not send OTP',
      });
    }
  },
);

router.post('/auth/forgot/reset', async (req: Request, res: Response) => {
  try {
    const data = await adminAccountService.resetPassword(
      String(req.body?.email || ''),
      String(req.body?.otp || ''),
      String(req.body?.newPassword || req.body?.password || ''),
    );
    return res.json({
      success: true,
      message: 'Password updated successfully',
      data,
    });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Could not reset password',
    });
  }
});

router.get('/auth/accounts', async (_req: Request, res: Response) => {
  try {
    const data = await adminAccountService.listAdmins();
    return res.json({success: true, data});
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Could not list admins',
    });
  }
});

router.post('/auth/accounts', async (req: Request, res: Response) => {
  try {
    const data = await adminAccountService.addAdmin({
      email: String(req.body?.email || ''),
      password: String(req.body?.password || ''),
      fullName: String(req.body?.fullName || ''),
      mobileCountryCode: String(req.body?.mobileCountryCode || '91'),
      mobileNumber: String(req.body?.mobileNumber || ''),
    });
    return res.json({
      success: true,
      message: 'Admin account created',
      data,
    });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Could not add admin',
    });
  }
});

router.delete('/auth/accounts/:id', async (req: Request, res: Response) => {
  try {
    const data = await adminAccountService.deleteAdmin(Number(req.params.id));
    return res.json({
      success: true,
      message: 'Admin account removed',
      data,
    });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Could not remove admin',
    });
  }
});

const num = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Timestamps are stored in UTC but a devotee's day runs on IST, and the app
 * already buckets japa by IST (see japa.repository). Admin analytics has to use
 * the same boundary or the panel disagrees with what devotees see on their own
 * progress screen, and anything done between midnight and 05:30 IST is counted
 * on the previous day.
 */
const IST_OFFSET_MINUTES = 330;

/** The IST calendar day a stored UTC timestamp belongs to. */
const istDay = (engine: string, column: string) =>
  engine === 'mysql'
    ? `DATE(DATE_ADD(${column}, INTERVAL ${IST_OFFSET_MINUTES} MINUTE))`
    : `date(${column}, '+5 hours', '30 minutes')`;

/** Today in IST, optionally shifted by whole days (negative for the past). */
const istToday = (engine: string, offsetDays = 0) => {
  if (engine === 'mysql') {
    const minutes = IST_OFFSET_MINUTES + offsetDays * 1440;
    return `DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${minutes} MINUTE))`;
  }
  const shift = offsetDays
    ? `, '${offsetDays > 0 ? '+' : '-'}${Math.abs(offsetDays)} days'`
    : '';
  return `date('now', '+5 hours', '30 minutes'${shift})`;
};

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** The IST day `offsetDays` from today, as a Date read via its UTC parts. */
const istDayAt = (offsetDays: number) =>
  new Date(
    Date.now() +
      IST_OFFSET_MINUTES * 60 * 1000 +
      offsetDays * 24 * 60 * 60 * 1000,
  );

/** 'YYYY-MM-DD' in IST, matching what the grouped SQL returns. */
const istDayKey = (offsetDays: number) => {
  const day = istDayAt(offsetDays);
  return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(day.getUTCDate()).padStart(2, '0')}`;
};

/** Short '17 Sep' label for a bar, on the same IST day as the bucket. */
const istDayLabel = (offsetDays: number) => {
  const day = istDayAt(offsetDays);
  return `${String(day.getUTCDate()).padStart(2, '0')} ${
    MONTH_LABELS[day.getUTCMonth()]
  }`;
};

/**
 * Turn one grouped 'day, total' result into a dense bar per day across the
 * window, so days with no activity still show up as a zero instead of being
 * missing. Replaces the old one-query-per-bar loops.
 */
const dailyBars = (rows: any[], barCount: number) => {
  const byDay = new Map<string, number>();
  (rows || []).forEach(row => {
    byDay.set(String(row.day || '').slice(0, 10), num(row.total));
  });

  const bars: Array<{label: string; value: number}> = [];
  for (let i = barCount - 1; i >= 0; i -= 1) {
    bars.push({
      label: istDayLabel(-i),
      value: byDay.get(istDayKey(-i)) || 0,
    });
  }
  return bars;
};

/**
 * A challenge chant is saved with remarks of 'Challenge:<id>' (japa.service), so
 * this is the exact complement of the exclusion filter used for normal japa.
 * Keeping them complementary means normal japa plus challenge japa always adds
 * up to every session, with nothing double counted and nothing dropped.
 */
const CHALLENGE_SESSION_SQL = `
  AND (
    lower(IFNULL(js.remarks, '')) LIKE 'challenge%'
    OR lower(IFNULL(js.remarks, '')) LIKE '%challenge japa%'
  )
`;

/** Everything that is not a challenge chant, i.e. Antharanga / normal japa. */
const NORMAL_SESSION_SQL = `
  AND (
    js.remarks IS NULL
    OR TRIM(js.remarks) = ''
    OR (
      lower(js.remarks) NOT LIKE 'challenge%'
      AND lower(js.remarks) NOT LIKE '%challenge japa%'
    )
  )
`;

/** Match a session's remarks to one specific challenge id, never a prefix. */
const challengeMatchSql = (engine: string) =>
  engine === 'mysql'
    ? `(js.remarks = CONCAT('Challenge:', c.id)
        OR js.remarks LIKE CONCAT('Challenge:', c.id, ' %'))`
    : `(js.remarks = 'Challenge:' || c.id
        OR js.remarks LIKE 'Challenge:' || c.id || ' %')`;

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
      FROM users u
      WHERE u.deleted_at IS NULL
      ${demoUserSql('u')}
    `);

    const japaGlobal = await mysql.query<any[]>(`
      SELECT total_japa_count AS totalJapa
      FROM global_japa_counter
      WHERE id = 1
    `);

    const japaSessions = await mysql.query<any[]>(`
      SELECT IFNULL(SUM(session_count), 0) AS totalJapa
      FROM japa_sessions
      WHERE (
        remarks IS NULL
        OR TRIM(remarks) = ''
        OR (
          lower(remarks) NOT LIKE 'challenge%'
          AND lower(remarks) NOT LIKE '%challenge japa%'
        )
      )
    `);

    const ordersRows = await mysql.query<any[]>(`
      SELECT COUNT(*) AS totalOrders
      FROM orders
    `);

    const donationsRows = await mysql.query<any[]>(`
      SELECT IFNULL(SUM(amount), 0) AS totalDonations
      FROM donations d
      WHERE (
        UPPER(IFNULL(d.payment_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
        OR UPPER(IFNULL(d.donation_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
      )
      ${demoDonationSql('d')}
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

    const dateGte = istToday(engine, -(days - 1));
    const prevGte = istToday(engine, -(days * 2 - 1));
    const prevLt = istToday(engine, -(days - 1));

    const donationSuccess = `
      (
        UPPER(IFNULL(payment_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
        OR UPPER(IFNULL(donation_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
      )
    `;
    const donationDemoFilter = demoDonationSql('d');
    const donationStamp = 'IFNULL(donated_at, created_at)';

    const totalUsersSql = `
      SELECT COUNT(*) AS total
      FROM users u
      WHERE u.deleted_at IS NULL
      ${demoUserSql('u')}
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

      const userDay = istDay(engine, 'u.created_at');

      const usersInRangeSql = `SELECT COUNT(*) AS total
             FROM users u
             WHERE u.deleted_at IS NULL
               AND ${userDay} >= ${dateGte}
               ${demoUserSql('u')}
               ${regionFilterUsers}`;

      const prevUsersSql = `SELECT COUNT(*) AS total
             FROM users u
             WHERE u.deleted_at IS NULL
               AND ${userDay} >= ${prevGte}
               AND ${userDay} < ${prevLt}
               ${demoUserSql('u')}
               ${regionFilterUsers}`;

      const [inRangeRows, prevRows] = await Promise.all([
        mysql.query<any[]>(usersInRangeSql),
        mysql.query<any[]>(prevUsersSql),
      ]);

      kpi = range === 'all' ? users : num(inRangeRows?.[0]?.total);
      prev = num(prevRows?.[0]?.total);

      // 'All' covers the whole devotee base; a narrower window shows the mix of
      // devotees who joined inside it. The demo filter has to match the KPI
      // above, otherwise the bars and the headline number disagree.
      const genderWindow =
        range === 'all' ? '' : `AND ${userDay} >= ${dateGte}`;

      const genderSql = `SELECT
               CASE
                 WHEN LOWER(IFNULL(u.gender, '')) IN ('male', 'm') THEN 'Male'
                 WHEN LOWER(IFNULL(u.gender, '')) IN ('female', 'f') THEN 'Female'
                 WHEN TRIM(IFNULL(u.gender, '')) = '' THEN 'Unknown'
                 ELSE IFNULL(u.gender, 'Other')
               END AS label,
               COUNT(*) AS total
             FROM users u
             WHERE u.deleted_at IS NULL
               ${genderWindow}
               ${demoUserSql('u')}
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
        const dayRows = await mysql.query<any[]>(
          `SELECT ${userDay} AS day, COUNT(*) AS total
           FROM users u
           WHERE u.deleted_at IS NULL
             AND ${userDay} >= ${istToday(engine, -(barCount - 1))}
             ${demoUserSql('u')}
             ${regionFilterUsers}
           GROUP BY day`,
        );
        bars.push(...dailyBars(dayRows, barCount));
      }
    } else if (metric === 'donations') {
      kpiLabel = 'Donations ₹';
      kpiFormat = 'currency';

      const donationDay = istDay(engine, donationStamp);
      const donationWindow =
        range === 'all' ? '' : `AND ${donationDay} >= ${dateGte}`;

      const sumSql = `SELECT IFNULL(SUM(amount), 0) AS total
             FROM donations d
             WHERE ${donationSuccess}
               ${donationWindow}
               ${donationDemoFilter}
               ${regionFilterUserId}`;

      const prevSumSql = `SELECT IFNULL(SUM(amount), 0) AS total
             FROM donations d
             WHERE ${donationSuccess}
               AND ${donationDay} >= ${prevGte}
               AND ${donationDay} < ${prevLt}
               ${donationDemoFilter}
               ${regionFilterUserId}`;

      const [sumRows, prevRows] = await Promise.all([
        mysql.query<any[]>(sumSql),
        mysql.query<any[]>(prevSumSql),
      ]);
      kpi = Math.round(num(sumRows?.[0]?.total));
      prev = Math.round(num(prevRows?.[0]?.total));

      const barCount = Math.min(days, 6);
      const dayRows = await mysql.query<any[]>(
        `SELECT ${donationDay} AS day, IFNULL(SUM(amount), 0) AS total
         FROM donations d
         WHERE ${donationSuccess}
           AND ${donationDay} >= ${istToday(engine, -(barCount - 1))}
           ${donationDemoFilter}
           ${regionFilterUserId}
         GROUP BY day`,
      );
      bars.push(
        ...dailyBars(dayRows, barCount).map(bar => ({
          label: bar.label,
          value: Math.round(bar.value),
        })),
      );
    } else if (metric === 'challenges') {
      kpiLabel = 'Challenge japas';

      // Chants are what this screen reports, so they are read from the sessions
      // themselves. The old query summed challenge_participants.current_value
      // filtered on the row's created_at, which is the date the devotee joined,
      // not the date they chanted — so chanting today against a challenge joined
      // last week counted as zero, while a join today dragged in its whole
      // lifetime total.
      const sessionDay = istDay(engine, 'js.created_at');
      const windowFilter =
        range === 'all' ? '' : `AND ${sessionDay} >= ${dateGte}`;

      const japaSql = `SELECT IFNULL(SUM(js.session_count), 0) AS total
             FROM japa_sessions js
             WHERE 1=1
               ${windowFilter}
               ${CHALLENGE_SESSION_SQL}
               ${regionFilterSessions}`;

      const prevJapaSql = `SELECT IFNULL(SUM(js.session_count), 0) AS total
             FROM japa_sessions js
             WHERE ${sessionDay} >= ${prevGte}
               AND ${sessionDay} < ${prevLt}
               ${CHALLENGE_SESSION_SQL}
               ${regionFilterSessions}`;

      const [japaRows, prevRows] = await Promise.all([
        mysql.query<any[]>(japaSql),
        mysql.query<any[]>(prevJapaSql),
      ]);
      kpi = num(japaRows?.[0]?.total);
      prev = num(prevRows?.[0]?.total);

      // One bar per challenge, counting only japa inside the selected window.
      // The date filter used to be missing here entirely, so the chart showed
      // all-time totals and never changed when the range changed. The join stays
      // a LEFT JOIN so a challenge with no chants yet still shows as zero.
      const topRows = await mysql.query<any[]>(
        `SELECT
               IFNULL(c.title, 'Challenge') AS label,
               IFNULL(SUM(js.session_count), 0) AS total
             FROM challenges c
             LEFT JOIN japa_sessions js
               ON ${challengeMatchSql(engine)}
               ${windowFilter}
               ${regionFilterSessions}
             GROUP BY c.id, c.title
             ORDER BY total DESC, c.id DESC
             LIMIT 6`,
      );

      if (topRows?.length) {
        topRows.forEach((row: any) => {
          bars.push({
            label: String(row.label || 'Challenge').slice(0, 10),
            value: num(row.total),
          });
        });
      } else {
        // No challenges exist yet, so fall back to a daily view of challenge
        // japa rather than leaving the chart blank.
        const barCount = Math.min(days, 6);
        const dayRows = await mysql.query<any[]>(
          `SELECT ${sessionDay} AS day, IFNULL(SUM(js.session_count), 0) AS total
           FROM japa_sessions js
           WHERE ${sessionDay} >= ${istToday(engine, -(barCount - 1))}
             ${CHALLENGE_SESSION_SQL}
             ${regionFilterSessions}
           GROUP BY day`,
        );
        bars.push(...dailyBars(dayRows, barCount));
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

      const sessionDay = istDay(engine, 'js.created_at');
      const windowFilter =
        range === 'all' ? '' : `AND ${sessionDay} >= ${dateGte}`;

      const japaSql = `SELECT IFNULL(SUM(js.session_count), 0) AS total
             FROM japa_sessions js
             WHERE 1=1
               ${windowFilter}
               ${NORMAL_SESSION_SQL}
               ${regionFilterSessions}`;

      const prevJapaSql = `SELECT IFNULL(SUM(js.session_count), 0) AS total
             FROM japa_sessions js
             WHERE ${sessionDay} >= ${prevGte}
               AND ${sessionDay} < ${prevLt}
               ${NORMAL_SESSION_SQL}
               ${regionFilterSessions}`;

      const [japaRows, prevRows] = await Promise.all([
        mysql.query<any[]>(japaSql),
        mysql.query<any[]>(prevJapaSql),
      ]);
      kpi = num(japaRows?.[0]?.total);
      prev = num(prevRows?.[0]?.total);

      const barCount = Math.min(days, 6);
      const dayRows = await mysql.query<any[]>(
        `SELECT ${sessionDay} AS day, IFNULL(SUM(js.session_count), 0) AS total
         FROM japa_sessions js
         WHERE ${sessionDay} >= ${istToday(engine, -(barCount - 1))}
           ${NORMAL_SESSION_SQL}
           ${regionFilterSessions}
         GROUP BY day`,
      );
      bars.push(...dailyBars(dayRows, barCount));
    }

    let changePercent = 0;
    if (prev > 0) {
      changePercent = Math.round(((kpi - prev) / prev) * 100);
    } else if (kpi > 0) {
      changePercent = 100;
    }

    // An all-time KPI has no earlier period to be compared against, and the
    // stale 180-360 day window used before made every 'All' view read '+100%'.
    // Users are handled separately just below with a real 7-day trend.
    if (range === 'all' && metric !== 'users') {
      changePercent = 0;
    }

    // For total-users KPI on "all", compare new users this 7d vs prior 7d for change.
    if (metric === 'users' && range === 'all') {
      const allUserDay = istDay(engine, 'u.created_at');
      const recentSql = `SELECT COUNT(*) AS total FROM users u
             WHERE u.deleted_at IS NULL
               AND ${allUserDay} >= ${istToday(engine, -6)}
               ${demoUserSql('u')}
               ${regionFilterUsers}`;
      const priorSql = `SELECT COUNT(*) AS total FROM users u
             WHERE u.deleted_at IS NULL
               AND ${allUserDay} >= ${istToday(engine, -13)}
               AND ${allUserDay} < ${istToday(engine, -6)}
               ${demoUserSql('u')}
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
            AND (
              js.remarks IS NULL
              OR TRIM(js.remarks) = ''
              OR (
                lower(js.remarks) NOT LIKE 'challenge%'
                AND lower(js.remarks) NOT LIKE '%challenge japa%'
              )
            )
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

/** Soft-deleted accounts still keep japa history — admin can restore them. */
router.get('/users-deleted', async (_req: Request, res: Response) => {
  try {
    const rows = await mysql.query<any[]>(`
      SELECT
        u.id,
        u.full_name AS fullName,
        u.email,
        u.mobile_country_code AS mobileCountryCode,
        u.mobile_number AS mobileNumber,
        u.account_status AS accountStatus,
        u.deleted_at AS deletedAt,
        IFNULL((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.user_id = u.id
        ), 0) AS japaCount
      FROM users u
      WHERE u.deleted_at IS NOT NULL
      ORDER BY u.deleted_at DESC
      LIMIT 500
    `);
    return res.json({
      success: true,
      data: (rows || []).map((row: any) => ({
        ...mapUserRow(row),
        deletedAt: row.deletedAt || row.deleted_at || null,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load deleted users.',
    });
  }
});

router.post('/users/:id/restore', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({success: false, message: 'Invalid user id.'});
    }
    const rows = await mysql.query<any[]>(
      `SELECT * FROM users WHERE id = ? AND deleted_at IS NOT NULL LIMIT 1`,
      [userId],
    );
    if (!rows?.length) {
      return res.status(404).json({
        success: false,
        message: 'No soft-deleted user found for this id.',
      });
    }
    const row = rows[0];
    const rawEmail = String(row.email || '');
    const rawMobile = String(row.mobile_number || row.mobileNumber || '');
    const prefix = `deleted_${userId}_`;
    const email = rawEmail.toLowerCase().startsWith(prefix)
      ? rawEmail.slice(prefix.length)
      : rawEmail.includes('@')
        ? rawEmail
        : null;
    const mobile = rawMobile.toLowerCase().startsWith(prefix)
      ? rawMobile.slice(prefix.length).replace(/\D/g, '')
      : rawMobile.replace(/\D/g, '');
    const country = String(
      row.mobile_country_code || row.mobileCountryCode || '91',
    ).replace(/\D/g, '') || '91';

    await mysql.query(
      `
      UPDATE users
      SET
        deleted_at = NULL,
        email = ?,
        mobile_country_code = ?,
        mobile_number = ?,
        firebase_uid = COALESCE(NULLIF(firebase_uid, ''), ?),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        email ? email.toLowerCase() : null,
        country,
        mobile || '0000000000',
        email ? `email:${email.toLowerCase()}` : `usr-restored-${userId}`,
        userId,
      ],
    );

    const restored = await mysql.query<any[]>(
      `
      SELECT
        u.id,
        u.full_name AS fullName,
        u.email,
        u.mobile_country_code AS mobileCountryCode,
        u.mobile_number AS mobileNumber,
        u.account_status AS accountStatus,
        IFNULL((
          SELECT SUM(js.session_count) FROM japa_sessions js WHERE js.user_id = u.id
        ), 0) AS japaCount
      FROM users u
      WHERE u.id = ? AND u.deleted_at IS NULL
      LIMIT 1
      `,
      [userId],
    );

    return res.json({
      success: true,
      message: 'User restored with previous japa history.',
      data: restored?.[0] ? mapUserRow(restored[0]) : null,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to restore user.',
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
            AND (
              js.remarks IS NULL
              OR TRIM(js.remarks) = ''
              OR (
                lower(js.remarks) NOT LIKE 'challenge%'
                AND lower(js.remarks) NOT LIKE '%challenge japa%'
              )
            )
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
            AND (
              js.remarks IS NULL
              OR TRIM(js.remarks) = ''
              OR (
                lower(js.remarks) NOT LIKE 'challenge%'
                AND lower(js.remarks) NOT LIKE '%challenge japa%'
              )
            )
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
    // Admin sees all mantras (active + inactive). Users only get active ones.
    const rows = await mantraRepository.getAllMantras();
    return res.json({
      success: true,
      data: (rows || []).map((row: any) => mapMantraRow(row)),
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

    const hasStatusOnly =
      (req.body?.isActive != null || req.body?.active != null) &&
      req.body?.mantraName == null &&
      req.body?.name == null &&
      req.body?.deityName == null &&
      req.body?.subtitle == null &&
      req.body?.sanskritText == null &&
      req.body?.transliteration == null &&
      req.body?.defaultJapaCount == null &&
      req.body?.target == null &&
      req.body?.isFeatured == null;

    const nextActive =
      req.body?.isActive != null || req.body?.active != null
        ? Boolean(req.body?.isActive ?? req.body?.active)
        : undefined;

    // Status toggle: only flip is_active — never delete the mantra.
    const updated = hasStatusOnly
      ? await mantraRepository.setActive(id, Boolean(nextActive))
      : await mantraRepository.update(id, {
          mantraName: req.body?.mantraName || req.body?.name,
          deityName: req.body?.deityName || req.body?.subtitle,
          sanskritText: req.body?.sanskritText,
          transliteration: req.body?.transliteration,
          defaultJapaCount:
            req.body?.defaultJapaCount != null || req.body?.target != null
              ? Number(req.body?.defaultJapaCount ?? req.body?.target)
              : undefined,
          isActive: nextActive,
          isFeatured:
            req.body?.isFeatured != null
              ? Boolean(req.body.isFeatured)
              : undefined,
        });
    if (!updated) {
      return res.status(404).json({success: false, message: 'Mantra not found.'});
    }
    return res.json({
      success: true,
      message: hasStatusOnly
        ? nextActive
          ? 'Mantra is now visible to users.'
          : 'Mantra is now hidden from users.'
        : 'Mantra updated successfully.',
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
  const participants = Number(row.participants || 0);
  const completed = Number(row.completed || 0);
  const avgProgress = Math.round(Number(row.avgProgress || 0));
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
    participants,
    completed,
    completionRate:
      participants > 0 ? Math.round((completed * 100) / participants) : 0,
    avgProgress,
    progressBuckets: {
      pct0: Number(row.bucket0 || 0),
      pct1to25: Number(row.bucket25 || 0),
      pct26to50: Number(row.bucket50 || 0),
      pct51to75: Number(row.bucket75 || 0),
      pct76to99: Number(row.bucket99 || 0),
      pct100: Number(row.bucket100 || 0),
    },
  };
};

const challengeProgressPctSql = `
  CASE
    WHEN cp.id IS NULL THEN NULL
    WHEN IFNULL(cp.is_completed, 0) = 1 THEN 100
    WHEN IFNULL(c.target_value, 0) <= 0 THEN 0
    WHEN IFNULL(cp.current_value, 0) >= c.target_value THEN 100
    ELSE CAST(ROUND(100.0 * cp.current_value / c.target_value) AS INTEGER)
  END
`;

router.get('/challenges', async (_req: Request, res: Response) => {
  try {
    const rows = await mysql.query<any[]>(`
      SELECT
        c.id,
        c.title,
        c.description,
        c.challenge_type AS challengeType,
        c.target_value AS targetValue,
        c.reward_type AS rewardType,
        c.reward_name AS rewardName,
        c.reward_quantity AS rewardQuantity,
        c.start_date AS startDate,
        c.end_date AS endDate,
        c.is_active AS isActive,
        COUNT(cp.id) AS participants,
        SUM(
          CASE
            WHEN cp.id IS NULL THEN 0
            WHEN IFNULL(cp.is_completed, 0) = 1 THEN 1
            WHEN IFNULL(c.target_value, 0) > 0
              AND IFNULL(cp.current_value, 0) >= c.target_value THEN 1
            ELSE 0
          END
        ) AS completed,
        IFNULL(AVG(${challengeProgressPctSql}), 0) AS avgProgress,
        SUM(CASE WHEN ${challengeProgressPctSql} = 0 THEN 1 ELSE 0 END) AS bucket0,
        SUM(CASE WHEN ${challengeProgressPctSql} BETWEEN 1 AND 25 THEN 1 ELSE 0 END) AS bucket25,
        SUM(CASE WHEN ${challengeProgressPctSql} BETWEEN 26 AND 50 THEN 1 ELSE 0 END) AS bucket50,
        SUM(CASE WHEN ${challengeProgressPctSql} BETWEEN 51 AND 75 THEN 1 ELSE 0 END) AS bucket75,
        SUM(CASE WHEN ${challengeProgressPctSql} BETWEEN 76 AND 99 THEN 1 ELSE 0 END) AS bucket99,
        SUM(CASE WHEN ${challengeProgressPctSql} >= 100 THEN 1 ELSE 0 END) AS bucket100
      FROM challenges c
      LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
      GROUP BY
        c.id,
        c.title,
        c.description,
        c.challenge_type,
        c.target_value,
        c.reward_type,
        c.reward_name,
        c.reward_quantity,
        c.start_date,
        c.end_date,
        c.is_active
      ORDER BY c.id DESC
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

    const title =
      String(req.body?.title || req.body?.name || '').trim() ||
      String(current.title || '');
    const description =
      req.body?.description !== undefined
        ? String(req.body.description || '').trim() || null
        : current.description ?? null;

    let targetValue = Number(current.targetValue || 0) || 0;
    if (
      req.body?.targetValue !== undefined ||
      req.body?.target !== undefined
    ) {
      targetValue = Math.max(
        1,
        Number(
          String(req.body?.targetValue ?? req.body?.target ?? targetValue).replace(
            /,/g,
            '',
          ),
        ) || targetValue || 1,
      );
    }

    let startDate = parseChallengeDate(current.startDate) || String(current.startDate || '');
    let endDate = parseChallengeDate(current.endDate) || String(current.endDate || '');
    if (String(req.body?.startDate || '').trim()) {
      const parsedStart = parseChallengeDate(req.body.startDate);
      if (!parsedStart) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be YYYY-MM-DD or DD/MM/YYYY.',
        });
      }
      startDate = parsedStart;
    }
    if (String(req.body?.endDate || '').trim()) {
      const parsedEnd = parseChallengeDate(req.body.endDate);
      if (!parsedEnd) {
        return res.status(400).json({
          success: false,
          message: 'End date must be YYYY-MM-DD or DD/MM/YYYY.',
        });
      }
      endDate = parsedEnd;
    }
    if (startDate && endDate && endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be on or after start date.',
      });
    }

    const mantraHint = String(req.body?.mantra || '').trim();
    let rewardName = String(current.rewardName || 'Certificate');
    if (req.body?.rewardName !== undefined) {
      rewardName = String(req.body.rewardName || '').trim() || rewardName;
    } else if (mantraHint) {
      rewardName = `${mantraHint} Certificate`;
    }

    const challengeType =
      String(req.body?.challengeType || current.challengeType || 'JAPA_COUNT').trim() ||
      'JAPA_COUNT';
    const rewardType =
      String(req.body?.rewardType || current.rewardType || 'CERTIFICATE').trim() ||
      'CERTIFICATE';
    const rewardQuantity = Math.max(
      1,
      Number(req.body?.rewardQuantity ?? current.rewardQuantity ?? 1) || 1,
    );

    await mysql.query(
      `
      UPDATE challenges
      SET
        title = ?,
        description = ?,
        challenge_type = ?,
        target_value = ?,
        reward_type = ?,
        reward_name = ?,
        reward_quantity = ?,
        start_date = ?,
        end_date = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        title,
        description,
        challengeType,
        targetValue,
        rewardType,
        rewardName,
        rewardQuantity,
        startDate,
        endDate,
        isActive,
        id,
      ],
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
  const paymentRaw = String(row.paymentStatus || '').toUpperCase();
  const remarks = String(row.remarks || '');
  const utrMatch = remarks.match(/UTR:\s*([A-Z0-9]+)/i);
  const mobileMatch = remarks.match(/Mobile:\s*([^|]+)/i);
  const nameFromRemarks = remarks.match(/Name:\s*([^|]+)/i);

  let stage = 'Pending verification';
  let status: 'Pending' | 'Active' | 'Inactive' = 'Pending';
  if (statusRaw === 'INACTIVE' || statusRaw === 'CANCELLED') {
    stage = 'Inactive';
    status = 'Inactive';
  } else if (
    paymentRaw === 'SUCCESS' ||
    paymentRaw === 'PAID' ||
    statusRaw === 'ACTIVE'
  ) {
    stage = 'Verified';
    status = 'Active';
  }

  return {
    id: String(row.id),
    code: `NH${row.id}`,
    name: row.customerName || nameFromRemarks?.[1]?.trim() || 'Devotee',
    mobile: mobileMatch?.[1]?.trim() || '',
    utr: utrMatch?.[1]?.trim() || '',
    remarks,
    stage,
    status,
    paymentStatus: paymentRaw || 'PENDING',
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
        o.remarks,
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

    const action = String(req.body?.action || '').toLowerCase();
    const statusRaw = String(req.body?.status || '').toLowerCase();
    const verify =
      action === 'verify' ||
      statusRaw === 'active' ||
      req.body?.active === true ||
      req.body?.active === 1 ||
      req.body?.active === '1';
    const reject =
      action === 'reject' ||
      statusRaw === 'inactive' ||
      req.body?.active === false ||
      req.body?.active === 0 ||
      req.body?.active === '0';

    if (verify) {
      await mysql.query(
        `
        UPDATE orders
        SET
          payment_status = 'SUCCESS',
          order_status = 'ACTIVE',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [id],
      );
    } else if (reject) {
      await mysql.query(
        `
        UPDATE orders
        SET
          payment_status = 'FAILED',
          order_status = 'INACTIVE',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [id],
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'Use action verify or reject.',
      });
    }

    const rows = await mysql.query<any[]>(`
      SELECT
        o.id,
        o.order_number AS orderNumber,
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
      message: verify
        ? 'Payment verified. Enrollment is now active.'
        : 'Enrollment marked inactive / payment rejected.',
      data: mapHomamEnrollment(rows?.[0] || {}),
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

const parseRemarkLine = (remarks: string, label: string) => {
  const match = String(remarks || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  if (!match) {
    return '';
  }
  return match.slice(label.length + 1).trim();
};

const mapOrderDetail = (row: any) => {
  const base = mapOrderRow(row);
  const remarks = String(row.remarks || '');
  const deliveryName =
    row.claimFullName ||
    row.banaFullName ||
    parseRemarkLine(remarks, 'Name') ||
    row.customerName ||
    '';
  const deliveryMobile =
    row.claimMobile ||
    row.banaMobile ||
    parseRemarkLine(remarks, 'Mobile') ||
    row.customerMobile ||
    '';
  const deliveryAddress =
    row.claimAddress ||
    row.banaAddress ||
    parseRemarkLine(remarks, 'Address') ||
    '';
  const deliveryCity =
    row.claimCity || parseRemarkLine(remarks, 'City') || '';
  const deliveryState =
    row.claimState || parseRemarkLine(remarks, 'State') || '';
  const deliveryPin =
    row.claimPinCode ||
    row.banaPostalCode ||
    parseRemarkLine(remarks, 'PIN') ||
    parseRemarkLine(remarks, 'PIN Code') ||
    '';
  const email = row.customerEmail || row.banaEmail || '';
  const mobile = [row.customerMobileCode, row.customerMobile]
    .filter(Boolean)
    .join(' ')
    .trim() || deliveryMobile;

  return {
    ...base,
    orderType: row.orderType || '',
    orderSource: row.orderSource || '',
    paymentId: row.paymentId || null,
    updatedAt: row.updatedAt || null,
    customerEmail: email,
    customerMobile: mobile,
    userId: row.userId ? String(row.userId) : null,
    delivery: {
      fullName: deliveryName,
      mobile: deliveryMobile || mobile,
      email,
      address: deliveryAddress,
      city: deliveryCity,
      state: deliveryState,
      pinCode: deliveryPin,
      gothram: row.banaGothram || '',
      nakshatram: row.banaNakshatram || '',
    },
    challengeId: row.claimChallengeId || null,
    rewardName: row.claimRewardName || null,
  };
};

const orderDetailSelect = `
  SELECT
    o.id,
    o.user_id AS userId,
    o.order_number AS orderNumber,
    o.order_type AS orderType,
    o.order_source AS orderSource,
    o.item_name AS itemName,
    o.quantity,
    o.payment_id AS paymentId,
    o.payment_status AS paymentStatus,
    o.order_status AS orderStatus,
    o.remarks,
    o.created_at AS createdAt,
    o.updated_at AS updatedAt,
    IFNULL(u.full_name, 'Devotee') AS customerName,
    u.email AS customerEmail,
    u.mobile_country_code AS customerMobileCode,
    u.mobile_number AS customerMobile,
    crc.challenge_id AS claimChallengeId,
    crc.reward_name AS claimRewardName,
    crc.full_name AS claimFullName,
    crc.mobile AS claimMobile,
    crc.address AS claimAddress,
    crc.city AS claimCity,
    crc.state AS claimState,
    crc.pin_code AS claimPinCode,
    bl.full_name AS banaFullName,
    bl.mobile AS banaMobile,
    bl.email AS banaEmail,
    bl.address AS banaAddress,
    bl.postal_code AS banaPostalCode,
    bl.gothram AS banaGothram,
    bl.nakshatram AS banaNakshatram
  FROM orders o
  LEFT JOIN users u ON u.id = o.user_id
  LEFT JOIN challenge_reward_claims crc ON crc.order_id = o.id
  LEFT JOIN bana_lingam bl ON bl.order_id = o.id
`;

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

const ensureOrderDetailJoins = async () => {
  const alters = [
    'ALTER TABLE challenge_reward_claims ADD COLUMN full_name TEXT NULL',
    'ALTER TABLE challenge_reward_claims ADD COLUMN mobile TEXT NULL',
    'ALTER TABLE challenge_reward_claims ADD COLUMN address TEXT NULL',
    'ALTER TABLE challenge_reward_claims ADD COLUMN city TEXT NULL',
    'ALTER TABLE challenge_reward_claims ADD COLUMN state TEXT NULL',
    'ALTER TABLE challenge_reward_claims ADD COLUMN pin_code TEXT NULL',
    'ALTER TABLE challenge_reward_claims ADD COLUMN order_id INT NULL',
    'ALTER TABLE challenge_reward_claims ADD COLUMN order_number VARCHAR(64) NULL',
  ];
  for (const sql of alters) {
    try {
      await mysql.query(sql);
    } catch {
      // Column already exists.
    }
  }
};

router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid order id.'});
    }
    await ensureOrderDetailJoins();
    const rows = await mysql.query<any[]>(
      `
      ${orderDetailSelect}
      WHERE o.id = ?
      LIMIT 1
      `,
      [id],
    );
    if (!rows?.length) {
      return res.status(404).json({success: false, message: 'Order not found.'});
    }
    return res.json({
      success: true,
      data: mapOrderDetail(rows[0]),
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

    await ensureOrderDetailJoins();
    const rows = await mysql.query<any[]>(
      `
      ${orderDetailSelect}
      WHERE o.id = ?
      LIMIT 1
      `,
      [id],
    );

    return res.json({
      success: true,
      message: 'Order status updated.',
      data: mapOrderDetail(rows[0]),
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
  const demoDonationFilter = demoDonationSql('d');
  const successFilter = `
    (
      UPPER(IFNULL(payment_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
      OR UPPER(IFNULL(donation_status, '')) IN ('SUCCESS', 'PAID', 'COMPLETED')
    )
  `;
  const stamp = 'IFNULL(donated_at, created_at)';

  const todaySql =
    engine === 'mysql'
      ? `SELECT IFNULL(SUM(amount), 0) AS total FROM donations d
         WHERE ${successFilter} AND DATE(${stamp}) = CURDATE() ${demoDonationFilter}`
      : `SELECT IFNULL(SUM(amount), 0) AS total FROM donations d
         WHERE ${successFilter} AND date(${stamp}) = date('now') ${demoDonationFilter}`;

  const weekSql =
    engine === 'mysql'
      ? `SELECT IFNULL(SUM(amount), 0) AS total FROM donations d
         WHERE ${successFilter}
           AND DATE(${stamp}) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ${demoDonationFilter}`
      : `SELECT IFNULL(SUM(amount), 0) AS total FROM donations d
         WHERE ${successFilter}
           AND date(${stamp}) >= date('now', '-6 days') ${demoDonationFilter}`;

  const monthSql =
    engine === 'mysql'
      ? `SELECT IFNULL(SUM(amount), 0) AS total FROM donations d
         WHERE ${successFilter}
           AND YEAR(${stamp}) = YEAR(CURDATE())
           AND MONTH(${stamp}) = MONTH(CURDATE()) ${demoDonationFilter}`
      : `SELECT IFNULL(SUM(amount), 0) AS total FROM donations d
         WHERE ${successFilter}
           AND strftime('%Y-%m', ${stamp}) = strftime('%Y-%m', 'now') ${demoDonationFilter}`;

  const refundSql = `
    SELECT IFNULL(SUM(amount), 0) AS total
    FROM donations d
    WHERE (
      UPPER(IFNULL(d.payment_status, '')) IN ('REFUNDED', 'REFUND', 'PENDING_REFUND')
      OR UPPER(IFNULL(d.donation_status, '')) IN ('REFUNDED', 'REFUND', 'PENDING_REFUND')
    )
    ${demoDonationFilter}
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
      WHERE 1=1
      ${demoDonationSql('d')}
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
        ${demoUserSql('u')}
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
      const challengeFilter = `
        AND (
          js.remarks IS NULL
          OR TRIM(js.remarks) = ''
          OR (
            lower(js.remarks) NOT LIKE 'challenge%'
            AND lower(js.remarks) NOT LIKE '%challenge japa%'
          )
        )
      `;

      // Lifetime total across ALL mantras per user (for Total Count column).
      // Include orphaned sessions (user row missing) so history is never dropped.
      const lifetimeRows = await mysql.query<any[]>(`
        SELECT
          js.user_id AS userId,
          COALESCE(SUM(js.session_count), 0) AS allMantraTotal
        FROM japa_sessions js
        WHERE 1=1
        ${challengeFilter}
        GROUP BY js.user_id
      `);
      const lifetimeByUser = new Map<number, number>();
      (lifetimeRows || []).forEach((row: any) => {
        const id = Number(row.userId ?? row.user_id ?? 0);
        if (id) {
          lifetimeByUser.set(
            id,
            Number(row.allMantraTotal ?? row.all_mantra_total ?? 0),
          );
        }
      });

      // Sheet 1: daily rows — keep every historical chant day
      const dailyRows = await mysql.query<any[]>(`
        SELECT
          js.user_id AS userId,
          COALESCE(
            NULLIF(TRIM(u.full_name), ''),
            NULLIF(TRIM(js.user_name), ''),
            NULLIF(TRIM(js.user_email), ''),
            CASE
              WHEN js.user_id IS NOT NULL THEN 'User #' || js.user_id
              ELSE 'Devotee'
            END
          ) AS userName,
          IFNULL(js.user_email, u.email) AS userEmail,
          DATE(js.created_at, '+5 hours', '30 minutes') AS japaDate,
          COALESCE(
            m.mantra_name,
            upm.mantra_name,
            CASE
              WHEN js.mantra_type = 'PERSONAL' THEN 'Private Japa'
              ELSE 'Japa'
            END
          ) AS japaName,
          COALESCE(SUM(js.session_count), 0) AS japaCount
        FROM japa_sessions js
        LEFT JOIN users u ON u.id = js.user_id
        LEFT JOIN mantras m ON m.id = js.mantra_id
        LEFT JOIN user_personal_mantras upm ON upm.id = js.personal_mantra_id
        WHERE 1=1
        ${challengeFilter}
        GROUP BY
          js.user_id,
          DATE(js.created_at, '+5 hours', '30 minutes'),
          js.mantra_id,
          js.personal_mantra_id,
          js.mantra_type,
          u.full_name,
          u.email,
          js.user_name,
          js.user_email,
          m.mantra_name,
          upm.mantra_name
        HAVING COALESCE(SUM(js.session_count), 0) > 0
        ORDER BY japaDate DESC, userName ASC, japaName ASC
        LIMIT 50000
      `);

      const dailySheet = workbook.addWorksheet('Japa by Date');
      dailySheet.columns = [
        {header: 'S.No', key: 'sno', width: 8},
        {header: 'User Name', key: 'userName', width: 26},
        {header: 'Email', key: 'userEmail', width: 28},
        {header: 'Date', key: 'japaDate', width: 14},
        {header: 'Japa Name', key: 'japaName', width: 28},
        {header: 'Japa Count', key: 'japaCount', width: 12},
        {header: 'Total Count', key: 'totalCount', width: 14},
      ];
      (dailyRows || []).forEach((row: any, index: number) => {
        const userId = Number(row.userId ?? row.user_id ?? 0);
        const name = String(row.userName || row.user_name || '').trim();
        dailySheet.addRow({
          sno: index + 1,
          userName: name && name.toLowerCase() !== 'devotee'
            ? name
            : String(row.userEmail || row.user_email || name || `User #${userId}`),
          userEmail: row.userEmail || row.user_email || '',
          japaDate: String(row.japaDate || row.japa_date || '').slice(0, 10),
          japaName: row.japaName || row.japa_name || 'Japa',
          japaCount: Number(row.japaCount ?? row.japa_count ?? 0),
          totalCount: lifetimeByUser.get(userId) || 0,
        });
      });
      dailySheet.getRow(1).font = {bold: true};

      // Sheet 2: per-mantra count + overall total across all mantras
      const totalRows = await mysql.query<any[]>(`
        SELECT
          js.user_id AS userId,
          COALESCE(
            NULLIF(TRIM(u.full_name), ''),
            NULLIF(TRIM(js.user_name), ''),
            NULLIF(TRIM(js.user_email), ''),
            CASE
              WHEN js.user_id IS NOT NULL THEN 'User #' || js.user_id
              ELSE 'Devotee'
            END
          ) AS userName,
          IFNULL(js.user_email, u.email) AS userEmail,
          COALESCE(
            m.mantra_name,
            upm.mantra_name,
            CASE
              WHEN js.mantra_type = 'PERSONAL' THEN 'Private Japa'
              ELSE 'Japa'
            END
          ) AS japaName,
          COALESCE(SUM(js.session_count), 0) AS japaCount
        FROM japa_sessions js
        LEFT JOIN users u ON u.id = js.user_id
        LEFT JOIN mantras m ON m.id = js.mantra_id
        LEFT JOIN user_personal_mantras upm ON upm.id = js.personal_mantra_id
        WHERE 1=1
        ${challengeFilter}
        GROUP BY
          js.user_id,
          js.mantra_id,
          js.personal_mantra_id,
          js.mantra_type,
          u.full_name,
          u.email,
          js.user_name,
          js.user_email,
          m.mantra_name,
          upm.mantra_name
        HAVING COALESCE(SUM(js.session_count), 0) > 0
        ORDER BY userName ASC, japaCount DESC
        LIMIT 50000
      `);

      const totalsSheet = workbook.addWorksheet('Mantra Totals');
      totalsSheet.columns = [
        {header: 'S.No', key: 'sno', width: 8},
        {header: 'User Name', key: 'userName', width: 26},
        {header: 'Email', key: 'userEmail', width: 28},
        {header: 'Japa Name', key: 'japaName', width: 28},
        {header: 'Japa Count', key: 'japaCount', width: 12},
        {header: 'Total Count', key: 'totalCount', width: 14},
      ];
      (totalRows || []).forEach((row: any, index: number) => {
        const userId = Number(row.userId ?? row.user_id ?? 0);
        const name = String(row.userName || row.user_name || '').trim();
        totalsSheet.addRow({
          sno: index + 1,
          userName: name && name.toLowerCase() !== 'devotee'
            ? name
            : String(row.userEmail || row.user_email || name || `User #${userId}`),
          userEmail: row.userEmail || row.user_email || '',
          japaName: row.japaName || row.japa_name || 'Japa',
          japaCount: Number(row.japaCount ?? row.japa_count ?? 0),
          totalCount: lifetimeByUser.get(userId) || 0,
        });
      });
      totalsSheet.getRow(1).font = {bold: true};

      // Sheet 3: one row per user with overall japa total
      const userTotalRows = await mysql.query<any[]>(`
        SELECT
          u.id AS userId,
          IFNULL(u.full_name, 'Devotee') AS userName,
          IFNULL(u.email, '') AS email,
          TRIM(
            IFNULL(u.mobile_country_code, '') || IFNULL(u.mobile_number, '')
          ) AS mobile,
          COALESCE(SUM(js.session_count), 0) AS totalJapa
        FROM users u
        LEFT JOIN japa_sessions js
          ON js.user_id = u.id
          AND (
            js.remarks IS NULL
            OR TRIM(js.remarks) = ''
            OR (
              lower(js.remarks) NOT LIKE 'challenge%'
              AND lower(js.remarks) NOT LIKE '%challenge japa%'
            )
          )
        WHERE u.deleted_at IS NULL
        ${demoUserSql('u')}
        GROUP BY u.id, u.full_name, u.email, u.mobile_country_code, u.mobile_number
        ORDER BY totalJapa DESC, userName ASC
        LIMIT 10000
      `);

      const usersSheet = workbook.addWorksheet('User Totals');
      usersSheet.columns = [
        {header: 'S.No', key: 'sno', width: 8},
        {header: 'User Name', key: 'userName', width: 26},
        {header: 'Email', key: 'email', width: 28},
        {header: 'Mobile', key: 'mobile', width: 16},
        {header: 'Total Japa Count', key: 'totalJapa', width: 16},
      ];
      (userTotalRows || []).forEach((row: any, index: number) => {
        usersSheet.addRow({
          sno: index + 1,
          userName: row.userName || row.user_name || 'Devotee',
          email: row.email || '',
          mobile: row.mobile || '',
          totalJapa: Number(row.totalJapa ?? row.total_japa ?? 0),
        });
      });
      usersSheet.getRow(1).font = {bold: true};
    };

    const addChallenges = async (challengeIdFilter?: number) => {
      const idFilter =
        challengeIdFilter && challengeIdFilter > 0
          ? `WHERE c.id = ${challengeIdFilter}`
          : '';
      const summaryRows = await mysql.query<any[]>(`
        SELECT
          c.id,
          c.title,
          c.challenge_type AS challengeType,
          c.target_value AS targetValue,
          c.start_date AS startDate,
          c.end_date AS endDate,
          c.is_active AS isActive,
          COUNT(cp.id) AS participants,
          SUM(
            CASE
              WHEN cp.id IS NULL THEN 0
              WHEN IFNULL(cp.is_completed, 0) = 1 THEN 1
              WHEN IFNULL(c.target_value, 0) > 0
                AND IFNULL(cp.current_value, 0) >= c.target_value THEN 1
              ELSE 0
            END
          ) AS completed,
          IFNULL(AVG(${challengeProgressPctSql}), 0) AS avgProgress,
          SUM(CASE WHEN ${challengeProgressPctSql} = 0 THEN 1 ELSE 0 END) AS bucket0,
          SUM(CASE WHEN ${challengeProgressPctSql} BETWEEN 1 AND 25 THEN 1 ELSE 0 END) AS bucket25,
          SUM(CASE WHEN ${challengeProgressPctSql} BETWEEN 26 AND 50 THEN 1 ELSE 0 END) AS bucket50,
          SUM(CASE WHEN ${challengeProgressPctSql} BETWEEN 51 AND 75 THEN 1 ELSE 0 END) AS bucket75,
          SUM(CASE WHEN ${challengeProgressPctSql} BETWEEN 76 AND 99 THEN 1 ELSE 0 END) AS bucket99,
          SUM(CASE WHEN ${challengeProgressPctSql} >= 100 THEN 1 ELSE 0 END) AS bucket100
        FROM challenges c
        LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
        ${idFilter}
        GROUP BY
          c.id,
          c.title,
          c.challenge_type,
          c.target_value,
          c.start_date,
          c.end_date,
          c.is_active
        ORDER BY c.id DESC
        LIMIT 2000
      `);

      const summarySheet = workbook.addWorksheet('Challenge Summary');
      summarySheet.columns = [
        {header: 'ID', key: 'id', width: 8},
        {header: 'Title', key: 'title', width: 28},
        {header: 'Type', key: 'challengeType', width: 16},
        {header: 'Target', key: 'targetValue', width: 12},
        {header: 'Start', key: 'startDate', width: 14},
        {header: 'End', key: 'endDate', width: 14},
        {header: 'Active', key: 'isActive', width: 10},
        {header: 'Joined', key: 'participants', width: 10},
        {header: 'Completed', key: 'completed', width: 12},
        {header: 'Completion %', key: 'completionRate', width: 14},
        {header: 'Avg Progress %', key: 'avgProgress', width: 14},
        {header: '0%', key: 'bucket0', width: 8},
        {header: '1-25%', key: 'bucket25', width: 10},
        {header: '26-50%', key: 'bucket50', width: 10},
        {header: '51-75%', key: 'bucket75', width: 10},
        {header: '76-99%', key: 'bucket99', width: 10},
        {header: '100%', key: 'bucket100', width: 8},
      ];
      (summaryRows || []).forEach((row: any) => {
        const participants = Number(row.participants || 0);
        const completed = Number(row.completed || 0);
        summarySheet.addRow({
          id: row.id,
          title: row.title,
          challengeType: row.challengeType,
          targetValue: Number(row.targetValue || 0),
          startDate: row.startDate,
          endDate: row.endDate,
          isActive: Number(row.isActive) === 1 ? 'Yes' : 'No',
          participants,
          completed,
          completionRate:
            participants > 0
              ? Math.round((completed * 100) / participants)
              : 0,
          avgProgress: Math.round(Number(row.avgProgress || 0)),
          bucket0: Number(row.bucket0 || 0),
          bucket25: Number(row.bucket25 || 0),
          bucket50: Number(row.bucket50 || 0),
          bucket75: Number(row.bucket75 || 0),
          bucket99: Number(row.bucket99 || 0),
          bucket100: Number(row.bucket100 || 0),
        });
      });
      summarySheet.getRow(1).font = {bold: true};

      const participantFilter =
        challengeIdFilter && challengeIdFilter > 0
          ? `AND c.id = ${challengeIdFilter}`
          : '';
      const participantRows = await mysql.query<any[]>(`
        SELECT
          c.id AS challengeId,
          c.title AS challengeTitle,
          c.target_value AS targetValue,
          u.id AS userId,
          IFNULL(u.full_name, 'Devotee') AS userName,
          IFNULL(u.email, '') AS email,
          IFNULL(u.mobile_country_code, '') AS mobileCountryCode,
          IFNULL(u.mobile_number, '') AS mobileNumber,
          IFNULL(cp.current_value, 0) AS currentValue,
          IFNULL(cp.is_completed, 0) AS isCompleted,
          cp.completed_at AS completedAt,
          ${challengeProgressPctSql} AS progressPct,
          IFNULL(cp.reward_given, 0) AS rewardGiven,
          cp.created_at AS joinedAt
        FROM challenge_participants cp
        INNER JOIN challenges c ON c.id = cp.challenge_id
        LEFT JOIN users u ON u.id = cp.user_id
        WHERE 1=1
        ${participantFilter}
        ORDER BY c.id DESC, progressPct DESC, cp.id ASC
        LIMIT 20000
      `);

      const peopleSheet = workbook.addWorksheet('Participants Progress');
      peopleSheet.columns = [
        {header: 'S.No', key: 'sno', width: 8},
        {header: 'Challenge', key: 'challengeTitle', width: 28},
        {header: 'User Name', key: 'userName', width: 24},
        {header: 'Email', key: 'email', width: 28},
        {header: 'Mobile', key: 'mobile', width: 16},
        {header: 'Current Count', key: 'currentValue', width: 14},
        {header: 'Target', key: 'targetValue', width: 12},
        {header: 'Progress %', key: 'progressPct', width: 12},
        {header: 'Completed', key: 'completed', width: 12},
        {header: 'Completed At', key: 'completedAt', width: 20},
        {header: 'Reward Given', key: 'rewardGiven', width: 14},
        {header: 'Joined At', key: 'joinedAt', width: 20},
      ];
      (participantRows || []).forEach((row: any, index: number) => {
        const pct = Number(row.progressPct ?? 0);
        const mobile = `${row.mobileCountryCode || ''}${row.mobileNumber || ''}`.trim();
        peopleSheet.addRow({
          sno: index + 1,
          challengeTitle: row.challengeTitle || '',
          userName: row.userName || 'Devotee',
          email: row.email || '',
          mobile,
          currentValue: Number(row.currentValue || 0),
          targetValue: Number(row.targetValue || 0),
          progressPct: pct,
          completed:
            Number(row.isCompleted) === 1 || pct >= 100 ? 'Yes' : 'No',
          completedAt: row.completedAt || '',
          rewardGiven: Number(row.rewardGiven) === 1 ? 'Yes' : 'No',
          joinedAt: row.joinedAt || '',
        });
      });
      peopleSheet.getRow(1).font = {bold: true};
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
        WHERE 1=1
        ${demoDonationSql('d')}
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

    const challengeIdFilter = Number(req.query.challengeId || 0);

    if (type === 'users' || type === 'user') {
      await addUsers();
    } else if (type === 'japa') {
      await addJapa();
    } else if (
      type === 'challenges' ||
      type === 'challenge' ||
      type === 'challenge-progress' ||
      type === 'challenge_progress'
    ) {
      await addChallenges(
        Number.isFinite(challengeIdFilter) && challengeIdFilter > 0
          ? challengeIdFilter
          : undefined,
      );
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

const mapRewardRow = (row: any) => ({
  id: String(row.id),
  name: String(row.name || ''),
  stock: Number(row.stock || 0),
  active: Number(row.isActive ?? row.is_active ?? 1) === 1,
});

const ensureRewardSeed = async () => {
  try {
    const countRows = await mysql.query<any[]>(
      `SELECT COUNT(*) AS total FROM challenge_rewards`,
    );
    if (Number(countRows?.[0]?.total || 0) > 0) {
      return;
    }
    const defaults = [
      ['Rudraksha', 12, 1],
      ['Spatik mala', 5, 2],
      ['Pasupu kommuka maa', 0, 3],
      ['Green agate', 8, 4],
      ['Yellow agate', 3, 5],
      ['Tulasi mala', 7, 6],
    ];
    for (const [name, stock, order] of defaults) {
      await mysql.query(
        `
        INSERT INTO challenge_rewards (name, stock, is_active, display_order)
        VALUES (?, ?, 1, ?)
        `,
        [name, stock, order],
      );
    }
  } catch {
    // Table may not exist yet on older MySQL deploys.
  }
};

router.get('/rewards', async (_req: Request, res: Response) => {
  try {
    await ensureRewardSeed();
    const rows = await mysql.query<any[]>(`
      SELECT
        id,
        name,
        stock,
        is_active AS isActive
      FROM challenge_rewards
      ORDER BY display_order ASC, id ASC
    `);
    return res.json({
      success: true,
      data: (rows || []).map(mapRewardRow),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load rewards.',
    });
  }
});

router.put('/rewards/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid reward id.'});
    }
    const stock =
      req.body?.stock === undefined || req.body?.stock === null
        ? undefined
        : Math.max(0, Number(req.body.stock) || 0);
    const name = String(req.body?.name || '').trim();
    const active =
      req.body?.active === undefined
        ? undefined
        : req.body.active === true ||
          req.body.active === 1 ||
          req.body.active === '1';

    const current = await mysql.query<any[]>(
      `
      SELECT id, name, stock, is_active AS isActive
      FROM challenge_rewards
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    if (!current?.length) {
      return res.status(404).json({success: false, message: 'Reward not found.'});
    }

    await mysql.query(
      `
      UPDATE challenge_rewards
      SET
        name = ?,
        stock = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        name || current[0].name,
        stock === undefined ? Number(current[0].stock || 0) : stock,
        active === undefined
          ? Number(current[0].isActive ?? 1)
          : active
            ? 1
            : 0,
        id,
      ],
    );

    const rows = await mysql.query<any[]>(
      `
      SELECT id, name, stock, is_active AS isActive
      FROM challenge_rewards
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    return res.json({
      success: true,
      message: 'Reward updated successfully.',
      data: mapRewardRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update reward.',
    });
  }
});

router.post('/rewards', async (req: Request, res: Response) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Reward name is required.',
      });
    }
    const stock = Math.max(0, Number(req.body?.stock || 0) || 0);
    await mysql.query(
      `
      INSERT INTO challenge_rewards (name, stock, is_active, display_order)
      VALUES (?, ?, 1, ?)
      `,
      [name, stock, Number(req.body?.displayOrder || 99)],
    );
    const rows = await mysql.query<any[]>(`
      SELECT id, name, stock, is_active AS isActive
      FROM challenge_rewards
      ORDER BY id DESC
      LIMIT 1
    `);
    return res.status(201).json({
      success: true,
      message: 'Reward created successfully.',
      data: mapRewardRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to create reward.',
    });
  }
});

router.delete('/rewards/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid reward id.'});
    }
    const current = await mysql.query<any[]>(
      `SELECT id FROM challenge_rewards WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!current?.length) {
      return res.status(404).json({success: false, message: 'Reward not found.'});
    }
    await mysql.query(`DELETE FROM challenge_rewards WHERE id = ?`, [id]);
    return res.json({
      success: true,
      message: 'Reward deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to delete reward.',
    });
  }
});

const mapProductRow = (row: any) => ({
  id: String(row.id),
  name: String(row.name || ''),
  stock: Number(row.stock || 0),
  active: Number(row.isActive ?? row.is_active ?? 1) === 1,
});

const ensureProductsTable = async () => {
  try {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS spiritual_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch {
    try {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS spiritual_products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          stock INT NOT NULL DEFAULT 0,
          is_active TINYINT NOT NULL DEFAULT 1,
          display_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    } catch {
      // Table may already exist with engine-specific DDL.
    }
  }

  try {
    const countRows = await mysql.query<any[]>(
      `SELECT COUNT(*) AS total FROM spiritual_products`,
    );
    if (Number(countRows?.[0]?.total || 0) > 0) {
      return;
    }
    const defaults = [
      ['Rudraksha', 12, 1],
      ['Spatik mala', 5, 2],
      ['Pasupu kommuka maala', 0, 3],
      ['Tulasi mala', 0, 4],
    ];
    for (const [name, stock, order] of defaults) {
      await mysql.query(
        `
        INSERT INTO spiritual_products (name, stock, is_active, display_order)
        VALUES (?, ?, 1, ?)
        `,
        [name, stock, order],
      );
    }
  } catch {
    // Seed optional if table unavailable.
  }
};

router.get('/products', async (_req: Request, res: Response) => {
  try {
    await ensureProductsTable();
    const rows = await mysql.query<any[]>(`
      SELECT
        id,
        name,
        stock,
        is_active AS isActive
      FROM spiritual_products
      ORDER BY display_order ASC, id ASC
    `);
    return res.json({
      success: true,
      data: (rows || []).map(mapProductRow),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load products.',
    });
  }
});

router.post('/products', async (req: Request, res: Response) => {
  try {
    await ensureProductsTable();
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required.',
      });
    }
    const stock = Math.max(0, Number(req.body?.stock || 0) || 0);
    await mysql.query(
      `
      INSERT INTO spiritual_products (name, stock, is_active, display_order)
      VALUES (?, ?, 1, ?)
      `,
      [name, stock, Number(req.body?.displayOrder || 99)],
    );
    const rows = await mysql.query<any[]>(`
      SELECT id, name, stock, is_active AS isActive
      FROM spiritual_products
      ORDER BY id DESC
      LIMIT 1
    `);
    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: mapProductRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to create product.',
    });
  }
});

router.put('/products/:id', async (req: Request, res: Response) => {
  try {
    await ensureProductsTable();
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid product id.'});
    }
    const current = await mysql.query<any[]>(
      `
      SELECT id, name, stock, is_active AS isActive
      FROM spiritual_products
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    if (!current?.length) {
      return res.status(404).json({success: false, message: 'Product not found.'});
    }

    const name = String(req.body?.name || '').trim();
    const stock =
      req.body?.stock === undefined || req.body?.stock === null
        ? undefined
        : Math.max(0, Number(req.body.stock) || 0);

    await mysql.query(
      `
      UPDATE spiritual_products
      SET
        name = ?,
        stock = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        name || current[0].name,
        stock === undefined ? Number(current[0].stock || 0) : stock,
        id,
      ],
    );

    const rows = await mysql.query<any[]>(
      `
      SELECT id, name, stock, is_active AS isActive
      FROM spiritual_products
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    return res.json({
      success: true,
      message: 'Product updated successfully.',
      data: mapProductRow(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update product.',
    });
  }
});

router.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    await ensureProductsTable();
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid product id.'});
    }
    const current = await mysql.query<any[]>(
      `SELECT id FROM spiritual_products WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!current?.length) {
      return res.status(404).json({success: false, message: 'Product not found.'});
    }
    await mysql.query(`DELETE FROM spiritual_products WHERE id = ?`, [id]);
    return res.json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to delete product.',
    });
  }
});

router.get('/feedback', async (req: Request, res: Response) => {
  try {
    const feedbackService = (await import('../feedback/feedback.service'))
      .default;
    const rows = await feedbackService.getAll();
    const host = `${req.protocol}://${req.get('host')}`;
    return res.json({
      success: true,
      data: (rows || []).map((row: any) => ({
        id: String(row.id),
        name:
          String(row.userName || '').trim() || `User #${row.userId || '-'}`,
        userId: row.userId || null,
        mobileNumber: row.userMobile || '',
        email: row.userEmail || '',
        rating: `${Number(row.rating || 0)}★`,
        comment: row.message || row.title || '',
        videoUrl: row.videoUrl ? `${host}${row.videoUrl}` : null,
        status: 'Pending',
        createdAt: row.createdAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load feedback.',
    });
  }
});

router.get('/support-tickets', async (req: Request, res: Response) => {
  try {
    const customerCareService = (
      await import('../customerCare/customerCare.service')
    ).default;
    const rows = await customerCareService.getAll();
    const host = `${req.protocol}://${req.get('host')}`;
    return res.json({
      success: true,
      data: (rows || []).map((row: any) => ({
        id: String(row.id),
        code: `TK${row.id}`,
        userId: row.userId || null,
        userName:
          String(row.userName || '').trim() ||
          (row.userId ? `User #${row.userId}` : 'Unknown'),
        subject: row.subject || '',
        message: row.message || '',
        screenshotUrl: row.screenshotUrl
          ? `${host}${row.screenshotUrl}`
          : null,
        status:
          String(row.status || '').toUpperCase() === 'RESOLVED' ||
          String(row.status || '').toUpperCase() === 'CLOSED'
            ? 'Resolved'
            : 'Pending',
        createdAt: row.createdAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load support tickets.',
    });
  }
});

export default router;
