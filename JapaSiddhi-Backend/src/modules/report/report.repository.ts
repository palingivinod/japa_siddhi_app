import mysql from '../../database/mysql';
import {ensureDonationColumns} from '../payments/razorpay.service';

import {
  DashboardAnalytics,
  UserReportFilter,
  DonationReportFilter,
  OrderReportFilter,
  ChallengeReportFilter,
} from './report.types';

class ReportRepository {

  async dashboardAnalytics(): Promise<DashboardAnalytics> {

    const [[users]] = await mysql.query<any[]>(`
      SELECT
        COUNT(*) totalUsers,
        SUM(is_active = 1) activeUsers
      FROM users
    `);

    const [[japa]] = await mysql.query<any[]>(`
      SELECT
        IFNULL(SUM(total_count),0) totalJapa,

        IFNULL(SUM(
          CASE
            WHEN DATE(created_at)=CURDATE()
            THEN japa_count
            ELSE 0
          END
        ),0) todayJapa,

        IFNULL(SUM(
          CASE
            WHEN YEAR(created_at)=YEAR(CURDATE())
            AND MONTH(created_at)=MONTH(CURDATE())
            THEN japa_count
            ELSE 0
          END
        ),0) monthlyJapa

      FROM japa_history
    `);

    const [[goal]] = await mysql.query<any[]>(`
      SELECT

        COUNT(*) totalGoals,

        SUM(status='COMPLETED') completedGoals

      FROM user_japa_goals
    `);

    const [[donation]] = await mysql.query<any[]>(`
      SELECT

        IFNULL(SUM(amount),0) totalDonations,

        IFNULL(SUM(
          CASE
            WHEN YEAR(created_at)=YEAR(CURDATE())
            AND MONTH(created_at)=MONTH(CURDATE())
            THEN amount
            ELSE 0
          END
        ),0) monthlyDonations

      FROM donations

      WHERE payment_status='SUCCESS'
    `);

    const [[orders]] = await mysql.query<any[]>(`
      SELECT

        COUNT(*) totalOrders,

        SUM(order_status='PENDING') pendingOrders,

        SUM(order_status='DELIVERED') completedOrders

      FROM orders
    `);

    const [[challenge]] = await mysql.query<any[]>(`
      SELECT

        COUNT(*) totalChallenges,

        SUM(is_active=1) activeChallenges

      FROM challenges
    `);

    const [[ticket]] = await mysql.query<any[]>(`
      SELECT

        COUNT(*) totalSupportTickets,

        SUM(status='OPEN') openSupportTickets

      FROM customer_care
    `);

    const [[feedback]] = await mysql.query<any[]>(`
      SELECT
        COUNT(*) totalFeedback
      FROM feedback
    `);

    return {

      totalUsers: users.totalUsers,

      activeUsers: users.activeUsers,

      totalJapa: japa.totalJapa,

      todayJapa: japa.todayJapa,

      monthlyJapa: japa.monthlyJapa,

      totalGoals: goal.totalGoals,

      completedGoals: goal.completedGoals,

      totalDonations: donation.totalDonations,

      monthlyDonations: donation.monthlyDonations,

      totalOrders: orders.totalOrders,

      pendingOrders: orders.pendingOrders,

      completedOrders: orders.completedOrders,

      totalChallenges: challenge.totalChallenges,

      activeChallenges: challenge.activeChallenges,

      totalSupportTickets: ticket.totalSupportTickets,

      openSupportTickets: ticket.openSupportTickets,

      totalFeedback: feedback.totalFeedback,

    };

  }

