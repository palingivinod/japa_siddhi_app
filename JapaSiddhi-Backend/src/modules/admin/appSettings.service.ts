import mysql from '../../database/mysql';

let tableReady = false;

const ensureSettingsTable = async () => {
  if (tableReady) {
    return;
  }
  const engine = mysql.getEngineName() || 'sqlite';
  if (engine === 'mysql') {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } else {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  tableReady = true;
};

class AppSettingsService {
  async getSetting(key: string, defaultValue = ''): Promise<string> {
    await ensureSettingsTable();
    const rows = await mysql.query<any[]>(
      `SELECT setting_value AS value FROM app_settings WHERE setting_key = ? LIMIT 1`,
      [key],
    );
    if (rows && rows.length > 0 && rows[0].value !== undefined && rows[0].value !== null) {
      return String(rows[0].value);
    }
    return defaultValue;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await ensureSettingsTable();
    const engine = mysql.getEngineName() || 'sqlite';
    if (engine === 'mysql') {
      await mysql.query(`
        INSERT INTO app_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP
      `, [key, value]);
    } else {
      await mysql.query(`
        INSERT INTO app_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP
      `, [key, value]);
    }
  }

  async getDailyGoal(): Promise<number> {
    const raw = await this.getSetting('daily_japa_goal', '2000');
    return Number(raw) || 2000;
  }

  async setDailyGoal(goal: number): Promise<number> {
    const val = Math.max(1, Number(goal) || 2000);
    await this.setSetting('daily_japa_goal', String(val));
    return val;
  }

  async getMeetingConfig(): Promise<{
    enabled: boolean;
    title: string;
    link: string;
    time: string;
    scheduledAt?: string | null;
    updatedAt?: string;
  }> {
    const raw = await this.getSetting('active_meeting_config', '');
    if (!raw) {
      return {
        enabled: true,
        title: 'Lalitha Sahasram Class',
        link: 'https://meet.google.com/ryz-hxyg-byc',
        time: '',
        scheduledAt: null,
      };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        enabled: Boolean(parsed.enabled),
        title: String(parsed.title || 'Lalitha Sahasram Class'),
        link: String(parsed.link || ''),
        time: String(parsed.time || ''),
        scheduledAt: parsed.scheduledAt ? String(parsed.scheduledAt) : null,
        updatedAt: parsed.updatedAt,
      };
    } catch {
      return {
        enabled: false,
        title: 'Lalitha Sahasram Class',
        link: '',
        time: '',
        scheduledAt: null,
      };
    }
  }

  async setMeetingConfig(config: {
    enabled?: boolean;
    title?: string;
    link?: string;
    time?: string;
    scheduledAt?: string | null;
  }): Promise<{
    enabled: boolean;
    title: string;
    link: string;
    time: string;
    scheduledAt?: string | null;
    updatedAt: string;
  }> {
    const current = await this.getMeetingConfig();
    const updated = {
      enabled: config.enabled !== undefined ? Boolean(config.enabled) : current.enabled,
      title: config.title !== undefined ? String(config.title).trim() : current.title,
      link: config.link !== undefined ? String(config.link).trim() : current.link,
      time: config.time !== undefined ? String(config.time).trim() : current.time,
      scheduledAt:
        config.scheduledAt !== undefined
          ? config.scheduledAt
            ? String(config.scheduledAt)
            : null
          : current.scheduledAt ?? null,
      updatedAt: new Date().toISOString(),
    };
    await this.setSetting('active_meeting_config', JSON.stringify(updated));
    return updated;
  }

  async removeMeetingConfig(): Promise<void> {
    await this.setSetting(
      'active_meeting_config',
      JSON.stringify({
        enabled: false,
        title: '',
        link: '',
        time: '',
        scheduledAt: null,
        updatedAt: new Date().toISOString(),
      }),
    );
  }
}

export default new AppSettingsService();
