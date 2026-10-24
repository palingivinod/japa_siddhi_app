import mysql from '../../database/mysql';
import {
  MANTRA_CATEGORIES,
  normalizeMantraCategory,
  normalizeMantraList,
} from './mantraCategories';

export type MantraInput = {
  mantraName: string;
  deityName?: string;
  sanskritText?: string;
  transliteration?: string;
  defaultJapaCount?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  translations?: string | Record<string, any>;
  japaList?: string;
  categoryCode?: string | null;
};

const normalizeTranslations = (raw?: string | Record<string, any>) => {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'object') {
    return JSON.stringify(raw);
  }
  return String(raw).trim() || null;
};

const MANTRA_COLUMNS = `
  id,
  mantra_name AS mantraName,
  deity_name AS deityName,
  sanskrit_text AS sanskritText,
  transliteration,
  default_japa_count AS defaultJapaCount,
  image_url AS imageUrl,
  translations,
  is_featured AS isFeatured,
  is_active AS isActive,
  display_order AS displayOrder,
  japa_list AS japaList,
  category_code AS categoryCode,
  copied_from_id AS copiedFromId
`;

class MantraRepository {
  private columnsReady = false;

  async ensureMantraLists() {
    if (this.columnsReady) {
      return;
    }
    const add = async (sql: string) => {
      try {
        await mysql.query(sql);
      } catch {
        // The column or index is already there.
      }
    };
    await add(
      `ALTER TABLE mantras ADD COLUMN japa_list VARCHAR(20) NOT NULL DEFAULT 'SAMUHIKA'`,
    );
    await add(`ALTER TABLE mantras ADD COLUMN category_code VARCHAR(40) NULL`);
    await add(`ALTER TABLE mantras ADD COLUMN copied_from_id BIGINT NULL`);
    await add(
      `CREATE UNIQUE INDEX idx_mantra_list_copy ON mantras (copied_from_id, japa_list)`,
    );
    await this.copyLegacyMantras();
    await mysql.query(
      `SELECT japa_list, category_code, copied_from_id FROM mantras LIMIT 1`,
    );
    await this.ensureCategoryTable();
    this.columnsReady = true;
  }

  private async ensureCategoryTable() {
    const engine = mysql.getEngineName() || 'sqlite';
    if (engine === 'mysql') {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS mantra_categories (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          code VARCHAR(40) NOT NULL,
          name VARCHAR(100) NOT NULL,
          display_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_mantra_category_code (code)
        )
      `);
    } else {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS mantra_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS mantra_category_seed (
        id INTEGER PRIMARY KEY,
        seeded INTEGER NOT NULL
      )
    `);
    const seeded = await mysql.query<any[]>(
      `SELECT seeded FROM mantra_category_seed WHERE id = 1 LIMIT 1`,
    );
    if (seeded?.length) {
      return;
    }
    const counted = await mysql.query<any[]>(
      `SELECT COUNT(*) AS total FROM mantra_categories`,
    );
    if (Number(counted?.[0]?.total) === 0) {
      for (const category of MANTRA_CATEGORIES) {
        await mysql.query(
          `
          INSERT INTO mantra_categories (code, name, display_order)
          VALUES (?, ?, ?)
          `,
          [
            category.code,
            category.label,
            MANTRA_CATEGORIES.findIndex(item => item.code === category.code) + 1,
          ],
        );
      }
    }
    await mysql.query(
      `INSERT INTO mantra_category_seed (id, seeded) VALUES (1, 1)`,
    );
  }

  async listCategories() {
    await this.ensureMantraLists();
    const rows = await mysql.query<any[]>(
      `
      SELECT code, name, display_order AS displayOrder
      FROM mantra_categories
      ORDER BY display_order ASC, id ASC
      `,
    );
    return rows || [];
  }

  async createCategory(name: string) {
    await this.ensureMantraLists();
    const clean = String(name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80);
    if (clean.length < 2) {
      return {error: 'Enter a category name.' as const};
    }
    const existing = await this.listCategories();
    if (
      existing.some(
        (item: any) => String(item.name || '').toLowerCase() === clean.toLowerCase(),
      )
    ) {
      return {error: 'That category already exists.' as const};
    }
    const slug = clean
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
    let code = slug || `cat_${Date.now().toString(36)}`;
    let extra = 2;
    while (existing.some((item: any) => item.code === code)) {
      code = `${(slug || 'cat').slice(0, 20)}_${extra}`;
      extra += 1;
    }
    const displayOrder =
      existing.reduce(
        (max: number, item: any) => Math.max(max, Number(item.displayOrder) || 0),
        0,
      ) + 1;
    await mysql.query(
      `
      INSERT INTO mantra_categories (code, name, display_order)
      VALUES (?, ?, ?)
      `,
      [code, clean, displayOrder],
    );
    return {category: {code, name: clean, displayOrder}};
  }

  async deleteCategory(code: string) {
    await this.ensureMantraLists();
    const category = normalizeMantraCategory(code);
    if (!category || !(await this.categoryExists(category))) {
      return null;
    }
    await mysql.query(
      `UPDATE mantras SET category_code = NULL WHERE category_code = ?`,
      [category],
    );
    await mysql.query(`DELETE FROM mantra_categories WHERE code = ?`, [category]);
    return {code: category};
  }

  private async categoryExists(code: string) {
    const rows = await mysql.query<any[]>(
      `SELECT code FROM mantra_categories WHERE code = ? LIMIT 1`,
      [code],
    );
    return Boolean(rows?.length);
  }