  async userReport(
    filter: UserReportFilter,
  ) {
        const page =
      Number(filter.page ?? 1);

    const limit =
      Number(filter.limit ?? 20);

    const offset =
      (page - 1) * limit;

    let sql = `
      SELECT

        u.id,

        u.full_name AS fullName,

        u.email,

        u.mobile,

        c.name AS country,

        s.name AS state,

        ci.name AS city,

        u.created_at AS joinedDate,

        IFNULL(js.total_count,0) AS totalJapa,

        (
          SELECT
            IFNULL(SUM(amount),0)
          FROM donations d
          WHERE d.user_id = u.id
          AND d.payment_status='SUCCESS'
        ) AS totalDonations,

        (
          SELECT
            COUNT(*)
          FROM orders o
          WHERE o.user_id = u.id
        ) AS totalOrders

      FROM users u

      LEFT JOIN countries c
      ON c.id = u.country_id

      LEFT JOIN states s
      ON s.id = u.state_id

      LEFT JOIN cities ci
      ON ci.id = u.city_id

      LEFT JOIN user_japa_statistics js
      ON js.user_id = u.id

      WHERE 1 = 1
    `;

    const params: any[] = [];

    if (filter.fromDate) {

      sql += `
        AND DATE(u.created_at) >= ?
      `;

      params.push(filter.fromDate);

    }

    if (filter.toDate) {

      sql += `
        AND DATE(u.created_at) <= ?
      `;

      params.push(filter.toDate);

    }

    if (filter.countryId) {

      sql += `
        AND u.country_id = ?
      `;

      params.push(filter.countryId);

    }

    if (filter.stateId) {

      sql += `
        AND u.state_id = ?
      `;

      params.push(filter.stateId);

    }

    if (filter.cityId) {

      sql += `
        AND u.city_id = ?
      `;

      params.push(filter.cityId);

    }

    if (filter.isActive !== undefined) {

      sql += `
        AND u.is_active = ?
      `;

      params.push(filter.isActive);

    }

    if (filter.search) {

      sql += `
        AND (
          u.full_name LIKE ?
          OR u.email LIKE ?
          OR u.mobile LIKE ?
        )
      `;

      params.push(
        `%${filter.search}%`,
        `%${filter.search}%`,
        `%${filter.search}%`,
      );

    }

    sql += `
      ORDER BY

      ${filter.sortBy ?? 'u.created_at'}

      ${filter.sortOrder ?? 'DESC'}

      LIMIT ?

      OFFSET ?
    `;

    params.push(
      limit,
      offset,
    );

    return mysql.query<any[]>(
      sql,
      params,
    );

  }

  async donationReport(
    filter: DonationReportFilter,
  ) {
    await ensureDonationColumns();
        const page =
      Number(filter.page ?? 1);

    const limit =
      Number(filter.limit ?? 20);

    const offset =
      (page - 1) * limit;

    let sql = `
      SELECT

        d.id,

        IFNULL(NULLIF(d.donor_name, ''), u.full_name) AS fullName,

        IFNULL(NULLIF(d.donor_phone, ''), u.mobile_number) AS phone,

        IFNULL(d.prefer_date, '') AS preferDate,

        d.donation_type AS donationType,

        d.amount,

        d.payment_status AS paymentStatus,

        d.transaction_id AS transactionId,

        d.payment_method AS paymentMethod,

        d.created_at AS donatedAt

      FROM donations d

      INNER JOIN users u

      ON u.id = d.user_id

      WHERE 1 = 1
    `;

    const params: any[] = [];

    if (filter.fromDate) {

      sql += `
        AND DATE(d.created_at) >= ?
      `;

      params.push(filter.fromDate);

    }

    if (filter.toDate) {

      sql += `
        AND DATE(d.created_at) <= ?
      `;

      params.push(filter.toDate);

    }

    if (filter.donationType) {

      sql += `
        AND d.donation_type = ?
      `;

      params.push(filter.donationType);

    }

    if (filter.paymentStatus) {

      sql += `
        AND d.payment_status = ?
      `;

      params.push(filter.paymentStatus);

    }

    if (filter.search) {

      sql += `
        AND (
          u.full_name LIKE ?
          OR u.mobile LIKE ?
          OR u.email LIKE ?
        )
      `;

      params.push(
        `%${filter.search}%`,
        `%${filter.search}%`,
        `%${filter.search}%`,
      );

    }

    sql += `
      ORDER BY

      ${filter.sortBy ?? 'd.created_at'}

      ${filter.sortOrder ?? 'DESC'}

      LIMIT ?

      OFFSET ?
    `;

    params.push(
      limit,
      offset,
    );

    return mysql.query<any[]>(
      sql,
      params,
    );

  }

