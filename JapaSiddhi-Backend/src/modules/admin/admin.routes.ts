import {Router, Request, Response} from 'express';
import rateLimit from 'express-rate-limit';

import mysql from '../../database/mysql';
import adminAccountService from './adminAccount.service';
import {ensureDonationColumns} from '../payments/razorpay.service';
import {demoDonationSql, demoUserSql} from '../../utils/demoData';
import {ensureRegionColumn} from '../profile/profile.repository';

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

/** Blank or invalid admin target counts stay empty instead of a filled-in number. */
const positiveCount = (value: unknown) => {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
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

    const engine = mysql.getEngineName() || 'sqlite';
    const japaTodayRows = await mysql.query<any[]>(`
      SELECT IFNULL(SUM(session_count), 0) AS todayJapa
      FROM japa_sessions
      WHERE ${istDay(engine, 'created_at')} = ${istToday(engine)}
      AND (
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
    const japaToday = num(japaTodayRows?.[0]?.todayJapa);
    const orders = num(ordersRows?.[0]?.totalOrders);
    const donations = num(donationsRows?.[0]?.totalDonations);

    return res.json({
      success: true,
      data: {
        users,
        japa,
        japaToday,
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

  const idNum = Number(row.id) || 0;
  const userCode =
    String(row.userCode || row.user_code || '').trim() ||
    (idNum > 0 ? `BPJS${String(idNum).padStart(2, '0')}` : '');

  return {
    id: String(row.id),
    userCode,
    name: row.fullName || 'Devotee',
    email: row.email || '',
    mobile: country && mobile ? `+${country} ${mobile}` : mobile || '—',
    mobileCountryCode: country,
    mobileNumber: mobile,
    appVersion: String(row.appVersion || row.app_version || '').trim(),
    japaCount: num(row.japaCount),
    status,
    accountStatus: statusRaw,
    enrolledOn: enrolledOnValue(row.enrolledOn || row.enrolled_on),
  };
};

const enrolledOnValue = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = String(value.getFullYear());
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};

/** IST calendar day a user registered, returned as YYYY-MM-DD text. */
const enrolledOnSql = (engine: string) =>
  engine === 'mysql'
    ? `DATE_FORMAT(DATE(DATE_ADD(u.created_at, INTERVAL 330 MINUTE)), '%Y-%m-%d')`
    : `date(u.created_at, '+5 hours', '30 minutes')`;

router.get('/users', async (_req: Request, res: Response) => {
  try {
    const engine = mysql.getEngineName() || 'sqlite';
    const rows = await mysql.query<any[]>(`
      SELECT
        u.id,
        u.user_code AS userCode,
        u.full_name AS fullName,
        u.email,
        u.mobile_country_code AS mobileCountryCode,
        u.mobile_number AS mobileNumber,
        u.account_status AS accountStatus,
        ${enrolledOnSql(engine)} AS enrolledOn,
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
    const engine = mysql.getEngineName() || 'sqlite';
    const rows = await mysql.query<any[]>(`
      SELECT
        u.id,
        u.user_code AS userCode,
        u.full_name AS fullName,
        u.email,
        u.mobile_country_code AS mobileCountryCode,
        u.mobile_number AS mobileNumber,
        u.account_status AS accountStatus,
        u.deleted_at AS deletedAt,
        ${enrolledOnSql(engine)} AS enrolledOn,
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
        u.user_code AS userCode,
        u.full_name AS fullName,
        u.email,
        u.mobile_country_code AS mobileCountryCode,
        u.mobile_number AS mobileNumber,
        u.account_status AS accountStatus,
        u.app_version AS appVersion,
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

const parseJsonSafely = (val: any) => {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    const res = JSON.parse(val);
    return typeof res === 'object' && res !== null ? res : null;
  } catch {
    return null;
  }
};

const mapMantraRow = (row: any) => ({
  id: String(row.id),
  name: row.mantraName || '',
  subtitle: row.deityName || 'Community mantra',
  deityName: row.deityName || '',
  sanskritText: row.sanskritText || '',
  transliteration: row.transliteration || '',
  target: num(row.defaultJapaCount),
  active: Number(row.isActive) === 1 || row.isActive === true,
  isFeatured: Number(row.isFeatured) === 1 || row.isFeatured === true,
  translations: parseJsonSafely(row.translations),
  japaList: row.japaList || 'SAMUHIKA',
  categoryCode: row.categoryCode || '',
});

router.get('/mantra-categories', async (_req: Request, res: Response) => {
  try {
    const mantraRepository = (await import('../mantra/mantra.repository')).default;
    const rows = await mantraRepository.listCategories();
    return res.json({success: true, data: rows});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load categories.',
    });
  }
});

router.post('/mantra-categories', async (req: Request, res: Response) => {
  try {
    const mantraRepository = (await import('../mantra/mantra.repository')).default;
    const result = await mantraRepository.createCategory(String(req.body?.name || ''));
    if (result.error || !result.category) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Could not add the category.',
      });
    }
    return res.status(201).json({
      success: true,
      message: 'Category added.',
      data: result.category,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to add the category.',
    });
  }
});

router.put('/mantra-categories/:code', async (req: Request, res: Response) => {
  try {
    const mantraRepository = (await import('../mantra/mantra.repository')).default;
    const result = await mantraRepository.renameCategory(
      String(req.params.code || ''),
      String(req.body?.name || ''),
    );
    if (result.error || !result.category) {
      const missing = result.error === 'Category not found.';
      return res.status(missing ? 404 : 400).json({
        success: false,
        message: result.error || 'Could not save the category.',
      });
    }
    return res.json({
      success: true,
      message: 'Category updated.',
      data: result.category,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to save the category.',
    });
  }
});

router.delete('/mantra-categories/:code', async (req: Request, res: Response) => {
  try {
    const mantraRepository = (await import('../mantra/mantra.repository')).default;
    const removed = await mantraRepository.deleteCategory(String(req.params.code || ''));
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }
    return res.json({
      success: true,
      message: 'Category deleted from the database.',
      data: removed,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to delete the category.',
    });
  }
});

router.get('/mantras', async (req: Request, res: Response) => {
  try {
    const mantraRepository = (await import('../mantra/mantra.repository'))
      .default;
    // Admin sees all mantras (active + inactive). Users only get active ones.
    const rows = await mantraRepository.getAllMantras(
      String(req.query.list || ''),
    );
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
    const {normalizeMantraCategory, normalizeMantraList} = await import(
      '../mantra/mantraCategories'
    );
    const japaList = normalizeMantraList(req.body?.japaList);
    const categoryCode = normalizeMantraCategory(req.body?.categoryCode);
    if (!japaList || !categoryCode) {
      return res.status(400).json({
        success: false,
        message: 'Choose Samuhika or Antharanga, and a mantra category.',
      });
    }
    const mantraRepository = (await import('../mantra/mantra.repository'))
      .default;
    const created = await mantraRepository.create({
      mantraName,
      deityName: req.body?.deityName || req.body?.subtitle,
      sanskritText: req.body?.sanskritText,
      transliteration: req.body?.transliteration,
      defaultJapaCount: positiveCount(req.body?.defaultJapaCount ?? req.body?.target),
      isActive: req.body?.isActive !== false && req.body?.active !== false,
      isFeatured: Boolean(req.body?.isFeatured),
      translations: req.body?.translations,
      japaList,
      categoryCode,
    });
    const mapped = mapMantraRow(created);
    try {
      const {notifyAdminContentCreated} = await import(
        './adminNotification.service'
      );
      await notifyAdminContentCreated({
        kind: 'mantra',
        id: mapped.id,
        name: mapped.name || mantraName,
      });
    } catch (err) {
      console.warn('Mantra create notify failed:', err);
    }
    return res.status(201).json({
      success: true,
      message: 'Mantra created successfully.',
      data: mapped,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to create mantra.',
    });
  }
});

router.put('/mantras/:id/category', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid mantra id.'});
    }
    const mantraRepository = (await import('../mantra/mantra.repository'))
      .default;
    const updated = await mantraRepository.setCategory(
      id,
      String(req.body?.categoryCode || ''),
    );
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Choose a mantra category.',
      });
    }
    return res.json({
      success: true,
      message: 'Mantra moved.',
      data: mapMantraRow(updated),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to move mantra.',
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
      req.body?.isFeatured == null &&
      req.body?.translations == null;

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
              ? positiveCount(req.body?.defaultJapaCount ?? req.body?.target)
              : undefined,
          isActive: nextActive,
          isFeatured:
            req.body?.isFeatured != null
              ? Boolean(req.body.isFeatured)
              : undefined,
          translations: req.body?.translations,
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
      message: 'Mantra deleted from the database.',
      data: {id: String(deleted.id), name: deleted.mantraName || ''},
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
    detail:
      row.description ||
      (Number(row.targetValue) > 0
        ? `${Number(row.targetValue).toLocaleString('en-IN')} target`
        : ''),
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
    translations: parseJsonSafely(row.translations),
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
        c.translations,
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
        c.is_active,
        c.translations
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

    const targetValue = positiveCount(req.body?.targetValue ?? req.body?.target);
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

    const translations =
      typeof req.body?.translations === 'object'
        ? JSON.stringify(req.body.translations)
        : req.body?.translations || null;

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
        translations,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
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
        translations,
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
        translations,
        is_active AS isActive
      FROM challenges
      ORDER BY id DESC
      LIMIT 1`,
    );

    const mapped = mapChallengeRow(created[0]);
    // Await notify so Render does not cut off the work when the HTTP response ends.
    let notify: any = null;
    try {
      const {notifyAdminContentCreated} = await import(
        './adminNotification.service'
      );
      notify = await notifyAdminContentCreated({
        kind: 'challenge',
        id: mapped.id,
        name: mapped.title || title,
      });
      console.log('Challenge create notify result:', notify);
    } catch (err) {
      console.warn('Challenge create notify failed:', err);
      notify = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
    return res.status(201).json({
      success: true,
      message: 'Challenge created successfully.',
      data: mapped,
      notify,
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
      targetValue = positiveCount(req.body?.targetValue ?? req.body?.target);
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

    const translations =
      req.body?.translations !== undefined
        ? typeof req.body.translations === 'object'
          ? JSON.stringify(req.body.translations)
          : req.body.translations || null
        : current.translations;

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
        translations = ?,
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
        translations,
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
        translations,
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
      translations: req.body?.translations,
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
      startsAt: req.body?.startsAt,
      translations: req.body?.translations,
    });
    try {
      const {notifyAdminContentCreated} = await import(
        './adminNotification.service'
      );
      await notifyAdminContentCreated({
        kind: 'banner',
        id: data?.id,
        name: String(data?.title || req.body?.title || 'Home update'),
      });
    } catch (err) {
      console.warn('Banner create notify failed:', err);
    }
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
      startsAt: req.body?.startsAt,
      translations: req.body?.translations,
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
  if (value === 'SHIPPED') {
    return 'Shipped';
  }
  if (value === 'CONFIRMED' || value === 'PROCESSING' || value === 'READY') {
    return 'Confirmed';
  }
  if (value === 'CANCELLED' || value === 'CANCELED') {
    return 'Cancelled';
  }
  if (value === 'UNDER_REVIEW' || value === 'PENDING') {
    return 'Under Review';
  }
  return 'Under Review';
};

const fromAdminOrderStatus = (raw: string) => {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'delivered') {
    return 'DELIVERED';
  }
  if (value === 'shipped') {
    return 'SHIPPED';
  }
  if (value === 'confirmed' || value === 'confirm' || value === 'processing' || value === 'ready') {
    return 'CONFIRMED';
  }
  if (value === 'under review' || value === 'under_review' || value === 'pending') {
    return 'UNDER_REVIEW';
  }
  return 'CONFIRMED';
};

/** Reward orders are earned from a challenge or a japa milestone, not purchased. */
const isRewardOrder = (row: any) => {
  const source = String(row.orderSource || '').toUpperCase();
  const type = String(row.orderType || '').toUpperCase();
  const number = String(row.orderNumber || '').toUpperCase();
  const remarks = String(row.remarks || '').toLowerCase();
  if (source === 'CHALLENGE' || source === 'MILESTONE') {
    return true;
  }
  if (number.startsWith('RW')) {
    return true;
  }
  if (remarks.includes('challenge reward') || remarks.includes('milestone reward')) {
    return true;
  }
  return type === 'SPIRITUAL_PRODUCT' && source !== 'ADMIN_GIFT' && source !== 'PURCHASE';
};

const isNormalBaanalingamOrder = (row: any) => {
  if (isRewardOrder(row)) {
    return false;
  }
  const type = String(row.orderType || '').toUpperCase();
  const item = String(row.itemName || '').toLowerCase();
  const number = String(row.orderNumber || '').toUpperCase();
  return (
    type === 'BANA_LINGAM' ||
    type === 'RAMAKOTI_BOOKS' ||
    type === 'HOMA_BHASMA' ||
    type === 'BIRAVA_PENDANT' ||
    number.startsWith('BL-') ||
    number.startsWith('RK') ||
    number.startsWith('HB') ||
    number.startsWith('BP') ||
    item.includes('baanalingam') ||
    item.includes('banalingam') ||
    item.includes('ramakoti') ||
    item.includes('homa bhasma') ||
    item.includes('birava')
  );
};

const cleanTimestamp = (raw: any): string | null => {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const match = str.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return str.replace(/\.\d+.*$/, '').trim() || str;
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
    cancelReason: row.cancelReason || '',
    cancelledBy: row.cancelledBy || '',
    createdAt: cleanTimestamp(row.createdAt),
    orderType: row.orderType || '',
    orderSource: row.orderSource || '',
    orderGroup: isRewardOrder(row)
      ? 'reward'
      : isNormalBaanalingamOrder(row)
        ? 'normal'
        : 'other',
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
    updatedAt: cleanTimestamp(row.updatedAt),
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
    o.cancel_reason AS cancelReason,
    o.cancelled_by AS cancelledBy,
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

const ensureOrderCancelColumns = async () => {
  const alters = [
    'ALTER TABLE orders ADD COLUMN cancel_reason TEXT NULL',
    'ALTER TABLE orders ADD COLUMN cancelled_by TEXT NULL',
  ];
  for (const sql of alters) {
    try {
      await mysql.query(sql);
    } catch {
      // Column already exists.
    }
  }
};

router.get('/orders', async (_req: Request, res: Response) => {
  try {
    await ensureOrderCancelColumns();
    const rows = await mysql.query<any[]>(`
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.order_type AS orderType,
        o.order_source AS orderSource,
        o.item_name AS itemName,
        o.quantity,
        o.payment_status AS paymentStatus,
        o.order_status AS orderStatus,
        o.remarks,
        o.cancel_reason AS cancelReason,
        o.cancelled_by AS cancelledBy,
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
    await ensureOrderCancelColumns();
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

router.put('/orders/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid order id.'});
    }
    await ensureOrderCancelColumns();
    const existing = await mysql.query<any[]>(
      `SELECT id, order_status AS orderStatus FROM orders WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!existing?.length) {
      return res.status(404).json({success: false, message: 'Order not found.'});
    }
    const status = String(existing[0].orderStatus || '').toUpperCase();
    if (status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Delivered orders cannot be cancelled.',
      });
    }
    if (status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'This order is already cancelled.',
      });
    }
    await mysql.query(
      `
      UPDATE orders
      SET order_status = 'CANCELLED',
          cancelled_by = 'ADMIN',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [id],
    );
    return res.json({success: true, message: 'Order cancelled.'});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to cancel order.',
    });
  }
});

router.delete('/orders/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid order id.'});
    }
    const existing = await mysql.query<any[]>(
      `SELECT id, order_status AS orderStatus FROM orders WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!existing?.length) {
      return res.status(404).json({success: false, message: 'Order not found.'});
    }
    if (String(existing[0].orderStatus || '').toUpperCase() !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be deleted.',
      });
    }
    for (const sql of [
      'DELETE FROM bana_lingam WHERE order_id = ?',
      'DELETE FROM challenge_reward_claims WHERE order_id = ?',
    ]) {
      try {
        await mysql.query(sql, [id]);
      } catch {
        // Related table may not exist on older databases.
      }
    }
    await mysql.query('DELETE FROM orders WHERE id = ?', [id]);
    return res.json({success: true, message: 'Delivered order deleted.'});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to delete order.',
    });
  }
});

