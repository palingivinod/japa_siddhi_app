import mysql from '../../database/mysql';

let tableReady = false;

export const ensureAutopayTable = async () => {
  if (tableReady) return;
  const engine = mysql.getEngineName();
  try {
    if (engine === 'postgres') {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS autopay_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          full_name TEXT NOT NULL,
          mobile TEXT NOT NULL,
          amount NUMERIC(10, 2),
          status TEXT NOT NULL DEFAULT 'Pending',
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::TEXT
        )
      `);
    } else if (engine === 'sqlite') {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS autopay_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          full_name TEXT NOT NULL,
          mobile TEXT NOT NULL,
          amount REAL,
          status TEXT NOT NULL DEFAULT 'Pending',
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await mysql.query(`
        CREATE TABLE IF NOT EXISTS autopay_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          full_name VARCHAR(150) NOT NULL,
          mobile VARCHAR(30) NOT NULL,
          amount DECIMAL(10, 2) NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Pending',
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    }
    tableReady = true;
  } catch (error) {
    console.error('Could not ensure autopay_requests table:', error);
  }
};

export interface CreateAutopayInput {
  userId?: number | null;
  fullName: string;
  mobile: string;
  amount?: number | null;
  notes?: string | null;
}

export const createAutopayRequest = async (input: CreateAutopayInput) => {
  await ensureAutopayTable();
  const name = String(input.fullName || 'Devotee').trim().slice(0, 150);
  const mobile = String(input.mobile || '').replace(/[^\d+]/g, '').slice(0, 30);
  const amount = Number(input.amount) > 0 ? Number(input.amount) : null;
  const notes = input.notes ? String(input.notes).slice(0, 500) : null;
  const userId = input.userId ? Number(input.userId) : null;

  const result: any = await mysql.query(
    `INSERT INTO autopay_requests (user_id, full_name, mobile, amount, status, notes)
     VALUES (?, ?, ?, ?, 'Pending', ?)`,
    [userId, name, mobile, amount, notes],
  );

  return {
    id: result?.insertId || result?.rows?.[0]?.id || 1,
    fullName: name,
    mobile,
    amount,
    status: 'Pending',
  };
};

export const getAutopayRequests = async () => {
  await ensureAutopayTable();
  const rows = await mysql.query<any[]>(
    `SELECT id, user_id AS userId, full_name AS fullName, mobile, amount, status, notes,
            created_at AS createdAt
     FROM autopay_requests
     ORDER BY id DESC`,
  );
  return (rows || []).map(r => ({
    id: String(r.id),
    userId: r.userId ? Number(r.userId) : null,
    fullName: String(r.fullName || r.full_name || 'Devotee'),
    mobile: String(r.mobile || ''),
    amount: r.amount ? Number(r.amount) : null,
    status: String(r.status || 'Pending'),
    notes: r.notes ? String(r.notes) : '',
    createdAt: String(r.createdAt || r.created_at || new Date().toISOString()),
  }));
};

export const updateAutopayStatus = async (id: string | number, status: string) => {
  await ensureAutopayTable();
  const cleanStatus = String(status || 'Pending').trim();
  await mysql.query(
    `UPDATE autopay_requests SET status = ? WHERE id = ?`,
    [cleanStatus, Number(id)],
  );
  return {success: true, id, status: cleanStatus};
};