  async orderReport(
    filter: OrderReportFilter,
  ) {
        const page =
      Number(filter.page ?? 1);

    const limit =
      Number(filter.limit ?? 20);

    const offset =
      (page - 1) * limit;

    let sql = `
      SELECT

        o.id,

        o.order_number AS orderNumber,

        u.full_name AS fullName,

        o.order_type AS orderType,

        o.order_source AS orderSource,

        o.order_status AS orderStatus,

        o.payment_status AS paymentStatus,

        o.total_amount AS amount,

        o.created_at

      FROM orders o

      INNER JOIN users u

      ON u.id = o.user_id

      WHERE 1 = 1
    `;

    const params: any[] = [];

    if (filter.fromDate) {

      sql += `
        AND DATE(o.created_at) >= ?
      `;

      params.push(filter.fromDate);

    }

    if (filter.toDate) {

      sql += `
        AND DATE(o.created_at) <= ?
      `;

      params.push(filter.toDate);

    }

    if (filter.orderStatus) {

      sql += `
        AND o.order_status = ?
      `;

      params.push(filter.orderStatus);

    }

    if (filter.paymentStatus) {

      sql += `
        AND o.payment_status = ?
      `;

      params.push(filter.paymentStatus);

    }

    if (filter.orderType) {

      sql += `
        AND o.order_type = ?
      `;

      params.push(filter.orderType);

    }

    if (filter.search) {

      sql += `
        AND (
          o.order_number LIKE ?
          OR u.full_name LIKE ?
          OR u.mobile LIKE ?
        )
      `;

      params.push(
        `%${filter.search}%`,
        `%${filter.search}%`,
        `%${filter.search}%`,
      );

    }

    sql += `
      ORDER BY

      ${filter.sortBy ?? 'o.created_at'}

      ${filter.sortOrder ?? 'DESC'}

      LIMIT ?

      OFFSET ?
    `;

    params.push(
      limit,
      offset,
    );

    return mysql.query<any[]>(
      sql,
      params,
    );

  }

  async japaReport(
    filter: UserReportFilter,
  ) {
        const page =
      Number(filter.page ?? 1);

    const limit =
      Number(filter.limit ?? 20);

    const offset =
      (page - 1) * limit;

    let sql = `
      SELECT

        u.full_name AS fullName,

        pm.name AS mantra,

        SUM(
          CASE
            WHEN j.mode='TAP'
            THEN j.japa_count
            ELSE 0
          END
        ) AS tapCount,

        SUM(
          CASE
            WHEN j.mode='VOICE'
            THEN j.japa_count
            ELSE 0
          END
        ) AS voiceCount,

        SUM(j.japa_count) AS totalCount

      FROM japa_history j

      INNER JOIN users u

      ON u.id = j.user_id

      LEFT JOIN personal_mantras pm

      ON pm.id = j.mantra_id

      WHERE 1 = 1
    `;

    const params: any[] = [];

    if (filter.fromDate) {

      sql += `
        AND DATE(j.created_at) >= ?
      `;

      params.push(filter.fromDate);

    }

    if (filter.toDate) {

      sql += `
        AND DATE(j.created_at) <= ?
      `;

      params.push(filter.toDate);

    }

    if (filter.search) {

      sql += `
        AND (
          u.full_name LIKE ?
          OR pm.name LIKE ?
        )
      `;

      params.push(
        `%${filter.search}%`,
        `%${filter.search}%`,
      );

    }

    sql += `
      GROUP BY

        u.id,
        pm.id

      ORDER BY

        totalCount DESC

      LIMIT ?

      OFFSET ?
    `;

    params.push(
      limit,
      offset,
    );

    return mysql.query<any[]>(
      sql,
      params,
    );

  }