router.put('/orders/:id/confirm', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({success: false, message: 'Invalid order id.'});
    }
    const existing = await mysql.query<any[]>(`
      SELECT id FROM orders WHERE id = ? LIMIT 1
    `, [id]);
    if (!existing?.length) {
      return res.status(404).json({success: false, message: 'Order not found.'});
    }

    await mysql.query(
      `
      UPDATE orders
      SET order_status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [id],
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
      message: 'Order confirmed successfully.',
      data: mapOrderDetail(rows[0]),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to confirm order.',
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
      : engine === 'postgres'
        ? `SELECT COALESCE(SUM(amount), 0) AS total FROM donations d
           WHERE ${successFilter}
             AND to_char((COALESCE(donated_at, created_at))::timestamp, 'YYYY-MM')
               = to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), 'YYYY-MM')
             ${demoDonationFilter}`
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

const remarkField = (remarks: string, label: string) => {
  const match = String(remarks || '').match(new RegExp(`${label}:\\s*([^|]+)`, 'i'));
  return match ? match[1].trim() : '';
};

const exportMonth = (value: unknown) => {
  const month = String(value || '').replace(/\D/g, '').padStart(2, '0').slice(-2);
  return /^(0[1-9]|1[0-2])$/.test(month) ? month : '';
};

router.get('/payment-reports/export', async (req: Request, res: Response) => {
  try {
    const ExcelJS = (await import('exceljs')).default;
    const fs = await import('fs');
    const path = await import('path');
    const {uploadsRoot} = await import('../../middleware/upload.middleware');

    const summary = await buildPaymentReportRows();
    await ensureDonationColumns();
    const donations = await mysql.query<any[]>(`
      SELECT
        d.id,
        d.remarks,
        IFNULL(NULLIF(d.donor_name, ''), IFNULL(u.full_name, 'Devotee')) AS donorName,
        IFNULL(NULLIF(d.donor_phone, ''), IFNULL(u.mobile_number, '')) AS donorPhone,
        IFNULL(d.prefer_date, '') AS preferDate,
        IFNULL(d.occasion, '') AS occasion,
        IFNULL(d.for_whom, '') AS forWhom,
        IFNULL(d.person_name, '') AS personName,
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
      {header: 'Serial No', key: 'sno', width: 12},
      {header: 'Name', key: 'donorName', width: 24},
      {header: 'Phone', key: 'donorPhone', width: 16},
      {header: 'Prefer date', key: 'preferDate', width: 16},
      {header: 'Occasion', key: 'occasion', width: 18},
      {header: 'For whom', key: 'forWhom', width: 16},
      {header: 'Person name', key: 'personName', width: 24},
      {header: 'Type', key: 'donationType', width: 16},
      {header: 'Amount', key: 'amount', width: 12},
      {header: 'Payment Status', key: 'paymentStatus', width: 16},
      {header: 'Donation Status', key: 'donationStatus', width: 16},
      {header: 'Method', key: 'paymentMethod', width: 14},
      {header: 'Txn ID', key: 'transactionId', width: 28},
      {header: 'Donated At', key: 'donatedAt', width: 22},
    ];
    (donations || []).forEach((row: any, index: number) =>
      detailSheet.addRow({
        sno: index + 1,
        donorName: row.donorName || remarkField(row.remarks, 'Name') || 'Devotee',
        donorPhone: row.donorPhone || remarkField(row.remarks, 'Phone'),
        preferDate: row.preferDate || remarkField(row.remarks, 'Prefer date'),
        occasion: row.occasion || remarkField(row.remarks, 'Occasion'),
        forWhom: row.forWhom || remarkField(row.remarks, 'For whom'),
        personName: row.personName || remarkField(row.remarks, 'Person name'),
        donationType: row.donationType,
        amount: row.amount,
        paymentStatus: row.paymentStatus,
        donationStatus: row.donationStatus,
        paymentMethod: row.paymentMethod,
        transactionId: row.transactionId,
        donatedAt: row.donatedAt,
      }),
    );
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

