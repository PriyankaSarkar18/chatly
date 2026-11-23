import bcrypt from 'bcryptjs';
import { execute, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  wallpaper: 'default',
  notifications: true,
  messageSound: true,
  readReceipts: true,
  lastSeenVisible: true,
  statusPrivacy: 'everyone',
};

const mapSettings = (row) => {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    theme: row.theme,
    wallpaper: row.wallpaper,
    notifications: Boolean(row.notifications),
    messageSound: Boolean(row.message_sound),
    readReceipts: Boolean(row.read_receipts),
    lastSeenVisible: Boolean(row.last_seen_visible),
    statusPrivacy: row.status_privacy,
  };
};

const ensureRow = async (userId) => {
  await execute('INSERT IGNORE INTO user_settings (user_id) VALUES (?)', [userId]);
};

export const getSettings = async (userId) => {
  await ensureRow(userId);
  const row = await queryOne('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
  return mapSettings(row);
};

export const updateSettings = async (userId, patch = {}) => {
  await ensureRow(userId);

  const columns = {
    theme: 'theme',
    wallpaper: 'wallpaper',
    notifications: 'notifications',
    messageSound: 'message_sound',
    readReceipts: 'read_receipts',
    lastSeenVisible: 'last_seen_visible',
    statusPrivacy: 'status_privacy',
  };

  const sets = [];
  const params = [];

  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] === undefined) continue;

    let value = patch[key];
    if (['theme', 'wallpaper', 'statusPrivacy'].includes(key)) {
      if (typeof value !== 'string' || !value.trim()) continue;
      value = value.trim();
    } else {
      value = value ? 1 : 0;
    }

    sets.push(`${column} = ?`);
    params.push(value);
  }

  if (!sets.length) return getSettings(userId);

  params.push(userId);
  await execute(`UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = ?`, params);

  return getSettings(userId);
};

export const changePassword = async (userId, { currentPassword, newPassword } = {}) => {
  if (!currentPassword || !newPassword) throw ApiError.badRequest('Both passwords are required');
  if (String(newPassword).length < 8) throw ApiError.badRequest('New password must be at least 8 characters');
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current one');
  }

  const row = await queryOne('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!row) throw ApiError.notFound('Account not found');

  const matches = await bcrypt.compare(currentPassword, row.password_hash);
  if (!matches) throw ApiError.badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

  return { changed: true };
};