  async challengeReport(
    filter: ChallengeReportFilter,
  ) {

    let sql = `
      SELECT

        c.id,

        c.title,

        c.challenge_type AS challengeType,

        c.reward_type AS rewardType,

        c.reward_name AS rewardName,

        c.reward_quantity AS rewardQuantity,

        c.start_date AS startDate,

        c.end_date AS endDate,

        COUNT(cp.id) AS participants,

        SUM(cp.is_completed = 1) AS completed,

        SUM(cp.reward_given = 1) AS rewardsGiven

      FROM challenges c

      LEFT JOIN challenge_participants cp

      ON cp.challenge_id = c.id

      WHERE 1 = 1
    `;

    const params: any[] = [];

    if (filter.challengeId) {

      sql += `
        AND c.id = ?
      `;

      params.push(filter.challengeId);

    }

    sql += `
      GROUP BY c.id

      ORDER BY c.start_date DESC
    `;

    return mysql.query<any[]>(
      sql,
      params,
    );

  }

  async banaLingamReport(
    filter: OrderReportFilter,
  ) {
        const page =
      Number(filter.page ?? 1);

    const limit =
      Number(filter.limit ?? 20);

    const offset =
      (page - 1) * limit;

    let sql = `
      SELECT

        o.id,

        o.order_number AS orderNumber,

        u.full_name AS fullName,

        bl.gothram,

        bl.nakshatram,

        c.name AS country,

        s.name AS state,

        ci.name AS city,

        o.order_status AS orderStatus,

        o.payment_status AS paymentStatus,

        o.total_amount AS amount,

        o.created_at AS orderedAt

      FROM bana_lingam_requests bl

      INNER JOIN orders o

      ON o.id = bl.order_id

      INNER JOIN users u

      ON u.id = o.user_id

      LEFT JOIN countries c

      ON c.id = bl.country_id

      LEFT JOIN states s

      ON s.id = bl.state_id

      LEFT JOIN cities ci

      ON ci.id = bl.city_id

      WHERE 1 = 1
    `;

    const params: any[] = [];

    if (filter.fromDate) {

      sql += `
        AND DATE(o.created_at) >= ?
      `;

      params.push(filter.fromDate);

    }

    if (filter.toDate) {

      sql += `
        AND DATE(o.created_at) <= ?
      `;

      params.push(filter.toDate);

    }

    if (filter.orderStatus) {

      sql += `
        AND o.order_status = ?
      `;

      params.push(filter.orderStatus);

    }

    if (filter.paymentStatus) {

      sql += `
        AND o.payment_status = ?
      `;

      params.push(filter.paymentStatus);

    }

    if (filter.search) {

      sql += `
        AND (
          o.order_number LIKE ?
          OR u.full_name LIKE ?
          OR bl.gothram LIKE ?
          OR bl.nakshatram LIKE ?
        )
      `;

      params.push(
        `%${filter.search}%`,
        `%${filter.search}%`,
        `%${filter.search}%`,
        `%${filter.search}%`,
      );

    }

    sql += `
      ORDER BY

        o.created_at DESC

      LIMIT ?

      OFFSET ?
    `;

    params.push(
      limit,
      offset,
    );

    return mysql.query<any[]>(
      sql,
      params,
    );

  }

