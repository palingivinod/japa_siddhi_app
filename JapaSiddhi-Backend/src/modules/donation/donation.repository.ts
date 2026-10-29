import {
  ResultSetHeader,
} from 'mysql2';

import mysql from '../../database/mysql';


class DonationRepository {


  async create(
    data: {
      userId: number;
      donationType: string;
      amount: number;
      paymentMethod: string;
      transactionId?: string | null;
      paymentReference?: string | null;
      remarks?: string | null;
    },
  ): Promise<number> {


    const result =
      await mysql.query<ResultSetHeader>(
        `
        INSERT INTO donations
        (
          user_id,
          donation_type,
          amount,
          payment_method,
          transaction_id,
          payment_reference,
          donation_status,
          remarks
        )
        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          'SUCCESS',
          ?
        )
        `,
        [
          data.userId,
          data.donationType,
          data.amount,
          data.paymentMethod,
          data.transactionId ?? null,
          data.paymentReference ?? null,
          data.remarks ?? null,
        ],
      );


    return result.insertId;

  }



  private columnsEnsured = false;
  async ensureDonationColumns() {
    if (this.columnsEnsured) return;
    const alters = [
      'ALTER TABLE donations ADD COLUMN donor_name TEXT',
      'ALTER TABLE donations ADD COLUMN donor_phone TEXT',
      'ALTER TABLE donations ADD COLUMN prefer_date TEXT',
      'ALTER TABLE donations ADD COLUMN occasion TEXT',
      'ALTER TABLE donations ADD COLUMN for_whom TEXT',
      'ALTER TABLE donations ADD COLUMN person_name TEXT',
      'ALTER TABLE donations ADD COLUMN admin_reply TEXT',
      'ALTER TABLE donations ADD COLUMN admin_replied_at TEXT',
    ];
    for (const sql of alters) {
      try {
        await mysql.query(sql);
      } catch {
        // column already exists
      }
    }
    this.columnsEnsured = true;
  }

  async getHistory(
    userId: number,
  ) {
    await this.ensureDonationColumns();
    const userRows = await mysql.query<any[]>(
      `SELECT mobile_number FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );
    const rawMobile = String(userRows?.[0]?.mobile_number || '').replace(/\D/g, '').slice(-10);

    const isMysql = mysql.getEngineName() === 'mysql';
    const phoneExpr = isMysql
      ? `RIGHT(REPLACE(REPLACE(IFNULL(donor_phone, ''), ' ', ''), '-', ''), 10)`
      : `substr(replace(replace(IFNULL(donor_phone, ''), ' ', ''), '-', ''), -10)`;

    const phoneClause =
      rawMobile && rawMobile.length === 10 ? `OR (${phoneExpr} = ?)` : '';
    const params = phoneClause ? [userId, rawMobile] : [userId];

    try {
      return await mysql.query<any[]>(
        `
        SELECT
          id,
          user_id AS userId,
          donation_type AS donationType,
          amount,
          payment_method AS paymentMethod,
          transaction_id AS transactionId,
          payment_reference AS paymentReference,
          donation_status AS donationStatus,
          donated_at AS donatedAt,
          donor_name AS donorName,
          donor_phone AS donorPhone,
          prefer_date AS preferDate,
          occasion,
          for_whom AS forWhom,
          person_name AS personName,
          remarks,
          admin_reply AS adminReply,
          admin_replied_at AS adminRepliedAt
        FROM donations
        WHERE (user_id = ? ${phoneClause})
          AND UPPER(IFNULL(payment_status, 'SUCCESS')) = 'SUCCESS'
        ORDER BY id DESC
        `,
        params,
      );
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('admin_reply') || msg.includes('does not exist')) {
        const rows = await mysql.query<any[]>(
          `
          SELECT
            id,
            user_id AS userId,
            donation_type AS donationType,
            amount,
            payment_method AS paymentMethod,
            transaction_id AS transactionId,
            payment_reference AS paymentReference,
            donation_status AS donationStatus,
            donated_at AS donatedAt,
            remarks
          FROM donations
          WHERE (user_id = ? ${phoneClause})
            AND UPPER(IFNULL(payment_status, 'SUCCESS')) = 'SUCCESS'
          ORDER BY id DESC
          `,
          params,
        );
        return (rows || []).map((r: any) => ({
          ...r,
          donorName: r.donor_name || null,
          donorPhone: r.donor_phone || null,
          preferDate: r.prefer_date || null,
          occasion: r.occasion || null,
          forWhom: r.for_whom || null,
          personName: r.person_name || null,
          adminReply: null,
          adminRepliedAt: null,
        }));
      }
      throw err;
    }
  }



  async getMonthlyStatus(
    userId: number,
  ) {


    const rows =
      await mysql.query<any[]>(
        `
        SELECT

          id,

          amount,

          donated_at

        FROM donations

        WHERE user_id = ?

        AND donation_type = 'MONTHLY'

        AND donation_status = 'SUCCESS'

        AND MONTH(donated_at) = MONTH(CURDATE())

        AND YEAR(donated_at) = YEAR(CURDATE())

        ORDER BY donated_at DESC

        LIMIT 1
        `,
        [
          userId,
        ],
      );


    return rows.length
      ? rows[0]
      : null;

  }



  async getPaymentSettings() {


    return mysql.query<any[]>(
      `
      SELECT

        setting_key,

        setting_value

      FROM app_settings

      WHERE category = 'DONATION'

      AND is_active = 1
      `,
    );

  }


}


export default new DonationRepository();