const loadRegionAnalytics = async (region?: string) => {
  await ensureRegionColumn();
  const placeRows = await mysql.query<any[]>(`
    SELECT MIN(TRIM(u.region)) AS region
    FROM users u
    WHERE u.deleted_at IS NULL
      AND TRIM(COALESCE(u.region, '')) != ''
      ${demoUserSql('u')}
    GROUP BY LOWER(TRIM(u.region))
    ORDER BY 1
  `);
  const regions = (placeRows || [])
    .map((row: any) => String(row.region || '').trim())
    .filter(Boolean);
  const selected = String(region || '').trim();
  if (!selected) {
    return {
      regions,
      selected: '',
      people: 0,
      japaCount: 0,
      mantras: [] as Array<{name: string; japaCount: number; people: number}>,
      peopleRows: [] as Array<{
        name: string;
        phone: string;
        japaCount: number;
        mantras: string;
      }>,
    };
  }

  // Match the same LOWER(TRIM(...)) key used to build the dropdown.
  // Order by expressions (not camelCase aliases) so Postgres stays happy.
  const peopleRowsRaw = await mysql.query<any[]>(
    `
    SELECT
      u.id AS user_id,
      u.full_name AS full_name,
      u.mobile_country_code AS country_code,
      u.mobile_number AS mobile,
      COALESCE(SUM(js.session_count), 0) AS japa_count
    FROM users u
    LEFT JOIN japa_sessions js ON js.user_id = u.id
    WHERE u.deleted_at IS NULL
      AND LOWER(TRIM(COALESCE(u.region, ''))) = LOWER(TRIM(?))
      ${demoUserSql('u')}
    GROUP BY u.id, u.full_name, u.mobile_country_code, u.mobile_number
    ORDER BY COALESCE(SUM(js.session_count), 0) DESC, u.full_name ASC
    `,
    [selected],
  );

  const mantraRows = await mysql.query<any[]>(
    `
    SELECT
      js.user_id AS user_id,
      COALESCE(
        m.mantra_name,
        upm.mantra_name,
        CASE
          WHEN js.mantra_type = 'PERSONAL' THEN 'Private Japa'
          ELSE 'Japa'
        END
      ) AS mantra,
      COALESCE(SUM(js.session_count), 0) AS japa_count
    FROM japa_sessions js
    INNER JOIN users u ON u.id = js.user_id
    LEFT JOIN mantras m ON m.id = js.mantra_id
    LEFT JOIN user_personal_mantras upm ON upm.id = js.personal_mantra_id
    WHERE u.deleted_at IS NULL
      AND LOWER(TRIM(COALESCE(u.region, ''))) = LOWER(TRIM(?))
      ${demoUserSql('u')}
    GROUP BY js.user_id, m.mantra_name, upm.mantra_name, js.mantra_type
    HAVING COALESCE(SUM(js.session_count), 0) > 0
    `,
    [selected],
  );

  const mantrasByUser = new Map<number, Array<{name: string; japaCount: number}>>();
  const mantraTotals = new Map<string, {japaCount: number; people: Set<number>}>();
  (mantraRows || []).forEach((row: any) => {
    const userId = Number(row.user_id ?? row.userId ?? 0);
    const name = String(row.mantra || 'Japa').trim() || 'Japa';
    const count = Number(row.japa_count ?? row.japaCount ?? 0);
    if (!userId || count <= 0) {
      return;
    }
    const list = mantrasByUser.get(userId) || [];
    list.push({name, japaCount: count});
    mantrasByUser.set(userId, list);
    const total = mantraTotals.get(name) || {japaCount: 0, people: new Set<number>()};
    total.japaCount += count;
    total.people.add(userId);
    mantraTotals.set(name, total);
  });

  const peopleRows = (peopleRowsRaw || []).map((row: any) => {
    const userId = Number(row.user_id ?? row.userId ?? 0);
    const code = String(row.country_code ?? row.countryCode ?? '').replace(/\D/g, '');
    const mobile = String(row.mobile || '').replace(/\D/g, '');
    const chants = (mantrasByUser.get(userId) || [])
      .sort((a, b) => b.japaCount - a.japaCount)
      .map(item => `${item.name} (${item.japaCount})`);
    return {
      name: String(row.full_name ?? row.fullName ?? '').trim() || `User #${userId}`,
      phone: mobile ? `${code ? `+${code} ` : ''}${mobile}` : '',
      japaCount: Number(row.japa_count ?? row.japaCount ?? 0),
      mantras: chants.join(', '),
    };
  });

  const mantras = Array.from(mantraTotals.entries())
    .map(([name, total]) => ({
      name,
      japaCount: total.japaCount,
      people: total.people.size,
    }))
    .sort((a, b) => b.japaCount - a.japaCount);

  return {
    regions,
    selected,
    people: peopleRows.length,
    japaCount: peopleRows.reduce((sum, row) => sum + row.japaCount, 0),
    mantras,
    peopleRows,
  };
};

