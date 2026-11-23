import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
});

/**
 * Run a query and return rows only.
 * Uses `query` (client-side escaping) so LIMIT ? works on every MySQL build.
 */
export const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

/** Return the first row or null. */
export const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] ?? null;
};

/** Run a query that returns insertId / affectedRows. */
export const execute = async (sql, params = []) => {
  const [result] = await pool.query(sql, params);
  return result;
};

/** Run several statements inside a transaction. */
export const withTransaction = async (handler) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const testDatabaseConnection = async () => {
  const row = await queryOne('SELECT VERSION() AS version, DATABASE() AS `database`');
  return { ...row, host: env.db.host, port: env.db.port };
};

export const closePool = () => pool.end();
