import { execute, query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { publicUser } from '../../utils/mappers.js';
import { emitToUser, getIo } from '../../sockets/io.js';

const toIntId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const mapStatus = (row) => {
  const deleted = false;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    content: deleted ? null : row.content,
    mediaUrl: row.media_url,
    backgroundColor: row.background_color,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    viewCount: Number(row.view_count ?? 0),
    viewedByMe: Boolean(Number(row.viewed ?? 0)),
  };
};

/** Statuses of everyone, grouped per user, mine first. */
export const getStatusFeed = async (userId) => {
  const rows = await query(
    `SELECT s.*, u.name AS user_name, u.username AS user_username, u.avatar_url AS user_avatar,
            (SELECT COUNT(*) FROM status_views sv WHERE sv.status_id = s.id) AS view_count,
            EXISTS(SELECT 1 FROM status_views sv WHERE sv.status_id = s.id AND sv.viewer_id = ?) AS viewed
     FROM statuses s
     JOIN users u ON u.id = s.user_id
     WHERE s.expires_at > NOW()
     ORDER BY s.created_at ASC`,
    [userId]
  );

  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.user_id)) {
      groups.set(row.user_id, {
        user: publicUser({
          id: row.user_id,
          name: row.user_name,
          username: row.user_username,
          avatar_url: row.user_avatar,
        }),
        statuses: [],
      });
    }
    groups.get(row.user_id).statuses.push(mapStatus(row));
  }

  const feed = [...groups.values()].map((group) => ({
    ...group,
    latestAt: group.statuses[group.statuses.length - 1].createdAt,
    allViewed: group.statuses.every((status) => status.viewedByMe),
  }));

  const mine = feed.filter((group) => group.user.id === userId);
  const unseen = feed.filter((group) => group.user.id !== userId && !group.allViewed).sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));
  const seen = feed.filter((group) => group.user.id !== userId && group.allViewed).sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));

  return [...mine, ...unseen, ...seen];
};

export const createStatus = async (userId, { type, content, mediaUrl, backgroundColor }) => {
  const statusType = type === 'image' ? 'image' : 'text';
  const text = content ? String(content).trim() : '';

  if (statusType === 'image' && !mediaUrl) throw ApiError.badRequest('Add an image for your status');
  if (statusType === 'text' && !text) throw ApiError.badRequest('Status text cannot be empty');
  if (text.length > 300) throw ApiError.badRequest('Status text must be 300 characters or less');

  const color = /^#[0-9a-f]{6}$/i.test(backgroundColor ?? '') ? backgroundColor : '#00a884';

  const result = await execute(
    `INSERT INTO statuses (user_id, type, content, media_url, background_color, expires_at)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
    [userId, statusType, text || null, mediaUrl ? String(mediaUrl).slice(0, 255) : null, color]
  );

  const row = await queryOne('SELECT * FROM statuses WHERE id = ?', [result.insertId]);
  const status = mapStatus({ ...row, view_count: 0, viewed: 1 });

  getIo()?.emit('status:new', { status, userId });
  return status;
};

export const viewStatus = async (userId, statusId) => {
  const id = toIntId(statusId);
  if (!id) throw ApiError.badRequest('Invalid status id');

  const status = await queryOne('SELECT * FROM statuses WHERE id = ? AND expires_at > NOW()', [id]);
  if (!status) throw ApiError.notFound('Status has expired or does not exist');

  await execute('INSERT IGNORE INTO status_views (status_id, viewer_id) VALUES (?, ?)', [id, userId]);

  if (status.user_id !== userId) {
    const viewer = await queryOne('SELECT id, name, avatar_url FROM users WHERE id = ?', [userId]);
    emitToUser(status.user_id, 'status:viewed', {
      statusId: id,
      viewer: publicUser(viewer),
    });
  }

  const count = await queryOne('SELECT COUNT(*) AS total FROM status_views WHERE status_id = ?', [id]);
  return { statusId: id, viewCount: Number(count.total) };
};

export const getStatusViewers = async (userId, statusId) => {
  const id = toIntId(statusId);
  const status = await queryOne('SELECT * FROM statuses WHERE id = ?', [id]);
  if (!status) throw ApiError.notFound('Status not found');
  if (status.user_id !== userId) throw ApiError.forbidden('Only the owner can see viewers');

  const rows = await query(
    `SELECT u.*, sv.viewed_at FROM status_views sv
     JOIN users u ON u.id = sv.viewer_id
     WHERE sv.status_id = ?
     ORDER BY sv.viewed_at DESC`,
    [id]
  );

  return rows.map((row) => ({ ...publicUser(row), viewedAt: row.viewed_at }));
};

export const deleteStatus = async (userId, statusId) => {
  const id = toIntId(statusId);
  const status = await queryOne('SELECT * FROM statuses WHERE id = ?', [id]);
  if (!status) throw ApiError.notFound('Status not found');
  if (status.user_id !== userId) throw ApiError.forbidden('You can only delete your own status');

  await execute('DELETE FROM statuses WHERE id = ?', [id]);
  getIo()?.emit('status:deleted', { statusId: id, userId });
  return { statusId: id };
};