router.get('/region-analytics', async (req: Request, res: Response) => {
  try {
    const data = await loadRegionAnalytics(String(req.query.region || ''));
    return res.json({
      success: true,
      data: {
        regions: data.regions,
        selected: data.selected,
        people: data.people,
        japaCount: data.japaCount,
        mantras: data.mantras,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load region analytics.',
    });
  }
});

router.get('/dob-details', async (req: Request, res: Response) => {
  try {
    await mysql.query('SELECT 1');
    const type = String(req.query.type || '')
      .trim()
      .toLowerCase();
    const span = String(req.query.month || '').trim().toLowerCase();
    const allYear = span === 'year' || span === 'all' || span === 'total';
    const month = allYear ? '' : exportMonth(req.query.month);
    if (
      type !== 'birthdays' &&
      type !== 'jayanthi' &&
      type !== 'vardhanti' &&
      type !== 'anniversary'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Select birthdays, jayanthi, vardhanti, or anniversary.',
      });
    }
    if (!allYear && !month) {
      return res.status(400).json({
        success: false,
        message: 'Select a month or Total year.',
      });
    }

    const phoneOf = (code: string, number: string) =>
      `${String(code || '').trim()}${String(number || '').trim()}`.trim();

    if (type === 'birthdays') {
      const rows = await mysql.query<any[]>(
        `
        SELECT
          u.id,
          u.full_name AS fullName,
          IFNULL(u.mobile_country_code, '') AS mobileCountryCode,
          IFNULL(u.mobile_number, '') AS mobileNumber,
          u.date_of_birth AS dateOfBirth
        FROM users u
        WHERE u.deleted_at IS NULL
          AND substr(IFNULL(u.date_of_birth, ''), 6, 2) <> ''
          ${allYear ? '' : "AND substr(IFNULL(u.date_of_birth, ''), 6, 2) = ?"}
          ${demoUserSql('u')}
        ORDER BY substr(u.date_of_birth, 6, 2), substr(u.date_of_birth, 9, 2), u.full_name
        `,
        allYear ? [] : [month],
      );
      return res.json({
        success: true,
        data: {
          type,
          month: allYear ? 'year' : month,
          people: (rows || []).map((row: any) => ({
            id: String(row.id),
            fullName: row.fullName || 'Devotee',
            phone: phoneOf(row.mobileCountryCode, row.mobileNumber),
            date: row.dateOfBirth || '',
          })),
        },
      });
    }

    await ensureDonationColumns();
    const occasionTitle =
      type === 'jayanthi'
        ? 'Jayanthi'
        : type === 'vardhanti'
          ? 'Vardhanti'
          : 'Anniversary';
    const rows = await mysql.query<any[]>(
      `
      SELECT
        d.id,
        IFNULL(NULLIF(d.donor_name, ''), IFNULL(u.full_name, 'Devotee')) AS fullName,
        IFNULL(NULLIF(d.donor_phone, ''), IFNULL(u.mobile_number, '')) AS donorPhone,
        IFNULL(u.mobile_country_code, '') AS mobileCountryCode,
        IFNULL(u.mobile_number, '') AS mobileNumber,
        IFNULL(d.prefer_date, '') AS preferDate,
        IFNULL(d.for_whom, '') AS forWhom,
        IFNULL(d.person_name, '') AS personName,
        d.remarks
      FROM donations d
      LEFT JOIN users u ON u.id = d.user_id
      WHERE lower(IFNULL(d.occasion, '')) = lower(?)
        AND substr(IFNULL(d.prefer_date, ''), 6, 2) <> ''
        ${allYear ? '' : "AND substr(IFNULL(d.prefer_date, ''), 6, 2) = ?"}
        ${demoDonationSql('d')}
      ORDER BY substr(IFNULL(d.prefer_date, ''), 6, 2), d.prefer_date, d.id
      `,
      allYear ? [occasionTitle] : [occasionTitle, month],
    );
    return res.json({
      success: true,
      data: {
        type,
        month: allYear ? 'year' : month,
        people: (rows || []).map((row: any) => {
          const remarkPhone = remarkField(row.remarks, 'Phone');
          const phone =
            String(row.donorPhone || '').trim() ||
            phoneOf(row.mobileCountryCode, row.mobileNumber) ||
            remarkPhone;
          return {
            id: String(row.id),
            fullName:
              row.fullName || remarkField(row.remarks, 'Name') || 'Devotee',
            phone,
            date: row.preferDate || remarkField(row.remarks, 'Prefer date'),
            forWhom: row.forWhom || remarkField(row.remarks, 'For whom'),
            personName:
              row.personName || remarkField(row.remarks, 'Person name'),
          };
        }),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load DOB details.',
    });
  }
});

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
      await ensureDonationColumns();
      const rows = await mysql.query<any[]>(`
        SELECT
          d.id,
          d.remarks,
          IFNULL(NULLIF(d.donor_name, ''), IFNULL(u.full_name, 'Devotee')) AS donorName,
          IFNULL(NULLIF(d.donor_phone, ''), IFNULL(u.mobile_number, '')) AS donorPhone,
          IFNULL(d.prefer_date, '') AS preferDate,
          IFNULL(d.occasion, '') AS occasion,
          IFNULL(d.for_whom, '') AS forWhom,
          IFNULL(d.person_name, '') AS personName,
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
        {header: 'Serial No', key: 'sno', width: 12},
        {header: 'Name', key: 'donorName', width: 24},
        {header: 'Phone', key: 'donorPhone', width: 16},
        {header: 'Prefer date', key: 'preferDate', width: 16},
        {header: 'Occasion', key: 'occasion', width: 18},
        {header: 'For whom', key: 'forWhom', width: 16},
        {header: 'Person name', key: 'personName', width: 24},
        {header: 'Type', key: 'donationType', width: 16},
        {header: 'Amount', key: 'amount', width: 12},
        {header: 'Payment Status', key: 'paymentStatus', width: 16},
        {header: 'Donation Status', key: 'donationStatus', width: 16},
        {header: 'Method', key: 'paymentMethod', width: 14},
        {header: 'Txn ID', key: 'transactionId', width: 28},
        {header: 'Donated At', key: 'donatedAt', width: 22},
      ];
      (rows || []).forEach((row: any, index: number) =>
        sheet.addRow({
          sno: index + 1,
          donorName: row.donorName || remarkField(row.remarks, 'Name') || 'Devotee',
          donorPhone: row.donorPhone || remarkField(row.remarks, 'Phone'),
          preferDate: row.preferDate || remarkField(row.remarks, 'Prefer date'),
          occasion: row.occasion || remarkField(row.remarks, 'Occasion'),
          forWhom: row.forWhom || remarkField(row.remarks, 'For whom'),
          personName: row.personName || remarkField(row.remarks, 'Person name'),
          donationType: row.donationType,
          amount: row.amount,
          paymentStatus: row.paymentStatus,
          donationStatus: row.donationStatus,
          paymentMethod: row.paymentMethod,
          transactionId: row.transactionId,
          donatedAt: row.donatedAt,
        }),
      );
      sheet.getRow(1).font = {bold: true};
    };

    const addSevaDonationsSheet = async (query: any) => {
      await ensureDonationColumns();
      const sevaType = String(query.sevaType || query.type || 'ALL').toUpperCase();
      const scope = String(query.scope || 'all').toLowerCase();
      const preferDate = String(query.preferDate || '').trim();

      const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      const whereClauses: string[] = ["UPPER(IFNULL(d.payment_status, 'SUCCESS')) = 'SUCCESS'"];
      const params: any[] = [];

      if (sevaType === 'ANNADANAM') {
        whereClauses.push(
          "(UPPER(IFNULL(d.donation_type, '')) IN ('ANNADANAM', 'GENERAL') OR LOWER(IFNULL(d.remarks, '')) LIKE '%anna%' OR LOWER(IFNULL(d.remarks, '')) LIKE '%santharpana%' OR LOWER(IFNULL(d.remarks, '')) LIKE '%annadanam%')",
        );
        whereClauses.push("LOWER(IFNULL(d.remarks, '')) NOT LIKE '%homam%'");
      } else if (sevaType === 'NITHYA_HOMAM') {
        whereClauses.push(
          "(UPPER(IFNULL(d.donation_type, '')) = 'NITHYA_HOMAM' OR LOWER(IFNULL(d.remarks, '')) LIKE '%homam%')",
        );
      }

      if (preferDate && /^\d{4}-\d{2}-\d{2}$/.test(preferDate)) {
        whereClauses.push('d.prefer_date = ?');
        params.push(preferDate);
      }

      const effectiveDateExprWithD = "COALESCE(NULLIF(d.prefer_date, ''), SUBSTR(IFNULL(d.donated_at, ''), 1, 10))";

      if (scope === 'upcoming') {
        whereClauses.push(`${effectiveDateExprWithD} >= ?`);
        params.push(today);
      } else if (scope === 'past') {
        whereClauses.push(`${effectiveDateExprWithD} < ?`);
        params.push(today);
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const orderSql =
        scope === 'upcoming'
          ? `ORDER BY ${effectiveDateExprWithD} ASC, d.id ASC`
          : `ORDER BY ${effectiveDateExprWithD} DESC, d.id DESC`;

      const rows = await mysql.query<any[]>(
        `
        SELECT
          d.id,
          IFNULL(NULLIF(d.donor_name, ''), IFNULL(u.full_name, 'Devotee')) AS donorName,
          IFNULL(NULLIF(d.donor_phone, ''), IFNULL(u.mobile_number, '')) AS donorPhone,
          d.donation_type AS donationType,
          d.amount,
          IFNULL(d.prefer_date, '') AS preferDate,
          IFNULL(d.occasion, '') AS occasion,
          IFNULL(d.for_whom, '') AS forWhom,
          IFNULL(d.person_name, '') AS personName,
          d.remarks,
          d.transaction_id AS transactionId,
          IFNULL(d.donated_at, d.created_at) AS donatedAt,
          d.admin_reply AS adminReply,
          d.admin_replied_at AS adminRepliedAt
        FROM donations d
        LEFT JOIN users u ON u.id = d.user_id
        ${whereSql}
        ${orderSql}
        LIMIT 10000
        `,
        params,
      );

      const sheetName =
        sevaType === 'ANNADANAM'
          ? 'Anna Santharpana'
          : sevaType === 'NITHYA_HOMAM'
          ? 'Nithya Homam'
          : 'Seva Offerings';

      const sheet = workbook.addWorksheet(sheetName);
      sheet.columns = [
        {header: 'S.No', key: 'sno', width: 8},
        {header: 'Devotee Name', key: 'donorName', width: 24},
        {header: 'Mobile Number', key: 'donorPhone', width: 16},
        {header: 'Seva', key: 'sevaName', width: 20},
        {header: 'Prefer Date', key: 'preferDate', width: 14},
        {header: 'Timing', key: 'timing', width: 12},
        {header: 'Occasion / Purpose', key: 'occasion', width: 20},
        {header: 'For Whom', key: 'forWhom', width: 16},
        {header: 'Person Name', key: 'personName', width: 22},
        {header: 'Amount (₹)', key: 'amount', width: 14},
        {header: 'Comments / Remarks', key: 'remarks', width: 35},
        {header: 'Txn ID', key: 'transactionId', width: 26},
        {header: 'Donated At', key: 'donatedAt', width: 20},
        {header: 'Admin Reply', key: 'adminReply', width: 30},
        {header: 'Replied At', key: 'adminRepliedAt', width: 18},
      ];

      (rows || []).forEach((row: any, index: number) => {
        const isUp = row.preferDate && row.preferDate > today;
        const timing = isUp ? 'Upcoming' : row.preferDate ? 'Past' : '—';
        const sevaLabel =
          row.donationType === 'ANNADANAM'
            ? 'Anna Santharpana'
            : row.donationType === 'NITHYA_HOMAM'
            ? 'Nithya Homam'
            : 'Seva Offering';

        sheet.addRow({
          sno: index + 1,
          donorName: row.donorName || 'Devotee',
          donorPhone: row.donorPhone || '',
          sevaName: sevaLabel,
          preferDate: row.preferDate || '—',
          timing,
          occasion: row.occasion || '',
          forWhom: row.forWhom || '',
          personName: row.personName || '',
          amount: row.amount || 0,
          remarks: row.remarks || '',
          transactionId: row.transactionId || '',
          donatedAt: row.donatedAt || '',
          adminReply: row.adminReply || '',
          adminRepliedAt: row.adminRepliedAt || '',
        });
      });

      sheet.getRow(1).font = {bold: true};
    };

    const addBirthdaySheet = async (month: string) => {
      const allYear = !month;
      const rows = await mysql.query<any[]>(
        `
        SELECT
          u.full_name AS fullName,
          IFNULL(u.mobile_country_code, '') AS mobileCountryCode,
          IFNULL(u.mobile_number, '') AS mobileNumber,
          u.date_of_birth AS dateOfBirth
        FROM users u
        WHERE u.deleted_at IS NULL
          AND substr(IFNULL(u.date_of_birth, ''), 6, 2) <> ''
          ${allYear ? '' : "AND substr(IFNULL(u.date_of_birth, ''), 6, 2) = ?"}
          ${demoUserSql('u')}
        ORDER BY substr(u.date_of_birth, 6, 2), substr(u.date_of_birth, 9, 2), u.full_name
        `,
        allYear ? [] : [month],
      );
      const sheet = workbook.addWorksheet('Birthdays');
      sheet.columns = [
        {header: 'Serial No', key: 'sno', width: 12},
        {header: 'Name', key: 'fullName', width: 24},
        {header: 'Phone', key: 'phone', width: 16},
        {header: 'DOB', key: 'dateOfBirth', width: 16},
      ];
      (rows || []).forEach((row: any, index: number) =>
        sheet.addRow({
          sno: index + 1,
          fullName: row.fullName || 'Devotee',
          phone: `${row.mobileCountryCode || ''}${row.mobileNumber || ''}`.trim(),
          dateOfBirth: row.dateOfBirth || '',
        }),
      );
      sheet.getRow(1).font = {bold: true};
    };

    const addOccasionSheet = async (title: string, month: string) => {
      await ensureDonationColumns();
      const allYear = !month;
      const rows = await mysql.query<any[]>(
        `
        SELECT
          IFNULL(NULLIF(d.donor_name, ''), IFNULL(u.full_name, 'Devotee')) AS donorName,
          IFNULL(NULLIF(d.donor_phone, ''), IFNULL(u.mobile_number, '')) AS donorPhone,
          IFNULL(d.prefer_date, '') AS preferDate,
          IFNULL(d.for_whom, '') AS forWhom,
          IFNULL(d.person_name, '') AS personName,
          d.remarks
        FROM donations d
        LEFT JOIN users u ON u.id = d.user_id
        WHERE lower(IFNULL(d.occasion, '')) = lower(?)
          AND substr(IFNULL(d.prefer_date, ''), 6, 2) <> ''
          ${allYear ? '' : "AND substr(IFNULL(d.prefer_date, ''), 6, 2) = ?"}
          ${demoDonationSql('d')}
        ORDER BY substr(IFNULL(d.prefer_date, ''), 6, 2), d.prefer_date, d.id
        `,
        allYear ? [title] : [title, month],
      );
      const sheet = workbook.addWorksheet(title);
      sheet.columns = [
        {header: 'Serial No', key: 'sno', width: 12},
        {header: 'Name', key: 'donorName', width: 24},
        {header: 'Phone', key: 'donorPhone', width: 16},
        {header: 'Prefer date', key: 'preferDate', width: 16},
        {header: 'For whom', key: 'forWhom', width: 16},
        {header: 'Person name', key: 'personName', width: 24},
      ];
      (rows || []).forEach((row: any, index: number) =>
        sheet.addRow({
          sno: index + 1,
          donorName: row.donorName || remarkField(row.remarks, 'Name') || 'Devotee',
          donorPhone: row.donorPhone || remarkField(row.remarks, 'Phone'),
          preferDate: row.preferDate || remarkField(row.remarks, 'Prefer date'),
          forWhom: row.forWhom || remarkField(row.remarks, 'For whom'),
          personName: row.personName || remarkField(row.remarks, 'Person name'),
        }),
      );
      sheet.getRow(1).font = {bold: true};
    };

    const addRewardsSheet = async () => {
      const phoneOf = (row: any) => {
        const claim = String(row.claimPhone || '').trim();
        if (claim) {
          return claim;
        }
        return `${row.mobileCountryCode || ''}${row.mobileNumber || ''}`.trim();
      };
      let rows: any[] = [];
      try {
        const confirmedSql = `UPPER(IFNULL(o.order_status, '')) IN ('CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED')`;
        rows = await mysql.query<any[]>(`
          SELECT fullName, claimPhone, mobileCountryCode, mobileNumber, rewardName
          FROM (
            SELECT
              IFNULL(NULLIF(m.full_name, ''), IFNULL(u.full_name, 'Devotee')) AS fullName,
              IFNULL(m.mobile, '') AS claimPhone,
              IFNULL(u.mobile_country_code, '') AS mobileCountryCode,
              IFNULL(u.mobile_number, '') AS mobileNumber,
              m.reward_name AS rewardName,
              m.created_at AS createdAt
            FROM milestone_reward_claims m
            INNER JOIN orders o ON o.id = m.order_id
            LEFT JOIN users u ON u.id = m.user_id
            WHERE IFNULL(m.reward_name, '') <> ''
              AND ${confirmedSql}
              ${demoUserSql('u')}
            UNION ALL
            SELECT
              IFNULL(NULLIF(c.full_name, ''), IFNULL(u.full_name, 'Devotee')) AS fullName,
              IFNULL(c.mobile, '') AS claimPhone,
              IFNULL(u.mobile_country_code, '') AS mobileCountryCode,
              IFNULL(u.mobile_number, '') AS mobileNumber,
              c.reward_name AS rewardName,
              c.created_at AS createdAt
            FROM challenge_reward_claims c
            INNER JOIN orders o ON o.id = c.order_id
            LEFT JOIN users u ON u.id = c.user_id
            WHERE IFNULL(c.reward_name, '') <> ''
              AND ${confirmedSql}
              ${demoUserSql('u')}
          ) rewards
          ORDER BY createdAt
        `);
      } catch {
        rows = [];
      }
      const sheet = workbook.addWorksheet('Rewards');
      sheet.columns = [
        {header: 'Serial No', key: 'sno', width: 12},
        {header: 'Name', key: 'fullName', width: 24},
        {header: 'Phone', key: 'phone', width: 16},
        {header: 'Reward item', key: 'rewardName', width: 28},
      ];
      (rows || []).forEach((row: any, index: number) =>
        sheet.addRow({
          sno: index + 1,
          fullName: row.fullName || 'Devotee',
          phone: phoneOf(row),
          rewardName: row.rewardName || '',
        }),
      );
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
    } else if (type === 'seva' || type === 'annadanam' || type === 'nithya_homam') {
      await addSevaDonationsSheet(req.query);
    } else if (
      type === 'birthdays' ||
      type === 'jayanthi' ||
      type === 'vardhanti' ||
      type === 'anniversary'
    ) {
      const span = String(req.query.month || '').trim().toLowerCase();
      const allYear = span === 'year' || span === 'all' || span === 'total';
      const month = allYear ? '' : exportMonth(req.query.month);
      if (!allYear && !month) {
        return res.status(400).json({
          success: false,
          message: 'Select a month or Total year.',
        });
      }
      if (type === 'birthdays') {
        await addBirthdaySheet(month);
      } else {
        const title =
          type === 'jayanthi'
            ? 'Jayanthi'
            : type === 'vardhanti'
              ? 'Vardhanti'
              : 'Anniversary';
        await addOccasionSheet(title, month);
      }
    } else if (type === 'rewards' || type === 'reward') {
      await addRewardsSheet();
    } else if (type === 'region' || type === 'regions') {
      const region = String(req.query.region || '').trim();
      if (!region) {
        return res.status(400).json({
          success: false,
          message: 'Select a region or place.',
        });
      }
      const data = await loadRegionAnalytics(region);
      const summary = workbook.addWorksheet('Summary');
      summary.columns = [
        {header: 'Region / Place', key: 'region', width: 28},
        {header: 'People', key: 'people', width: 12},
        {header: 'Total japa count', key: 'japaCount', width: 18},
      ];
      summary.addRow({
        region: data.selected,
        people: data.people,
        japaCount: data.japaCount,
      });
      summary.getRow(1).font = {bold: true};

      const mantraSheet = workbook.addWorksheet('Mantras');
      mantraSheet.columns = [
        {header: 'Mantra', key: 'name', width: 32},
        {header: 'Japa count', key: 'japaCount', width: 14},
        {header: 'People', key: 'people', width: 12},
      ];
      data.mantras.forEach(row => mantraSheet.addRow(row));
      mantraSheet.getRow(1).font = {bold: true};

      const peopleSheet = workbook.addWorksheet('People');
      peopleSheet.columns = [
        {header: 'Name', key: 'name', width: 26},
        {header: 'Phone', key: 'phone', width: 18},
        {header: 'Japa count', key: 'japaCount', width: 14},
        {header: 'Mantras', key: 'mantras', width: 48},
      ];
      data.peopleRows.forEach(row => peopleSheet.addRow(row));
      peopleSheet.getRow(1).font = {bold: true};
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

const CANONICAL_REWARDS = [
  {name: 'Rudrakshi Mala', stock: 50, order: 1, aliases: ['rudraksh']},
  {name: 'Tulasi Mala', stock: 50, order: 2, aliases: ['tulasi', 'tulsi']},
  {name: 'Pasupu Mala', stock: 50, order: 3, aliases: ['pasupu', 'turmeric', 'haldi', 'pasupu kommuka maa', 'pasupu kommula mala']},
  {name: 'Sandal Wood Mala', stock: 50, order: 4, aliases: ['sandal wood', 'sandalwood', 'chandan', 'chandana', 'sandal']},
  {name: 'Karungali Mala', stock: 50, order: 5, aliases: ['karungali', 'ebony', 'sacred japa mala', 'sacred mala', 'black wood']},
  {name: 'Spatik Mala', stock: 50, order: 6, aliases: ['spatik', 'sphatik', 'crystal', 'quartz', 'spatika']},
  {name: 'Green Agate', stock: 50, order: 7, aliases: ['green agate', 'green hakik']},
  {name: 'Yellow Agate', stock: 50, order: 8, aliases: ['yellow agate', 'yellow hakik']},
  {name: 'Green Jade / Aventurine Sree Chakra (Marakata Sree Chakra)', stock: 50, order: 9, aliases: ['green jade', 'aventurine', 'marakata', 'marakatha', 'sree chakra', 'sri chakram', 'sri chakra', 'sri yantra', 'emerald sri']},
  {name: 'Spiritual Reward', stock: 50, order: 10, aliases: ['spiritual reward', 'spiritual offering', 'spiritual product']},
];

const ensureRewardSeed = async () => {
  try {
    const existingRows = await mysql.query<any[]>(
      `SELECT id, name, display_order FROM challenge_rewards`,
    );
    const existingList = Array.isArray(existingRows) ? existingRows : [];

    if (existingList.length === 0) {
      for (const item of CANONICAL_REWARDS) {
        await mysql.query(
          `
          INSERT INTO challenge_rewards (name, stock, is_active, display_order)
          VALUES (?, ?, 1, ?)
          `,
          [item.name, item.stock, item.order],
        );
      }
      return;
    }

    // Match each canonical reward with existing items or insert if missing
    for (const item of CANONICAL_REWARDS) {
      const match = existingList.find((r: any) => {
        const rowName = String(r.name || '').toLowerCase().trim();
        return (
          rowName === item.name.toLowerCase() ||
          item.aliases.some(alias => rowName.includes(alias))
        );
      });

      if (match) {
        await mysql.query(
          `UPDATE challenge_rewards SET name = ?, display_order = ?, is_active = 1 WHERE id = ?`,
          [item.name, item.order, match.id],
        );
      } else {
        await mysql.query(
          `INSERT INTO challenge_rewards (name, stock, is_active, display_order) VALUES (?, ?, 1, ?)`,
          [item.name, item.stock, item.order],
        );
      }
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
    const mapped = mapRewardRow(rows[0]);
    try {
      const {notifyAdminContentCreated} = await import(
        './adminNotification.service'
      );
      await notifyAdminContentCreated({
        kind: 'reward',
        id: mapped.id,
        name: mapped.name || name,
      });
    } catch (err) {
      console.warn('Reward create notify failed:', err);
    }
    return res.status(201).json({
      success: true,
      message: 'Reward created successfully.',
      data: mapped,
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
    const mapped = mapProductRow(rows[0]);
    try {
      const {notifyAdminContentCreated} = await import(
        './adminNotification.service'
      );
      await notifyAdminContentCreated({
        kind: 'product',
        id: mapped.id,
        name: mapped.name || name,
      });
    } catch (err) {
      console.warn('Product create notify failed:', err);
    }
    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: mapped,
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
      data: (rows || []).map((row: any) => {
        const idNum = Number(row.userId) || 0;
        const country = String(row.mobileCountryCode || '').replace(/\D/g, '');
        const mobile = String(row.userMobile || '').replace(/\D/g, '');
        const userCode =
          String(row.userCode || '').trim() ||
          (idNum > 0 ? `BPJS${String(idNum).padStart(2, '0')}` : '');
        return {
          id: String(row.id),
          name:
            String(row.userName || '').trim() || `User #${row.userId || '-'}`,
          userId: row.userId || null,
          userCode,
          mobileNumber:
            country && mobile ? `+${country} ${mobile}` : mobile || '',
          japaCount: num(row.japaCount),
          email: row.userEmail || '',
          rating:
            Number(row.rating) > 0 ? `${Number(row.rating)}★` : '',
          comment: row.message || row.title || '',
          videoUrl: row.videoUrl ? `${host}${row.videoUrl}` : null,
          status: 'Pending',
          createdAt: row.createdAt,
        };
      }),
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
        adminReply: row.adminReply || null,
        status: String(row.status || 'OPEN').toUpperCase(),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load support tickets.',
    });
  }
});