  /**
   * Mantras that already exist keep their id, so japa counts stay on them.
   * Each one is also placed in Antharanga as a separate row the admin can
   * categorize on its own. New mantras are not copied.
   */
  private async copyLegacyMantras() {
    const shared = `
      FROM mantras m
      WHERE UPPER(IFNULL(m.japa_list, 'SAMUHIKA')) = 'SAMUHIKA'
        AND m.copied_from_id IS NULL
        AND m.category_code IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM mantras c
          WHERE c.copied_from_id = m.id
            AND UPPER(IFNULL(c.japa_list, '')) = 'ANTHARANGA'
        )
    `;
    try {
      await mysql.query(
        `
        INSERT INTO mantras (
          mantra_name, deity_name, sanskrit_text, transliteration,
          default_japa_count, image_url, audio_url, is_featured, is_active,
          display_order, translations, japa_list, category_code, copied_from_id
        )
        SELECT
          m.mantra_name, m.deity_name, m.sanskrit_text, m.transliteration,
          m.default_japa_count, m.image_url, m.audio_url, m.is_featured, m.is_active,
          m.display_order, m.translations, 'ANTHARANGA', NULL, m.id
        ${shared}
        `,
      );
    } catch {
      await mysql.query(
        `
        INSERT INTO mantras (
          mantra_name, deity_name, sanskrit_text, transliteration,
          default_japa_count, is_featured, is_active, display_order,
          japa_list, category_code, copied_from_id
        )
        SELECT
          m.mantra_name, m.deity_name, m.sanskrit_text, m.transliteration,
          m.default_japa_count, m.is_featured, m.is_active, m.display_order,
          'ANTHARANGA', NULL, m.id
        ${shared}
        `,
      );
    }
  }

  async getActiveMantras(list?: string | null, includeId?: number) {
    await this.ensureMantraLists();
    const japaList = normalizeMantraList(list) || 'SAMUHIKA';
    const extraId = Number(includeId) || 0;
    return mysql.query<any[]>(
      `
      SELECT ${MANTRA_COLUMNS}
      FROM mantras
      WHERE (is_active = 1 AND japa_list = ?)
         OR (? > 0 AND id = ?)
      ORDER BY display_order ASC, id ASC
      `,
      [japaList, extraId, extraId],
    );
  }

  async getAllMantras(list?: string | null) {
    await this.ensureMantraLists();
    const japaList = normalizeMantraList(list) || 'SAMUHIKA';
    return mysql.query<any[]>(
      `
      SELECT ${MANTRA_COLUMNS}
      FROM mantras
      WHERE japa_list = ?
      ORDER BY display_order ASC, id ASC
      `,
      [japaList],
    );
  }

  async getById(id: number) {
    await this.ensureMantraLists();
    const rows = await mysql.query<any[]>(
      `
      SELECT ${MANTRA_COLUMNS}
      FROM mantras
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );
    return rows?.[0] || null;
  }

  async create(input: MantraInput) {
    await this.ensureMantraLists();
    const name = String(input.mantraName || '').trim();
    const japaList = normalizeMantraList(input.japaList) || 'SAMUHIKA';
    const categoryCode = normalizeMantraCategory(input.categoryCode);
    if (!categoryCode || !(await this.categoryExists(categoryCode))) {
      throw new Error('Choose a mantra category.');
    }
    const deity = String(input.deityName || 'Community').trim() || 'Community';
    const sanskrit = String(input.sanskritText || name).trim() || name;
    const transliteration =
      String(input.transliteration || name).trim() || name;
    const target = Math.max(1, Number(input.defaultJapaCount) || 108);
    const isActive = input.isActive === false ? 0 : 1;
    const isFeatured = input.isFeatured ? 1 : 0;
    const translations = normalizeTranslations(input.translations);

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
        display_order,
        translations,
        japa_list,
        category_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        translations,
        japaList,
        categoryCode,
      ],
    );

    const created = await mysql.query<any[]>(
      `SELECT id FROM mantras ORDER BY id DESC LIMIT 1`,
    );
    return this.getById(Number(created?.[0]?.id));
  }

  async setCategory(id: number, categoryCode: string) {
    await this.ensureMantraLists();
    const category = normalizeMantraCategory(categoryCode);
    const existing = await this.getById(id);
    if (!existing || !category || !(await this.categoryExists(category))) {
      return null;
    }
    await mysql.query(
      `
      UPDATE mantras
      SET category_code = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [category, id],
    );
    return this.getById(id);
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
    const translations =
      input.translations !== undefined
        ? normalizeTranslations(input.translations)
        : existing.translations;

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
        translations = ?,
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
        translations,
        id,
      ],
    );

    return this.getById(id);
  }

  async softDelete(id: number) {
    await this.ensureMantraLists();
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }
    // Drop the link from saved japa rows first. Those counts stay, but the
    // mantra itself is removed, so a foreign key cannot keep the row.
    const detach = async (sql: string) => {
      try {
        await mysql.query(sql, [id]);
      } catch {
        // That table is not in this database.
      }
    };
    await detach(`UPDATE japa_goals SET mantra_id = NULL WHERE mantra_id = ?`);
    await detach(`UPDATE japa_sessions SET mantra_id = NULL WHERE mantra_id = ?`);
    await detach(
      `UPDATE japa_references SET mantra_id = NULL WHERE mantra_id = ?`,
    );
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
