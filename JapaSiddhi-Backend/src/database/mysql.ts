import sqliteEngine from './sqliteEngine';
import postgresEngine from './postgresEngine';
import mysqlPool from './pool';
import environment from '../config/environment';

type EngineName = 'postgres' | 'mysql' | 'sqlite';

class DatabaseFacade {
  private engine: EngineName | null = null;
  private ready: Promise<EngineName> | null = null;

  getEngineName(): EngineName | null {
    return this.engine;
  }

  private async resolveEngine(): Promise<EngineName> {
    if (this.engine) {
      return this.engine;
    }
    if (!this.ready) {
      this.ready = this.detectEngine();
    }
    this.engine = await this.ready;
    return this.engine;
  }

  private async detectEngine(): Promise<EngineName> {
    const requested = String(environment.DB_ENGINE || '').trim().toLowerCase();

    if (
      requested === 'postgres' ||
      requested === 'postgresql' ||
      requested === 'pg' ||
      Boolean(environment.DATABASE_URL)
    ) {
      try {
        await postgresEngine.init();
        console.log('Database engine: PostgreSQL');
        return 'postgres';
      } catch (error) {
        console.warn(
          'PostgreSQL is not available. Falling back to SQLite.',
          error,
        );
        await sqliteEngine.init();
        console.log('Database engine: SQLite');
        return 'sqlite';
      }
    }

    if (requested === 'sqlite') {
      await sqliteEngine.init();
      console.log('Database engine: SQLite');
      return 'sqlite';
    }

    try {
      await mysqlPool.query('SELECT 1');
      console.log('Database engine: MySQL');
      return 'mysql';
    } catch (error) {
      console.warn(
        'MySQL is not available. Using the local SQLite database instead.',
      );
      await sqliteEngine.init();
      console.log('Database engine: SQLite');
      return 'sqlite';
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T> {
    const engine = await this.resolveEngine();

    if (engine === 'postgres') {
      return postgresEngine.query<T>(sql, params);
    }

    if (engine === 'mysql') {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows as T;
    }

    return sqliteEngine.query<T>(sql, params);
  }

  async transaction(callback: any) {
    const engine = await this.resolveEngine();

    if (engine === 'postgres') {
      return postgresEngine.transaction(callback);
    }

    if (engine === 'sqlite') {
      return callback({
        query: (sql: string, params: any[] = []) => this.query(sql, params),
      });
    }

    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default new DatabaseFacade();
