import { execute, query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { publicUser } from '../../utils/mappers.js';

export const getProfile = async (userId, viewerId) => {
  const row = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!row) throw ApiError.notFound('User not found');

  const direct = await queryOne(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ?
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = ?
     WHERE c.type = 'direct'
     LIMIT 1`,
    [viewerId, userId]
  );

  return { ...publicUser(row), conversationId: direct?.id ?? null };
};

export const updateProfile = async (userId, { name, about, phone }) => {
  const current = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!current) throw ApiError.notFound('User not found');

  await execute('UPDATE users SET name = ?, about = ?, phone = ? WHERE id = ?', [
    name ?? current.name,
    about ?? current.about,
    phone ?? current.phone,
    userId,
  ]);

  const row = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  return publicUser(row);
};

export const updateAvatar = async (userId, avatarUrl) => {
  await execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
  const row = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  return publicUser(row);
};

export const searchUsers = async (viewerId, search = '', limit = 30) => {
  const term = `%${String(search).trim()}%`;
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);

  const rows = await query(
    `SELECT * FROM users
     WHERE id <> ?
       AND (name LIKE ? OR username LIKE ? OR email LIKE ? OR phone LIKE ?)
     ORDER BY is_online DESC, name ASC
     LIMIT ${safeLimit}`,
    [viewerId, term, term, term, term]
  );

  return rows.map(publicUser);
};