router.put('/support-tickets/:id/reply', async (req: Request, res: Response) => {
  try {
    const customerCareService = (
      await import('../customerCare/customerCare.service')
    ).default;
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id.',
      });
    }
    const reply = String(req.body?.reply || '').trim();
    const statusRaw = String(req.body?.status || 'RESOLVED')
      .trim()
      .toUpperCase();
    const status =
      statusRaw === 'OPEN' || statusRaw === 'IN_PROGRESS'
        ? statusRaw
        : 'RESOLVED';

    const data = await customerCareService.reply(id, reply, status as any);
    return res.json({
      success: true,
      message:
        status === 'RESOLVED'
          ? 'Reply sent and ticket marked solved.'
          : 'Reply sent to the devotee.',
      data,
    });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Unable to reply to support ticket.',
    });
  }
});

router.delete('/support-tickets/:id', async (req: Request, res: Response) => {
  try {
    const customerCareService = (
      await import('../customerCare/customerCare.service')
    ).default;
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id.',
      });
    }
    await customerCareService.delete(id);
    return res.json({
      success: true,
      message: 'Support ticket deleted successfully.',
    });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Unable to delete support ticket.',
    });
  }
});

router.get('/daily-goal', async (_req: Request, res: Response) => {
  try {
    const appSettingsService = (
      await import('./appSettings.service')
    ).default;
    const dailyGoal = await appSettingsService.getDailyGoal();
    return res.json({
      success: true,
      data: {dailyGoal},
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load daily goal.',
    });
  }
});