  async customerCareReport(
    filter: UserReportFilter,
  ) {
        const page =
      Number(filter.page ?? 1);

    const limit =
      Number(filter.limit ?? 20);

    const offset =
      (page - 1) * limit;

    let sql = `
      SELECT

        cc.id,

        u.full_name AS fullName,

        u.mobile,

        u.email,

        cc.subject,

        cc.category,

        cc.priority,

        cc.status,

        cc.created_at AS createdAt,

        cc.updated_at AS updatedAt

      FROM customer_care cc

      INNER JOIN users u

      ON u.id = cc.user_id

      WHERE 1 = 1
    `;

    const params: any[] = [];

    if (filter.fromDate) {

      sql += `
        AND DATE(cc.created_at) >= ?
      `;

      params.push(filter.fromDate);

    }

    if (filter.toDate) {

      sql += `
        AND DATE(cc.created_at) <= ?
      `;

      params.push(filter.toDate);

    }

    if (filter.search) {

      sql += `
        AND (
          u.full_name LIKE ?
          OR u.mobile LIKE ?
          OR u.email LIKE ?
          OR cc.subject LIKE ?
        )
      `;

      params.push(
        `%${filter.search}%`,
        `%${filter.search}%`,
        `%${filter.search}%`,
        `%${filter.search}%`,
      );

    }

    sql += `
      ORDER BY

        cc.created_at DESC

      LIMIT ?

      OFFSET ?
    `;

    params.push(
      limit,
      offset,
    );

    return mysql.query<any[]>(
      sql,
      params,
    );

  }

  async festivalReport(
    filter: UserReportFilter,
  ) {
        const page =
      Number(filter.page ?? 1);

    const limit =
      Number(filter.limit ?? 20);

    const offset =
      (page - 1) * limit;

    let sql = `
      SELECT

        f.id,

        f.name,

        f.description,

        f.festival_date AS festivalDate,

        c.name AS country,

        s.name AS state,

        ci.name AS city,

        f.is_active AS isActive,

        f.created_at AS createdAt

      FROM festivals f

      LEFT JOIN countries c

      ON c.id = f.country_id

      LEFT JOIN states s

      ON s.id = f.state_id

      LEFT JOIN cities ci

      ON ci.id = f.city_id

      WHERE 1 = 1
    `;

    const params: any[] = [];

    if (filter.fromDate) {

      sql += `
        AND DATE(f.created_at) >= ?
      `;

      params.push(filter.fromDate);

    }

    if (filter.toDate) {

      sql += `
        AND DATE(f.created_at) <= ?
      `;

      params.push(filter.toDate);

    }

    if (filter.search) {

      sql += `
        AND (
          f.name LIKE ?
          OR f.description LIKE ?
        )
      `;

      params.push(
        `%${filter.search}%`,
        `%${filter.search}%`,
      );

    }

    sql += `
      ORDER BY

        f.festival_date DESC

      LIMIT ?

      OFFSET ?
    `;

    params.push(
      limit,
      offset,
    );

    return mysql.query<any[]>(
      sql,
      params,
    );

  }

  async dailyJapaGraph() {

    return mysql.query<any[]>(`

      SELECT

        DATE(created_at) AS label,

        SUM(japa_count) AS value

      FROM japa_history

      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)

      GROUP BY DATE(created_at)

      ORDER BY DATE(created_at)

    `);

  }

  async monthlyDonationGraph() {

    return mysql.query<any[]>(`

      SELECT

        DATE_FORMAT(created_at,'%Y-%m') AS label,

        SUM(amount) AS value

      FROM donations

      WHERE payment_status='SUCCESS'

      GROUP BY DATE_FORMAT(created_at,'%Y-%m')

      ORDER BY label

    `);

  }

  async monthlyUserRegistrationGraph() {

    return mysql.query<any[]>(`

      SELECT

        DATE_FORMAT(created_at,'%Y-%m') AS label,

        COUNT(*) AS value

      FROM users

      GROUP BY DATE_FORMAT(created_at,'%Y-%m')

      ORDER BY label

    `);

  }

  async orderStatusGraph() {

    return mysql.query<any[]>(`

      SELECT

        order_status AS label,

        COUNT(*) AS value

      FROM orders

      GROUP BY order_status

    `);

  }

  async donationTypeGraph() {

    return mysql.query<any[]>(`

      SELECT

        donation_type AS label,

        SUM(amount) AS value

      FROM donations

      WHERE payment_status='SUCCESS'

      GROUP BY donation_type

    `);

  }

