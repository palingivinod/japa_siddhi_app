import mysql from '../../database/mysql';


class FestivalRepository {


  async getUpcomingFestivals() {


    return mysql.query<any[]>(
      `
      SELECT

        id,

        festival_name AS festivalName,

        description,

        festival_date AS festivalDate,

        festival_type AS festivalType,

        is_public_holiday AS isPublicHoliday

      FROM festivals

      WHERE festival_date >= CURDATE()

      AND is_active = 1

      ORDER BY festival_date ASC
      `,
    );

  }



  async getTodayFestival() {


    const rows =
      await mysql.query<any[]>(
        `
        SELECT

          id,

          festival_name AS festivalName,

          description,

          festival_date AS festivalDate,

          festival_type AS festivalType,

          is_public_holiday AS isPublicHoliday

        FROM festivals

        WHERE festival_date = CURDATE()

        AND is_active = 1

        LIMIT 1
        `,
      );


    return rows.length
      ? rows[0]
      : null;

  }

  async getFestivalOnDate(date: string) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        festival_name AS festivalName,
        description,
        festival_date AS festivalDate,
        festival_type AS festivalType
      FROM festivals
      WHERE festival_date = ?
      AND is_active = 1
      LIMIT 1
      `,
      [date],
    );
    return rows[0] || null;
  }

  async getNextFestival(date: string) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        festival_name AS festivalName,
        description,
        festival_date AS festivalDate,
        festival_type AS festivalType
      FROM festivals
      WHERE festival_date >= ?
      AND is_active = 1
      ORDER BY festival_date ASC
      LIMIT 1
      `,
      [date],
    );
    return rows[0] || null;
  }

}


export default new FestivalRepository();