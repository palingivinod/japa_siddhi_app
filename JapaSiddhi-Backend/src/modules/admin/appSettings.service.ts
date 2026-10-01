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
}

export default new AppSettingsService();