  async challengeCompletionGraph() {

    return mysql.query<any[]>(`

      SELECT

        c.title AS label,

        COUNT(cp.id) AS participants,

        SUM(cp.is_completed = 1) AS completed

      FROM challenges c

      LEFT JOIN challenge_participants cp

      ON cp.challenge_id = c.id

      GROUP BY c.id

      ORDER BY c.start_date DESC

    `);

  }

  async topJapaUsers(
    limit: number = 10,
  ) {
        return mysql.query<any[]>(`

      SELECT

        u.id,

        u.full_name AS fullName,

        js.total_count AS totalJapa

      FROM user_japa_statistics js

      INNER JOIN users u

      ON u.id = js.user_id

      ORDER BY js.total_count DESC

      LIMIT ?

    `,
    [
      limit,
    ]);

  }

  async topDonors(
    limit: number = 10,
  ) {

    return mysql.query<any[]>(`

      SELECT

        u.id,

        u.full_name AS fullName,

        SUM(d.amount) AS totalDonation

      FROM donations d

      INNER JOIN users u

      ON u.id = d.user_id

      WHERE d.payment_status = 'SUCCESS'

      GROUP BY u.id

      ORDER BY totalDonation DESC

      LIMIT ?

    `,
    [
      limit,
    ]);

  }

  async mostChantedMantras(
    limit: number = 10,
  ) {

    return mysql.query<any[]>(`

      SELECT

        pm.name AS mantra,

        SUM(j.japa_count) AS totalCount

      FROM japa_history j

      LEFT JOIN personal_mantras pm

      ON pm.id = j.mantra_id

      GROUP BY pm.id

      ORDER BY totalCount DESC

      LIMIT ?

    `,
    [
      limit,
    ]);

  }

  async monthlyDashboardSummary() {

    return mysql.query<any[]>(`

      SELECT

        DATE_FORMAT(created_at,'%Y-%m') AS month,

        COUNT(DISTINCT user_id) AS activeUsers,

        SUM(japa_count) AS totalJapa

      FROM japa_history

      GROUP BY DATE_FORMAT(created_at,'%Y-%m')

      ORDER BY month DESC

      LIMIT 12

    `);

  }

  async yearlyDashboardSummary() {

    return mysql.query<any[]>(`

      SELECT

        YEAR(created_at) AS year,

        SUM(japa_count) AS totalJapa,

        COUNT(DISTINCT user_id) AS activeUsers

      FROM japa_history

      GROUP BY YEAR(created_at)

      ORDER BY year DESC

    `);

  }

  async donationSummary() {

    return mysql.query<any[]>(`

      SELECT

        COUNT(*) AS totalDonations,

        SUM(amount) AS totalAmount,

        AVG(amount) AS averageDonation,

        MAX(amount) AS highestDonation,

        MIN(amount) AS lowestDonation

      FROM donations

      WHERE payment_status = 'SUCCESS'

    `);

  }

  async orderSummary() {

    return mysql.query<any[]>(`

      SELECT

        COUNT(*) AS totalOrders,

        SUM(order_status='PENDING') AS pending,

        SUM(order_status='PROCESSING') AS processing,

        SUM(order_status='READY') AS ready,

        SUM(order_status='SHIPPED') AS shipped,

        SUM(order_status='DELIVERED') AS delivered,

        SUM(order_status='CANCELLED') AS cancelled

      FROM orders

    `);

  }

  async userGrowthSummary() {

    return mysql.query<any[]>(`

      SELECT

        DATE(created_at) AS date,

        COUNT(*) AS users

      FROM users

      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)

      GROUP BY DATE(created_at)

      ORDER BY DATE(created_at)

    `);

  }

  async challengeRewardSummary() {

    return mysql.query<any[]>(`

      SELECT

        reward_type AS rewardType,

        COUNT(*) AS totalChallenges,

        SUM(reward_quantity) AS totalRewards

      FROM challenges

      GROUP BY reward_type

    `);

  }

}

export default new ReportRepository();