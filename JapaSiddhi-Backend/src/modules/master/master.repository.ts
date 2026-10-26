import mysql from '../../database/mysql';



class MasterRepository {


  async getCountries() {


    return mysql.query<any[]>(
      `
      SELECT

        id,

        name,

        iso2 AS isoCode,

        phone_code AS phoneCode

      FROM countries

      WHERE is_active = 1

      ORDER BY name ASC
      `,
    );

  }



  async getStates(
    countryId:number,
  ) {


    return mysql.query<any[]>(
      `
      SELECT

        id,

        country_id AS countryId,

        name

      FROM states

      WHERE country_id = ?

      AND is_active = 1

      ORDER BY name ASC
      `,
      [
        countryId,
      ],
    );

  }



  async findIndiaId() {
    const rows = await mysql.query<any[]>(
      `
      SELECT id
      FROM countries
      WHERE upper(iso2) = 'IN' OR lower(name) = 'india'
      ORDER BY id ASC
      LIMIT 1
      `,
    );
    return Number(rows?.[0]?.id || 1);
  }

  async findOrCreateState(countryId: number, name: string) {
    const existing = await mysql.query<any[]>(
      `
      SELECT id, name
      FROM states
      WHERE country_id = ? AND lower(name) = lower(?)
      LIMIT 1
      `,
      [countryId, name],
    );
    if (existing?.[0]?.id) {
      return {id: Number(existing[0].id), name: String(existing[0].name || name)};
    }
    await mysql.query(
      `
      INSERT INTO states (country_id, name, is_active)
      VALUES (?, ?, 1)
      `,
      [countryId, name],
    );
    const created = await mysql.query<any[]>(
      `
      SELECT id, name
      FROM states
      WHERE country_id = ? AND lower(name) = lower(?)
      ORDER BY id DESC
      LIMIT 1
      `,
      [countryId, name],
    );
    return {
      id: Number(created?.[0]?.id || 0),
      name: String(created?.[0]?.name || name),
    };
  }

  async findOrCreateCity(countryId: number, stateId: number, name: string, pin: string) {
    const existing = await mysql.query<any[]>(
      `
      SELECT id, name
      FROM cities
      WHERE state_id = ? AND lower(name) = lower(?)
      LIMIT 1
      `,
      [stateId, name],
    );
    if (existing?.[0]?.id) {
      return {id: Number(existing[0].id), name: String(existing[0].name || name)};
    }
    try {
      await mysql.query(
        `
        INSERT INTO cities (country_id, state_id, name, postal_code, is_active)
        VALUES (?, ?, ?, ?, 1)
        `,
        [countryId, stateId, name, pin],
      );
    } catch {
      await mysql.query(
        `
        INSERT INTO cities (country_id, state_id, name, is_active)
        VALUES (?, ?, ?, 1)
        `,
        [countryId, stateId, name],
      );
    }
    const created = await mysql.query<any[]>(
      `
      SELECT id, name
      FROM cities
      WHERE state_id = ? AND lower(name) = lower(?)
      ORDER BY id DESC
      LIMIT 1
      `,
      [stateId, name],
    );
    return {
      id: Number(created?.[0]?.id || 0),
      name: String(created?.[0]?.name || name),
    };
  }

  async getCities(
    stateId:number,
  ) {


    return mysql.query<any[]>(
      `
      SELECT

        id,

        state_id AS stateId,

        name

      FROM cities

      WHERE state_id = ?

      AND is_active = 1

      ORDER BY name ASC
      `,
      [
        stateId,
      ],
    );

  }



  async getLanguages() {


    return mysql.query<any[]>(
      `
      SELECT

        id,

        code,

        name,

        native_name AS nativeName,

        is_active AS isActive

      FROM languages

      WHERE is_active = 1

      ORDER BY display_order ASC, name ASC
      `,
    );

  }


}


export default new MasterRepository();