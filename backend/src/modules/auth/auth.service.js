import bcrypt from 'bcryptjs';
import { execute, queryOne, withTransaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { publicUser } from '../../utils/mappers.js';
import { signToken } from '../../utils/token.js';

export const selfUser = (row) => ({
  ...publicUser(row),
  email: row.email,
  settings: undefined,
});

export const registerUser = async ({ name, username, email, password, phone }) => {
  const existing = await queryOne('SELECT id, email, username FROM users WHERE email = ? OR username = ? LIMIT 1', [
    email,
    username,
  ]);
  if (existing) {
    throw ApiError.conflict(
      existing.email === email ? 'An account with this email already exists' : 'That username is already taken'
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const userId = await withTransaction(async (connection) => {
    const [result] = await connection.query(
      `INSERT INTO users (name, username, email, phone, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [name, username, email, phone, passwordHash]
    );
    await connection.query('INSERT INTO user_settings (user_id) VALUES (?)', [result.insertId]);
    return result.insertId;
  });

  const row = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  return { token: signToken(row), user: selfUser(row) };
};

export const loginUser = async ({ identifier, password }) => {
  const row = await queryOne(
    'SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1',
    [identifier, identifier]
  );
  if (!row) throw ApiError.unauthorized('No account found with those details');

  const matches = await bcrypt.compare(password, row.password_hash);
  if (!matches) throw ApiError.unauthorized('Incorrect password, please try again');

  await execute('UPDATE users SET is_online = 1 WHERE id = ?', [row.id]);

  return { token: signToken(row), user: selfUser(row) };
};

export const getCurrentUser = async (userId) => {
  const row = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!row) throw ApiError.notFound('User not found');
  return selfUser(row);
};

export const setOffline = async (userId) => {
  await execute('UPDATE users SET is_online = 0, last_seen = NOW() WHERE id = ?', [userId]);
};
