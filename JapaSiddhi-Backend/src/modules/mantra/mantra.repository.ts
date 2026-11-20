import mysql from '../../database/mysql';
import {
  BUILTIN_CATEGORY_CODES,
  MANTRA_CATEGORIES,
  listsMatchingScope,
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
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  startsAt?: string | null;
  deadlineAt?: string | null;
};

export type CategoryInput = {
  name: string;
  categoryType?: 'EVENT' | 'NORMAL';
  japaList?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
};

const storedJapaTarget = (value: unknown) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
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
        video_url AS videoUrl,
        audio_url AS audioUrl,
        starts_at AS startsAt,
        deadline_at AS deadlineAt,
  translations,
  is_featured AS isFeatured,
  is_active AS isActive,
  display_order AS displayOrder,
  japa_list AS japaList,
  category_code AS categoryCode,
  copied_from_id AS copiedFromId
`;

const CATEGORY_COLUMNS = `
  code,
  name,
  display_order AS displayOrder,
  IFNULL(category_type, 'NORMAL') AS categoryType,
  IFNULL(japa_list, 'BOTH') AS japaList,
  IFNULL(image_url, '') AS imageUrl,
  IFNULL(video_url, '') AS videoUrl,
  IFNULL(audio_url, '') AS audioUrl
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
    await this.ensureCampaignColumns();
    this.columnsReady = true;
  }

  private async ensureCampaignColumns() {
    const add = async (sql: string) => {
      try {
        await mysql.query(sql);
      } catch {
        // Column already exists.
      }
    };
    await add(`ALTER TABLE mantras ADD COLUMN video_url TEXT NULL`);
    await add(`ALTER TABLE mantras ADD COLUMN starts_at TEXT NULL`);
    await add(`ALTER TABLE mantras ADD COLUMN deadline_at TEXT NULL`);
    await add(
      `ALTER TABLE mantra_categories ADD COLUMN category_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL'`,
    );
    await add(`ALTER TABLE mantra_categories ADD COLUMN image_url TEXT NULL`);
    await add(`ALTER TABLE mantra_categories ADD COLUMN video_url TEXT NULL`);
    await add(`ALTER TABLE mantra_categories ADD COLUMN audio_url TEXT NULL`);
    await add(
      `ALTER TABLE mantra_categories ADD COLUMN japa_list VARCHAR(20) NOT NULL DEFAULT 'BOTH'`,
    );
    await this.migrateCategoryJapaLists();
    // Event campaign — Samuhika only; must not appear under admin "Both".
    try {
      await mysql.query(
        `
        UPDATE mantra_categories
        SET japa_list = 'SAMUHIKA'
        WHERE code = 'shiva_naama_japa_yagyam'
          AND UPPER(IFNULL(japa_list, 'BOTH')) = 'BOTH'
        `,
      );
    } catch {
      // Column/table may be missing on very old DBs.
    }
  }

  private categoryListMigrated = false;

  /** One-time: builtins → BOTH; custom categories follow their mantras. */
  private async migrateCategoryJapaLists() {
    if (this.categoryListMigrated) {
      return;
    }
    try {
      const rows = await mysql.query<any[]>(
        `SELECT code, IFNULL(japa_list, '') AS japaList FROM mantra_categories`,
      );
      for (const row of rows || []) {
        const code = String(row.code || '');
        if (!code) {
          continue;
        }
        if (BUILTIN_CATEGORY_CODES.has(code as any)) {
          await mysql.query(
            `UPDATE mantra_categories SET japa_list = 'BOTH' WHERE code = ?`,
            [code],
          );
          continue;
        }
        const existing = String(row.japaList || '').toUpperCase();
        if (
          existing === 'SAMUHIKA' ||
          existing === 'ANTHARANGA' ||
          existing === 'BOTH'
        ) {
          continue;
        }
        const usage = await mysql.query<any[]>(
          `
          SELECT DISTINCT UPPER(IFNULL(japa_list, '')) AS japaList
          FROM mantras
          WHERE category_code = ?
          `,
          [code],
        );
        const lists = new Set(
          (usage || [])
            .map((item: any) => String(item.japaList || '').toUpperCase())
            .filter(Boolean),
        );
        let next = 'SAMUHIKA';
        if (lists.has('SAMUHIKA') && lists.has('ANTHARANGA')) {
          next = 'BOTH';
        } else if (lists.has('ANTHARANGA') && !lists.has('SAMUHIKA')) {
          next = 'ANTHARANGA';
        } else if (lists.has('BOTH')) {
          next = 'BOTH';
        } else if (lists.has('SAMUHIKA')) {
          next = 'SAMUHIKA';
        }
        await mysql.query(
          `UPDATE mantra_categories SET japa_list = ? WHERE code = ?`,
          [next, code],
        );
      }
      this.categoryListMigrated = true;
    } catch {
      // Older DBs without column yet — next ensureMantraLists call retries.
    }
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
          category_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
          image_url TEXT NULL,
          video_url TEXT NULL,
          audio_url TEXT NULL,
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
          category_type TEXT NOT NULL DEFAULT 'NORMAL',
          image_url TEXT,
          video_url TEXT,
          audio_url TEXT,
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
    await mysql.query(
      `
      UPDATE mantra_categories
      SET name = 'Sarpa mantras'
      WHERE lower(replace(name, 'tha', 'ta')) LIKE 'sapta mantra%'
      `,
    );
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

  async listCategories(list?: string | null) {
    await this.ensureMantraLists();
    const scope = normalizeMantraList(list);
    try {
      const rows = await mysql.query<any[]>(
        `
        SELECT ${CATEGORY_COLUMNS}
        FROM mantra_categories
        ORDER BY display_order ASC, id ASC
        `,
      );
      const all = rows || [];
      if (!scope) {
        return all;
      }
      if (scope === 'BOTH') {
        return all.filter(
          (row: any) =>
            String(row.japaList || 'BOTH').toUpperCase() === 'BOTH',
        );
      }
      const allowed = new Set(listsMatchingScope(scope));
      return all.filter((row: any) =>
        allowed.has(
          (normalizeMantraList(row.japaList) || 'BOTH') as any,
        ),
      );
    } catch {
      const rows = await mysql.query<any[]>(
        `
        SELECT code, name, display_order AS displayOrder
        FROM mantra_categories
        ORDER BY display_order ASC, id ASC
        `,
      );
      return (rows || []).map((row: any) => ({
        ...row,
        categoryType: 'NORMAL',
        japaList: 'BOTH',
        imageUrl: '',
        videoUrl: '',
        audioUrl: '',
      }));
    }
  }

  async getCategoryByCode(code: string) {
    await this.ensureMantraLists();
    const category = normalizeMantraCategory(code);
    if (!category) {
      return null;
    }
    const rows = await this.listCategories();
    return rows.find((item: any) => item.code === category) || null;
  }

  async createCategory(input: string | CategoryInput) {
    await this.ensureMantraLists();
    const payload: CategoryInput =
      typeof input === 'string' ? {name: input} : input || {name: ''};
    const clean = String(payload.name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80);
    if (clean.length < 2) {
      return {error: 'Enter a category name.' as const};
    }
    const categoryType =
      String(payload.categoryType || 'NORMAL').toUpperCase() === 'EVENT'
        ? 'EVENT'
        : 'NORMAL';
    const japaList = normalizeMantraList(payload.japaList) || 'SAMUHIKA';
    const imageUrl = String(payload.imageUrl || '').trim() || null;
    const videoUrl = String(payload.videoUrl || '').trim() || null;
    const audioUrl = String(payload.audioUrl || '').trim() || null;
    const existing = await this.listCategories();
    if (
      existing.some(
        (item: any) =>
          String(item.name || '').toLowerCase() === clean.toLowerCase() &&
          String(item.japaList || 'BOTH').toUpperCase() === japaList,
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
    try {
      await mysql.query(
        `
        INSERT INTO mantra_categories (
          code, name, display_order, category_type, japa_list, image_url, video_url, audio_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          code,
          clean,
          displayOrder,
          categoryType,
          japaList,
          imageUrl,
          videoUrl,
          audioUrl,
        ],
      );
    } catch {
      try {
        await mysql.query(
          `
          INSERT INTO mantra_categories (
            code, name, display_order, category_type, image_url, video_url, audio_url
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [code, clean, displayOrder, categoryType, imageUrl, videoUrl, audioUrl],
        );
        await mysql.query(
          `UPDATE mantra_categories SET japa_list = ? WHERE code = ?`,
          [japaList, code],
        );
      } catch {
        await mysql.query(
          `
          INSERT INTO mantra_categories (code, name, display_order)
          VALUES (?, ?, ?)
          `,
          [code, clean, displayOrder],
        );
      }
    }
    return {
      category: {
        code,
        name: clean,
        displayOrder,
        categoryType,
        japaList,
        imageUrl: imageUrl || '',
        videoUrl: videoUrl || '',
        audioUrl: audioUrl || '',
      },
    };
  }

  async updateCategory(code: string, input: CategoryInput & {name?: string}) {
    await this.ensureMantraLists();
    const category = normalizeMantraCategory(code);
    if (!category || !(await this.categoryExists(category))) {
      return {error: 'Category not found.' as const};
    }
    const current = await this.getCategoryByCode(category);
    const clean = String(input.name ?? current?.name ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80);
    if (clean.length < 2) {
      return {error: 'Enter a category name.' as const};
    }
    const existing = await this.listCategories();
    if (
      existing.some(
        (item: any) =>
          item.code !== category &&
          String(item.name || '').toLowerCase() === clean.toLowerCase(),
      )
    ) {
      return {error: 'That category already exists.' as const};
    }
    const categoryType =
      input.categoryType !== undefined
        ? String(input.categoryType || 'NORMAL').toUpperCase() === 'EVENT'
          ? 'EVENT'
          : 'NORMAL'
        : String(current?.categoryType || 'NORMAL').toUpperCase() === 'EVENT'
          ? 'EVENT'
          : 'NORMAL';
    const imageUrl =
      input.imageUrl !== undefined
        ? String(input.imageUrl || '').trim() || null
        : String(current?.imageUrl || '').trim() || null;
    const videoUrl =
      input.videoUrl !== undefined
        ? String(input.videoUrl || '').trim() || null
        : String(current?.videoUrl || '').trim() || null;
    const audioUrl =
      input.audioUrl !== undefined
        ? String(input.audioUrl || '').trim() || null
        : String(current?.audioUrl || '').trim() || null;
    const japaList =
      input.japaList !== undefined
        ? normalizeMantraList(input.japaList) ||
          String(current?.japaList || 'SAMUHIKA').toUpperCase()
        : String(current?.japaList || 'BOTH').toUpperCase();
    try {
      await mysql.query(
        `
        UPDATE mantra_categories
        SET name = ?, category_type = ?, japa_list = ?, image_url = ?, video_url = ?, audio_url = ?
        WHERE code = ?
        `,
        [clean, categoryType, japaList, imageUrl, videoUrl, audioUrl, category],
      );
    } catch {
      try {
        await mysql.query(
          `
          UPDATE mantra_categories
          SET name = ?, category_type = ?, image_url = ?, video_url = ?, audio_url = ?
          WHERE code = ?
          `,
          [clean, categoryType, imageUrl, videoUrl, audioUrl, category],
        );
      } catch {
        await mysql.query(
          `UPDATE mantra_categories SET name = ? WHERE code = ?`,
          [clean, category],
        );
      }
    }
    return {
      category: {
        code: category,
        name: clean,
        categoryType,
        japaList,
        imageUrl: imageUrl || '',
        videoUrl: videoUrl || '',
        audioUrl: audioUrl || '',
      },
    };
  }

  async renameCategory(code: string, name: string) {
    return this.updateCategory(code, {name});
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
    const scope = normalizeMantraList(list) || 'SAMUHIKA';
    const extraId = Number(includeId) || 0;
    if (scope === 'BOTH') {
      return mysql.query<any[]>(
        `
        SELECT ${MANTRA_COLUMNS}
        FROM mantras
        WHERE (is_active = 1 AND japa_list = 'BOTH')
           OR (? > 0 AND id = ?)
        ORDER BY display_order ASC, id ASC
        `,
        [extraId, extraId],
      );
    }
    return mysql.query<any[]>(
      `
      SELECT ${MANTRA_COLUMNS}
      FROM mantras
      WHERE (is_active = 1 AND (japa_list = ? OR japa_list = 'BOTH'))
         OR (? > 0 AND id = ?)
      ORDER BY display_order ASC, id ASC
      `,
      [scope, extraId, extraId],
    );
  }

  async getAllMantras(list?: string | null) {
    await this.ensureMantraLists();
    const scope = normalizeMantraList(list) || 'SAMUHIKA';
    if (scope === 'BOTH') {
      return mysql.query<any[]>(
        `
        SELECT ${MANTRA_COLUMNS}
        FROM mantras
        WHERE japa_list = 'BOTH'
        ORDER BY display_order ASC, id ASC
        `,
      );
    }
    return mysql.query<any[]>(
      `
      SELECT ${MANTRA_COLUMNS}
      FROM mantras
      WHERE japa_list = ? OR japa_list = 'BOTH'
      ORDER BY display_order ASC, id ASC
      `,
      [scope],
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
    const target = storedJapaTarget(input.defaultJapaCount);
    const isActive = input.isActive === false ? 0 : 1;
    const isFeatured = input.isFeatured ? 1 : 0;
    const translations = normalizeTranslations(input.translations);
    const imageUrl = String(input.imageUrl || '').trim() || null;
    const videoUrl = String(input.videoUrl || '').trim() || null;
    const audioUrl = String(input.audioUrl || '').trim() || null;
    const startsAt = String(input.startsAt || '').trim() || null;
    const deadlineAt = String(input.deadlineAt || '').trim() || null;

    const orderRows = await mysql.query<any[]>(
      `SELECT IFNULL(MAX(display_order), 0) + 1 AS nextOrder FROM mantras`,
    );
    const displayOrder =
      Number(input.displayOrder) || Number(orderRows?.[0]?.nextOrder) || 1;

    try {
      await mysql.query(
        `
        INSERT INTO mantras (
          mantra_name,
          deity_name,
          sanskrit_text,
          transliteration,
          default_japa_count,
          image_url,
          video_url,
          audio_url,
          starts_at,
          deadline_at,
          is_featured,
          is_active,
          display_order,
          translations,
          japa_list,
          category_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          name,
          deity,
          sanskrit,
          transliteration,
          target,
          imageUrl,
          videoUrl,
          audioUrl,
          startsAt,
          deadlineAt,
          isFeatured,
          isActive,
          displayOrder,
          translations,
          japaList,
          categoryCode,
        ],
      );
    } catch {
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
    }

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
    const target =
      input.defaultJapaCount === undefined
        ? storedJapaTarget(existing.defaultJapaCount)
        : storedJapaTarget(input.defaultJapaCount);
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
    const imageUrl =
      input.imageUrl !== undefined
        ? String(input.imageUrl || '').trim() || null
        : existing.imageUrl || null;
    const videoUrl =
      input.videoUrl !== undefined
        ? String(input.videoUrl || '').trim() || null
        : existing.videoUrl || null;
    const audioUrl =
      input.audioUrl !== undefined
        ? String(input.audioUrl || '').trim() || null
        : existing.audioUrl || null;
    const startsAt =
      input.startsAt !== undefined
        ? String(input.startsAt || '').trim() || null
        : existing.startsAt || null;
    const deadlineAt =
      input.deadlineAt !== undefined
        ? String(input.deadlineAt || '').trim() || null
        : existing.deadlineAt || null;

    try {
      await mysql.query(
        `
        UPDATE mantras
        SET
          mantra_name = ?,
          deity_name = ?,
          sanskrit_text = ?,
          transliteration = ?,
          default_japa_count = ?,
          image_url = ?,
          video_url = ?,
          audio_url = ?,
          starts_at = ?,
          deadline_at = ?,
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
          imageUrl,
          videoUrl,
          audioUrl,
          startsAt,
          deadlineAt,
          isFeatured,
          isActive,
          displayOrder,
          translations,
          id,
        ],
      );
    } catch {
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
    }

    return this.getById(id);
  }

  async setDeadline(id: number, deadlineAt: string | null) {
    await this.ensureMantraLists();
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }
    const value = String(deadlineAt || '').trim() || null;
    try {
      await mysql.query(
        `
        UPDATE mantras
        SET deadline_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [value, id],
      );
    } catch {
      return existing;
    }
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
