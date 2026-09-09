import mysql from '../../database/mysql';

export type MantraInput = {
  mantraName: string;
  deityName?: string;
  sanskritText?: string;
  transliteration?: string;
  defaultJapaCount?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
};

class MantraRepository {
  async getActiveMantras() {
    return mysql.query<any[]>(
      `
      SELECT
        id,
        mantra_name AS mantraName,
        deity_name AS deityName,
        sanskrit_text AS sanskritText,
        transliteration,
        default_japa_count AS defaultJapaCount,
        image_url AS imageUrl,
        is_featured AS isFeatured
      FROM mantras
      WHERE is_active = 1
      ORDER BY display_order ASC, id ASC
      `,
    );
  }

  async getAllMantras() {
    return mysql.query<any[]>(
      `
      SELECT
        id,
        mantra_name AS mantraName,
        deity_name AS deityName,
        sanskrit_text AS sanskritText,
        transliteration,
        default_japa_count AS defaultJapaCount,
        image_url AS imageUrl,
        is_featured AS isFeatured,
        is_active AS isActive,
        display_order AS displayOrder
      FROM mantras
      ORDER BY display_order ASC, id ASC
      `,
    );
  }

  async getById(id: number) {
    const rows = await mysql.query<any[]>(
      `
      SELECT
        id,
        mantra_name AS mantraName,
        deity_name AS deityName,
        sanskrit_text AS sanskritText,
        transliteration,
        default_japa_count AS defaultJapaCount,
        image_url AS imageUrl,
        is_featured AS isFeatured,
        is_active AS isActive,
        display_order AS displayOrder
      FROM mantras
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    return rows?.[0] || null;
  }

  async create(input: MantraInput) {
    const name = String(input.mantraName || '').trim();
    const deity = String(input.deityName || 'Community').trim() || 'Community';
    const sanskrit = String(input.sanskritText || name).trim() || name;
    const transliteration =
      String(input.transliteration || name).trim() || name;
    const target = Math.max(1, Number(input.defaultJapaCount) || 108);
    const isActive = input.isActive === false ? 0 : 1;
    const isFeatured = input.isFeatured ? 1 : 0;

    const orderRows = await mysql.query<any[]>(
      `SELECT IFNULL(MAX(display_order), 0) + 1 AS nextOrder FROM mantras`,
    );
    const displayOrder =
      Number(input.displayOrder) || Number(orderRows?.[0]?.nextOrder) || 1;

    await mysql.query(
      `
      INSERT INTO mantras (
        mantra_name,
        deity_name,
        sanskrit_text,
        transliteration,
        default_japa_count,
        is_featured,
        is_active,
        display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        deity,
        sanskrit,
        transliteration,
        target,
        isFeatured,
        isActive,
        displayOrder,
      ],
    );

    const created = await mysql.query<any[]>(
      `SELECT id FROM mantras ORDER BY id DESC LIMIT 1`,
    );
    return this.getById(Number(created?.[0]?.id));
  }

  async update(id: number, input: MantraInput) {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const name =
      String(input.mantraName || existing.mantraName || '').trim() ||
      existing.mantraName;
    const deity =
      String(input.deityName ?? existing.deityName ?? 'Community').trim() ||
      'Community';
    const sanskrit =
      String(input.sanskritText ?? existing.sanskritText ?? name).trim() ||
      name;
    const transliteration =
      String(input.transliteration ?? existing.transliteration ?? name).trim() ||
      name;
    const target = Math.max(
      1,
      Number(
        input.defaultJapaCount ?? existing.defaultJapaCount ?? 108,
      ) || 108,
    );
    const isActive =
      input.isActive === undefined
        ? Number(existing.isActive) ? 1 : 0
        : input.isActive
          ? 1
          : 0;
    const isFeatured =
      input.isFeatured === undefined
        ? Number(existing.isFeatured) ? 1 : 0
        : input.isFeatured
          ? 1
          : 0;
    const displayOrder = Number(
      input.displayOrder ?? existing.displayOrder ?? 1,
    );

    await mysql.query(
      `
      UPDATE mantras
      SET
        mantra_name = ?,
        deity_name = ?,
        sanskrit_text = ?,
        transliteration = ?,
        default_japa_count = ?,
        is_featured = ?,
        is_active = ?,
        display_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        name,
        deity,
        sanskrit,
        transliteration,
        target,
        isFeatured,
        isActive,
        displayOrder,
        id,
      ],
    );

    return this.getById(id);
  }

  async softDelete(id: number) {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }
    // Permanent remove so it disappears for users and admin.
    await mysql.query(`DELETE FROM mantras WHERE id = ?`, [id]);
    return existing;
  }

  async setActive(id: number, active: boolean) {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }
    await mysql.query(
      `
      UPDATE mantras
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [active ? 1 : 0, id],
    );
    return this.getById(id);
  }
}

export default new MantraRepository();