router.put('/daily-goal', async (req: Request, res: Response) => {
  try {
    const appSettingsService = (
      await import('./appSettings.service')
    ).default;
    const goal = Number(req.body?.dailyGoal ?? req.body?.goal ?? 2000);
    const updated = await appSettingsService.setDailyGoal(goal);
    return res.json({
      success: true,
      message: `Daily japa goal updated to ${updated.toLocaleString()}`,
      data: {dailyGoal: updated},
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update daily goal.',
    });
  }
});

router.get('/autopay-requests', async (_req: Request, res: Response) => {
  try {
    const {getAutopayRequests} = await import('../donation/autopay.service');
    const data = await getAutopayRequests();
    return res.json({success: true, data});
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load autopay requests.',
    });
  }
});

router.patch('/autopay-requests/:id/status', async (req: Request, res: Response) => {
  try {
    const {updateAutopayStatus} = await import('../donation/autopay.service');
    const data = await updateAutopayStatus(
      String(req.params.id),
      String(req.body?.status || 'Contacted'),
    );
    return res.json({
      success: true,
      message: 'Autopay request status updated',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update autopay request status.',
    });
  }
});

router.get('/seva-donations', async (req: Request, res: Response) => {
  try {
    await ensureDonationColumns();
    const type = String(req.query.type || 'ALL').toUpperCase();
    const scope = String(req.query.scope || 'all').toLowerCase();
    const preferDate = String(req.query.preferDate || '').trim();
    const search = String(req.query.search || '').trim();

    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const whereClauses: string[] = ["UPPER(IFNULL(payment_status, 'SUCCESS')) = 'SUCCESS'"];
    const params: any[] = [];

    if (type === 'ANNADANAM') {
      whereClauses.push(
        "(UPPER(IFNULL(donation_type, '')) IN ('ANNADANAM', 'GENERAL') OR LOWER(IFNULL(remarks, '')) LIKE '%anna%' OR LOWER(IFNULL(remarks, '')) LIKE '%santharpana%' OR LOWER(IFNULL(remarks, '')) LIKE '%annadanam%')",
      );
      whereClauses.push("LOWER(IFNULL(remarks, '')) NOT LIKE '%homam%'");
    } else if (type === 'NITHYA_HOMAM') {
      whereClauses.push(
        "(UPPER(IFNULL(donation_type, '')) = 'NITHYA_HOMAM' OR LOWER(IFNULL(remarks, '')) LIKE '%homam%')",
      );
    }

    if (preferDate && /^\d{4}-\d{2}-\d{2}$/.test(preferDate)) {
      whereClauses.push('prefer_date = ?');
      params.push(preferDate);
    }

    const effectiveDateExpr = "COALESCE(NULLIF(prefer_date, ''), SUBSTR(IFNULL(donated_at, ''), 1, 10))";

    if (scope === 'upcoming') {
      whereClauses.push(`${effectiveDateExpr} >= ?`);
      params.push(today);
    } else if (scope === 'past') {
      whereClauses.push(`${effectiveDateExpr} < ?`);
      params.push(today);
    }

    if (search) {
      const q = `%${search}%`;
      whereClauses.push(
        '(donor_name LIKE ? OR donor_phone LIKE ? OR person_name LIKE ? OR occasion LIKE ? OR remarks LIKE ?)',
      );
      params.push(q, q, q, q, q);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const orderSql =
      scope === 'upcoming'
        ? `ORDER BY ${effectiveDateExpr} ASC, id ASC`
        : `ORDER BY ${effectiveDateExpr} DESC, id DESC`;

    const sql = `
      SELECT
        id,
        user_id AS userId,
        donation_type AS donationType,
        amount,
        donor_name AS donorName,
        donor_phone AS donorPhone,
        prefer_date AS preferDate,
        occasion,
        for_whom AS forWhom,
        person_name AS personName,
        remarks,
        transaction_id AS transactionId,
        donated_at AS donatedAt,
        admin_reply AS adminReply,
        admin_replied_at AS adminRepliedAt
      FROM donations
      ${whereSql}
      ${orderSql}
    `;

    const rows = await mysql.query<any[]>(sql, params);

    // Compute counts for tabs
    const countWhereClauses: string[] = ["UPPER(IFNULL(payment_status, 'SUCCESS')) = 'SUCCESS'"];
    if (type === 'ANNADANAM') {
      countWhereClauses.push(
        "(UPPER(IFNULL(donation_type, '')) IN ('ANNADANAM', 'GENERAL') OR LOWER(IFNULL(remarks, '')) LIKE '%anna%' OR LOWER(IFNULL(remarks, '')) LIKE '%santharpana%' OR LOWER(IFNULL(remarks, '')) LIKE '%annadanam%')",
      );
      countWhereClauses.push("LOWER(IFNULL(remarks, '')) NOT LIKE '%homam%'");
    } else if (type === 'NITHYA_HOMAM') {
      countWhereClauses.push(
        "(UPPER(IFNULL(donation_type, '')) = 'NITHYA_HOMAM' OR LOWER(IFNULL(remarks, '')) LIKE '%homam%')",
      );
    }
    const countBaseSql = countWhereClauses.length ? `WHERE ${countWhereClauses.join(' AND ')}` : '';

    const allCounts = await mysql.query<any[]>(`
      SELECT
        COUNT(*) AS totalCount,
        SUM(CASE WHEN ${effectiveDateExpr} >= '${today}' THEN 1 ELSE 0 END) AS upcomingCount,
        SUM(CASE WHEN ${effectiveDateExpr} < '${today}' THEN 1 ELSE 0 END) AS pastCount
      FROM donations
      ${countBaseSql}
    `);

    const counts = {
      total: Number(allCounts?.[0]?.totalCount || 0),
      upcoming: Number(allCounts?.[0]?.upcomingCount || 0),
      past: Number(allCounts?.[0]?.pastCount || 0),
    };

    return res.json({
      success: true,
      data: {
        items: rows || [],
        counts,
        today,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load seva donations.',
    });
  }
});

router.post('/seva-donations/:id/reply', async (req: Request, res: Response) => {
  try {
    await ensureDonationColumns();
    const donationId = String(req.params.id);
    const cleanReply = String(req.body?.reply || '').trim();

    if (!cleanReply) {
      return res.status(400).json({
        success: false,
        message: 'Reply message cannot be empty.',
      });
    }

    const rows = await mysql.query<any[]>(
      `SELECT * FROM donations WHERE id = ? LIMIT 1`,
      [donationId],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donation record not found.',
      });
    }

    const donation = rows[0];

    const istNow = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).format(new Date());

    await mysql.query(
      `UPDATE donations SET admin_reply = ?, admin_replied_at = ? WHERE id = ?`,
      [cleanReply, istNow, donationId],
    );

    let targetUserId = Number(donation.user_id || 0);
    if (!targetUserId && donation.donor_phone) {
      const {userIdForPhone} = await import('../payments/razorpay.service');
      targetUserId = Number((await userIdForPhone(donation.donor_phone)) || 0);
    }

    let pushSent = false;
    if (targetUserId > 0) {
      try {
        const notificationService = (
          await import('../notification/notification.service')
        ).default;
        const replyTitle = 'Message from Japasiddhi Admin 🪔';

        await notificationService.create({
          userId: targetUserId,
          title: replyTitle,
          message: cleanReply,
          notificationType: 'SYSTEM',
          actionType: 'ADMIN_SEVA_REPLY',
          actionId: Number(donationId),
          extraData: {
            donationId: Number(donationId),
            reply: cleanReply,
            donorName: donation.donor_name || '',
            sevaType: donation.donation_type || '',
            preferDate: donation.prefer_date || '',
          },
        });

        const userTokenRows = await mysql.query<any[]>(
          `SELECT fcm_token AS fcmToken FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
          [targetUserId],
        );
        const userFcm = String(userTokenRows?.[0]?.fcmToken || '').trim();

        if (userFcm) {
          const {sendPushToTokens} = await import(
            './adminNotification.service'
          );
          const pushRes = await sendPushToTokens(
            [userFcm],
            replyTitle,
            cleanReply,
            'ADMIN_SEVA_REPLY',
            {donationId: String(donationId)},
            true,
          );
          pushSent = Boolean(pushRes.pushSent > 0);
        }
      } catch (notifyErr) {
        console.warn('Admin seva reply notification error:', notifyErr);
      }
    }

    return res.json({
      success: true,
      message: 'Reply sent to devotee successfully',
      data: {
        donationId,
        adminReply: cleanReply,
        adminRepliedAt: istNow,
        userId: targetUserId || null,
        pushSent,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to send reply.',
    });
  }
});

router.get('/meeting', async (_req: Request, res: Response) => {
  try {
    const appSettingsService = (await import('./appSettings.service')).default;
    const meeting = await appSettingsService.getMeetingConfig();
    return res.json({
      success: true,
      data: meeting,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load meeting configuration.',
    });
  }
});

router.put('/meeting', async (req: Request, res: Response) => {
  try {
    const appSettingsService = (await import('./appSettings.service')).default;
    const {enabled, title, link, time, scheduledAt} = req.body || {};
    const updated = await appSettingsService.setMeetingConfig({
      enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      title: typeof title === 'string' ? title : undefined,
      link: typeof link === 'string' ? link : undefined,
      time: typeof time === 'string' ? time : undefined,
      scheduledAt: scheduledAt !== undefined ? (scheduledAt ? String(scheduledAt) : null) : undefined,
    });
    return res.json({
      success: true,
      message: 'Meeting configuration updated successfully.',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to update meeting configuration.',
    });
  }
});

router.delete('/meeting', async (_req: Request, res: Response) => {
  try {
    const appSettingsService = (await import('./appSettings.service')).default;
    await appSettingsService.removeMeetingConfig();
    return res.json({
      success: true,
      message: 'Meeting removed successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to remove meeting configuration.',
    });
  }
});

export default router;
